/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  defer as observableDefer,
  EMPTY,
  from as observableFrom,
  merge as observableMerge,
  Observable,
  of as observableOf,
  timer as observableTimer,
} from "rxjs";
import {
  mapTo,
  mergeMap,
  mergeMapTo,
  share,
  take,
} from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import Manifest from "../../manifest";
import throttle from "../../utils/rx-throttle";
import {
  IManifestFetcherParsedResult,
  IManifestFetcherParserOptions,
  ManifestFetcher,
} from "../fetchers";
import { IWarningEvent } from "./types";

const { FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY,
        MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE,
        MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE } = config;

/** Arguments to give to the `manifestUpdateScheduler` */
export interface IManifestUpdateSchedulerArguments {
  /** Interface allowing to refresh the Manifest */
  manifestFetcher : ManifestFetcher;
  /** Information about the initial load of the manifest */
  initialManifest : { manifest : Manifest;
                      sendingTime? : number;
                      receivedTime? : number;
                      parsingTime? : number; };
  /** URL at which a shorter version of the Manifest can be found. */
  manifestUpdateUrl : string | undefined;
  /** Minimum interval to keep between Manifest updates */
  minimumManifestUpdateInterval : number;
  /** Allows the rest of the code to ask for a Manifest refresh */
  scheduleRefresh$ : IManifestRefreshScheduler;
}

/** Function defined to refresh the Manifest */
export type IManifestFetcher =
    (manifestURL : string | undefined, options : IManifestFetcherParserOptions) =>
      Observable<IManifestFetcherParsedResult | IWarningEvent>;

/** Events sent by the `IManifestRefreshScheduler` Observable */
export interface IManifestRefreshSchedulerEvent {
  /**
   * if `true`, the Manifest should be fully updated.
   * if `false`, a shorter version with just the added information can be loaded
   * instead.
   */
  completeRefresh : boolean;
  /**
   * Optional function that returns the wanted refresh delay, which is the minimum
   * time you want to wait before updating the Manifest
   */
  getRefreshDelay? : () => number;
  /**
   * Whether the parsing can be done in the more efficient "unsafeMode".
   * This mode is extremely fast but can lead to de-synchronisation with the
   * server.
   */
  canUseUnsafeMode : boolean;
}

/** Observable to send events related to refresh requests coming from the Player. */
export type IManifestRefreshScheduler = Observable<IManifestRefreshSchedulerEvent>;

/**
 * Refresh the Manifest at the right time.
 * @param {Object} manifestUpdateSchedulerArguments
 * @returns {Observable}
 */
export default function manifestUpdateScheduler({
  initialManifest,
  manifestFetcher,
  manifestUpdateUrl,
  minimumManifestUpdateInterval,
  scheduleRefresh$,
} : IManifestUpdateSchedulerArguments) : Observable<IWarningEvent> {
  /**
   * Fetch and parse the manifest from the URL given.
   * Throttled to avoid doing multiple simultaneous requests.
   */
  const fetchManifest = throttle(
    (manifestURL : string | undefined, options : IManifestFetcherParserOptions)
    : Observable<IWarningEvent | IManifestFetcherParsedResult> =>
      manifestFetcher.fetch(manifestURL).pipe(
        mergeMap((response) => response.type === "warning" ?
          observableOf(response) : // bubble-up warnings
          response.parse(options)),
        share()));

  // The Manifest always keeps the same Manifest
  const { manifest } = initialManifest;

  /** Number of consecutive times the parsing has been done in `unsafeMode`. */
  let consecutiveUnsafeMode = 0;
  function handleManifestRefresh$(
    manifestInfos: { manifest: Manifest;
                     sendingTime?: number;
                     receivedTime? : number;
                     parsingTime? : number;
                     updatingTime? : number; }): Observable<IWarningEvent> {
    const { sendingTime,
            parsingTime,
            updatingTime } = manifestInfos;

    /**
     * Total time taken to fully update the last Manifest.
     * Note: this time also includes possible requests done by the parsers.
     */
    const totalUpdateTime = parsingTime !== undefined ?
      parsingTime + (updatingTime ?? 0) :
      undefined;

    // Only perform parsing in `unsafeMode` when the last full parsing took a
    // lot of time and do not go higher than the maximum consecutive time.
    const unsafeModeEnabled = consecutiveUnsafeMode > 0 ?
      consecutiveUnsafeMode < MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE :
      totalUpdateTime !== undefined ?
        (totalUpdateTime >= MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE) :
        false;

    const internalRefresh$ = scheduleRefresh$
      .pipe(mergeMap(({ completeRefresh, getRefreshDelay, canUseUnsafeMode }) => {
        const unsafeMode = canUseUnsafeMode && unsafeModeEnabled;
        const delay = getRefreshDelay === undefined ? 0 :
                      getRefreshDelay();
        return startManualRefreshTimer(delay,
                                       minimumManifestUpdateInterval,
                                       sendingTime)
          .pipe(mapTo({ completeRefresh, unsafeMode }));
      }));

    const timeSinceRequest = sendingTime === undefined ? 0 :
                                                         performance.now() - sendingTime;
    const minInterval = Math.max(minimumManifestUpdateInterval - timeSinceRequest, 0);

    let autoRefresh$;
    if (manifest.lifetime === undefined || manifest.lifetime < 0) {
      autoRefresh$ = EMPTY;
    } else {
      let autoRefreshInterval = manifest.lifetime * 1000 - timeSinceRequest;
      if (totalUpdateTime !== undefined) {
        if (manifest.lifetime < 3 && totalUpdateTime >= 100) {
          const defaultDelay = (3 - manifest.lifetime) * 1000 + autoRefreshInterval;
          const newInterval =
            Math.max(defaultDelay,
                     Math.max(autoRefreshInterval, 0) + totalUpdateTime);
          log.info("MUS: Manifest update rythm is too frequent. Postponing next request.",
                   autoRefreshInterval,
                   newInterval);
          autoRefreshInterval = newInterval;
        } else if (totalUpdateTime >= (manifest.lifetime * 1000) / 10) {
          const newInterval = Math.max(autoRefreshInterval, 0) + totalUpdateTime;
          log.info("MUS: Manifest took too long to parse. Postponing next request",
                   autoRefreshInterval,
                   newInterval);
          autoRefreshInterval = newInterval;
        }
      }
      autoRefresh$ = observableTimer(Math.max(autoRefreshInterval, minInterval))
        .pipe(mapTo({ completeRefresh: false, unsafeMode: unsafeModeEnabled }));
    }

    const expired$ = manifest.expired === null ?
      EMPTY :
      observableTimer(minInterval)
        .pipe(mergeMapTo(observableFrom(manifest.expired)),
              mapTo({ completeRefresh: true, unsafeMode: unsafeModeEnabled }));

    // Emit when the manifest should be refreshed. Either when:
    //   - A Stream asks for it to be refreshed
    //   - its lifetime expired.
    return observableMerge(autoRefresh$, internalRefresh$, expired$).pipe(
      take(1),
      mergeMap(({ completeRefresh,
                  unsafeMode }) => refreshManifest({ completeRefresh,
                                                     unsafeMode })),
      mergeMap(evt => {
        if (evt.type === "warning") {
          return observableOf(evt);
        }
        return handleManifestRefresh$(evt);
      }));
  }

  return observableDefer(() => handleManifestRefresh$(initialManifest));

  /**
   * Refresh the Manifest.
   * Perform a full update if a partial update failed.
   * @param {boolean} completeRefresh
   * @returns {Observable}
   */
  function refreshManifest(
    { completeRefresh,
      unsafeMode } : { completeRefresh : boolean;
                       unsafeMode : boolean; }
  ) : Observable<IManifestFetcherParsedResult | IWarningEvent> {
    const fullRefresh = completeRefresh || manifestUpdateUrl === undefined;
    const refreshURL = fullRefresh ? manifest.getUrl() :
                                     manifestUpdateUrl;
    const externalClockOffset = manifest.clockOffset;

    if (unsafeMode) {
      consecutiveUnsafeMode += 1;
      log.info("Init: Refreshing the Manifest in \"unsafeMode\" for the " +
               String(consecutiveUnsafeMode) + " consecutive time.");
    } else if (consecutiveUnsafeMode > 0) {
      log.info("Init: Not parsing the Manifest in \"unsafeMode\" anymore after " +
               String(consecutiveUnsafeMode) + " consecutive times.");
      consecutiveUnsafeMode = 0;
    }
    return fetchManifest(refreshURL, { externalClockOffset,
                                       previousManifest: manifest,
                                       unsafeMode })
      .pipe(mergeMap((value) => {
        if (value.type === "warning") {
          return observableOf(value);
        }
        const { manifest: newManifest,
                sendingTime: newSendingTime,
                receivedTime,
                parsingTime } = value;
        const updateTimeStart = performance.now();

        if (fullRefresh) {
          manifest.replace(newManifest);
        } else {
          try {
            manifest.update(newManifest);
          } catch (e) {
            const message = e instanceof Error ? e.message :
                                                 "unknown error";
            log.warn(`MUS: Attempt to update Manifest failed: ${message}`,
                     "Re-downloading the Manifest fully");
            return startManualRefreshTimer(FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY,
                                           minimumManifestUpdateInterval,
                                           newSendingTime)
              .pipe(mergeMap(() =>
                refreshManifest({ completeRefresh: true, unsafeMode: false })));
          }
        }
        return observableOf({ type: "parsed" as const,
                              manifest,
                              sendingTime: newSendingTime,
                              receivedTime,
                              parsingTime,
                              updatingTime: performance.now() - updateTimeStart });
      }));
  }
}

/**
 * Launch a timer Observable which will emit when it is time to refresh the
 * Manifest.
 * The timer's delay is calculated from:
 *   - a target delay (`wantedDelay`), which is the minimum time we want to wait
 *     in the best scenario
 *   - the minimum set possible interval between manifest updates
 *     (`minimumManifestUpdateInterval`)
 *   - the time at which was done the last Manifest refresh
 *     (`lastManifestRequestTime`)
 * @param {number} wantedDelay
 * @param {number} minimumManifestUpdateInterval
 * @param {number|undefined} lastManifestRequestTime
 * @returns {Observable}
 */
function startManualRefreshTimer(
  wantedDelay : number,
  minimumManifestUpdateInterval : number,
  lastManifestRequestTime : number | undefined
) : Observable<unknown> {
  return observableDefer(() => {
    // The value allows to set a delay relatively to the last Manifest refresh
    // (to avoid asking for it too often).
    const timeSinceLastRefresh = lastManifestRequestTime === undefined ?
                                   0 :
                                   performance.now() - lastManifestRequestTime;
    const _minInterval = Math.max(minimumManifestUpdateInterval - timeSinceLastRefresh,
                                  0);
    return observableTimer(Math.max(wantedDelay - timeSinceLastRefresh,
                                    _minInterval));
  });
}
