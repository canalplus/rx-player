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
  mapTo,
  merge as observableMerge,
  mergeMap,
  mergeMapTo,
  Observable,
  of as observableOf,
  share,
  take,
  timer as observableTimer,
} from "rxjs";
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
   * Optional wanted refresh delay, which is the minimum time you want to wait
   * before updating the Manifest
   */
  delay? : number;
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

  // The Manifest always keeps the same reference
  const { manifest } = initialManifest;

  /** Number of consecutive times the parsing has been done in `unsafeMode`. */
  let consecutiveUnsafeMode = 0;

  return observableDefer(() => handleManifestRefresh$(initialManifest));

  /**
   * Performs Manifest refresh (recursively) when it judges it is time to do so.
   * @param {Object} manifestRequestInfos - Various information linked to the
   * Manifest loading and parsing operations.
   * @returns {Observable} - Observable which will automatically refresh the
   * Manifest on subscription. Can also emit warnings when minor errors are
   * encountered.
   */
  function handleManifestRefresh$(
    { sendingTime, parsingTime, updatingTime } : { sendingTime?: number;
                                                   parsingTime? : number;
                                                   updatingTime? : number; }
  ) : Observable<IWarningEvent> {
    /**
     * Total time taken to fully update the last Manifest, in milliseconds.
     * Note: this time also includes possible requests done by the parsers.
     */
    const totalUpdateTime = parsingTime !== undefined ?
      parsingTime + (updatingTime ?? 0) :
      undefined;

    /**
     * "unsafeMode" is a mode where we unlock advanced Manifest parsing
     * optimizations with the added risk to lose some information.
     * `unsafeModeEnabled` is set to `true` when the `unsafeMode` is enabled.
     *
     * Only perform parsing in `unsafeMode` when the last full parsing took a
     * lot of time and do not go higher than the maximum consecutive time.
     */
    const unsafeModeEnabled = consecutiveUnsafeMode > 0 ?
      consecutiveUnsafeMode < MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE :
      totalUpdateTime !== undefined ?
        (totalUpdateTime >= MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE) :
        false;

    /** Time elapsed since the beginning of the Manifest request, in milliseconds. */
    const timeSinceRequest = sendingTime === undefined ? 0 :
                                                         performance.now() - sendingTime;

    /** Minimum update delay we should not go below, in milliseconds. */
    const minInterval = Math.max(minimumManifestUpdateInterval - timeSinceRequest, 0);

    /** Emit when the RxPlayer determined that a refresh should be done. */
    const internalRefresh$ = scheduleRefresh$
      .pipe(mergeMap(({ completeRefresh, delay, canUseUnsafeMode }) => {
        const unsafeMode = canUseUnsafeMode && unsafeModeEnabled;
        return startManualRefreshTimer(delay ?? 0,
                                       minimumManifestUpdateInterval,
                                       sendingTime)
          .pipe(mapTo({ completeRefresh, unsafeMode }));
      }));

    /** Emit when the Manifest tells us that it has "expired". */
    const expired$ = manifest.expired === null ?
      EMPTY :
      observableTimer(minInterval)
        .pipe(mergeMapTo(observableFrom(manifest.expired)),
              mapTo({ completeRefresh: true, unsafeMode: unsafeModeEnabled }));

    /** Emit when the Manifest should normally be refreshed. */
    const autoRefresh$ = createAutoRefreshObservable();

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

    /**
     * Create an Observable that will emit when the Manifest needs to be
     * refreshed according to the Manifest's internal properties (parsing
     * time is also taken into account in this operation to avoid refreshing too
     * often).
     * @returns {Observable}
     */
    function createAutoRefreshObservable() : Observable<{
      completeRefresh: boolean;
      unsafeMode: boolean;
    }> {
      if (manifest.lifetime === undefined || manifest.lifetime < 0) {
        return EMPTY;
      }

      /** Regular refresh delay as asked by the Manifest. */
      const regularRefreshDelay = manifest.lifetime * 1000 - timeSinceRequest;

      /** Actually choosen delay to refresh the Manifest. */
      let actualRefreshInterval : number;

      if (totalUpdateTime === undefined) {
        actualRefreshInterval = regularRefreshDelay;
      } else if (manifest.lifetime < 3 && totalUpdateTime >= 100) {
        // If Manifest update is very frequent and we take time to update it,
        // postpone it.
        actualRefreshInterval = Math.min(
          Math.max(
            // Take 3 seconds as a default safe value for a base interval.
            3000 - timeSinceRequest,
            // Add update time to the original interval.
            Math.max(regularRefreshDelay, 0) + totalUpdateTime
          ),

          // Limit the postponment's higher bound to a very high value relative
          // to `regularRefreshDelay`.
          // This avoid perpetually postponing a Manifest update when
          // performance seems to have been abysmal one time.
          regularRefreshDelay * 6
        );
        log.info("MUS: Manifest update rythm is too frequent. Postponing next request.",
                 regularRefreshDelay,
                 actualRefreshInterval);
      } else if (totalUpdateTime >= (manifest.lifetime * 1000) / 10) {
        // If Manifest updating time is very long relative to its lifetime,
        // postpone it:
        actualRefreshInterval = Math.min(
          // Just add the update time to the original waiting time
          Math.max(regularRefreshDelay, 0) + totalUpdateTime,

          // Limit the postponment's higher bound to a very high value relative
          // to `regularRefreshDelay`.
          // This avoid perpetually postponing a Manifest update when
          // performance seems to have been abysmal one time.
          regularRefreshDelay * 6);
        log.info("MUS: Manifest took too long to parse. Postponing next request",
                 actualRefreshInterval,
                 actualRefreshInterval);
      } else {
        actualRefreshInterval = regularRefreshDelay;
      }
      return observableTimer(Math.max(actualRefreshInterval, minInterval))
        .pipe(mapTo({ completeRefresh: false, unsafeMode: unsafeModeEnabled }));
    }
  }

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
    const manifestUpdateUrl = manifest.updateUrl;
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
