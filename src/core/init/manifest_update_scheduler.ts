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
  ignoreElements,
  mapTo,
  mergeMap,
  mergeMapTo,
  take,
} from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import Manifest from "../../manifest";
import isNonEmptyString from "../../utils/is_non_empty_string";
import { IFetchManifestResult } from "../pipelines";

const { FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY } = config;

export type IManifestFetcher =
    (manifestURL? : string, externalClockOffset?: number) =>
      Observable<IFetchManifestResult>;

export interface IManifestUpdateSchedulerArguments {
  fetchManifest : IManifestFetcher;
  initialManifest : { manifest : Manifest;
                      sendingTime? : number;
                      receivedTime? : number;
                      parsingTime : number; };
  manifestUpdateUrl : string | undefined;
  minimumManifestUpdateInterval : number;
  scheduleRefresh$ : IManifestRefreshScheduler;
}

export interface IManifestRefreshSchedulerEvent {
  completeRefresh : boolean; // if true, the Manifest should be fully updated
  delay? : number; // optional wanted refresh delay, which is the minimum time
                   // you want to wait before updating the manifest
}

export type IManifestRefreshScheduler = Observable<IManifestRefreshSchedulerEvent>;

/**
 * Refresh the Manifest at the right time.
 * @param {Object} manifestUpdateSchedulerArguments
 * @returns {Observable}
 */
export default function manifestUpdateScheduler({
  fetchManifest,
  initialManifest,
  manifestUpdateUrl,
  minimumManifestUpdateInterval,
  scheduleRefresh$,
} : IManifestUpdateSchedulerArguments) : Observable<never> {
  // The Manifest always keeps the same Manifest
  const { manifest } = initialManifest;

  function handleManifestRefresh$(
    manifestInfos: { manifest: Manifest;
                     sendingTime?: number;
                     receivedTime? : number;
                     parsingTime : number;
                     updatingTime? : number; }): Observable<never> {
    const { sendingTime } = manifestInfos;

    const internalRefresh$ = scheduleRefresh$
      .pipe(mergeMap(({ completeRefresh, delay }) => {
        return startManualRefreshTimer(delay ?? 0,
                                       minimumManifestUpdateInterval,
                                       sendingTime)
          .pipe(mapTo({ completeRefresh }));
      }));

    const timeSinceRequest = sendingTime == null ? 0 :
                                                   performance.now() - sendingTime;
    const minInterval = Math.max(minimumManifestUpdateInterval - timeSinceRequest, 0);

    let autoRefresh$;
    if (manifest.lifetime === undefined || manifest.lifetime < 0) {
      autoRefresh$ = EMPTY;
    } else {
      const { parsingTime, updatingTime } = manifestInfos;
      let autoRefreshInterval = manifest.lifetime * 1000 - timeSinceRequest;
      if (parsingTime + (updatingTime ?? 0) >= (manifest.lifetime * 1000) / 4) {
        const newInterval = Math.max(autoRefreshInterval, 0)
                            + parsingTime + (updatingTime ?? 0);
        log.info("MUS: Manifest took too long to parse. Postponing next request",
                 autoRefreshInterval,
                 newInterval);
        autoRefreshInterval = newInterval;
      }
      autoRefresh$ = observableTimer(Math.max(autoRefreshInterval, minInterval))
        .pipe(mapTo({ completeRefresh: false }));
    }

    const expired$ = manifest.expired === null ?
      EMPTY :
      observableTimer(minInterval)
        .pipe(mergeMapTo(observableFrom(manifest.expired)),
              mapTo({ completeRefresh: true }));

    // Emit when the manifest should be refreshed. Either when:
    //   - A buffer asks for it to be refreshed
    //   - its lifetime expired.
    return observableMerge(autoRefresh$, internalRefresh$, expired$).pipe(
      take(1),
      mergeMap(({ completeRefresh }) => refreshManifest(completeRefresh)),
      mergeMap(handleManifestRefresh$),
      ignoreElements());
  }

  return observableDefer(() => handleManifestRefresh$(initialManifest));

  /**
   * Refresh the Manifest.
   * Perform a full update if a partial update failed.
   * @param {boolean} completeRefresh
   * @returns {Observable}
   */
   function refreshManifest(
     completeRefresh : boolean
   ) : Observable<IFetchManifestResult> {
     const fullRefresh = completeRefresh || manifestUpdateUrl === undefined;
     const refreshURL = fullRefresh ? manifest.getUrl() :
                                      manifestUpdateUrl;
     if (!isNonEmptyString(refreshURL)) {
       log.warn("Init: Cannot refresh the manifest: no url");
       return EMPTY;
     }
     const externalClockOffset = manifest.getClockOffset();
     return fetchManifest(refreshURL, externalClockOffset)
       .pipe(mergeMap((value) => {
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
               .pipe(mergeMap(() => refreshManifest(true)));
           }
         }
         return observableOf({ manifest,
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
    const timeSinceLastRefresh = lastManifestRequestTime == null ?
                                   0 :
                                   performance.now() - lastManifestRequestTime;
    const _minInterval = Math.max(minimumManifestUpdateInterval - timeSinceLastRefresh,
                                  0);
    return observableTimer(Math.max(wantedDelay - timeSinceLastRefresh,
                                    _minInterval));
  });
}
