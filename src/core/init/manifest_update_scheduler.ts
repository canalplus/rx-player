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

const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config;

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
  maximumManifestUpdateInterval? : number;
  minimumManifestUpdateInterval : number;
  scheduleRefresh$ : Observable<{ completeRefresh : boolean }>;
}

/**
 * Refresh the Manifest at the right time.
 * @param {Object} manifestUpdateSchedulerArguments
 * @returns {Observable}
 */
export default function manifestUpdateScheduler({
  fetchManifest,
  initialManifest,
  manifestUpdateUrl,
  maximumManifestUpdateInterval,
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

    const internalRefresh$ = scheduleRefresh$.pipe(mergeMap(({ completeRefresh }) =>
      startInternalRefreshInterval(completeRefresh,
                                   minimumManifestUpdateInterval,
                                   sendingTime).pipe(mapTo({ completeRefresh }))));

    const timeSinceRequest = sendingTime == null ? 0 :
                                                   performance.now() - sendingTime;
    const minInterval = Math.max(minimumManifestUpdateInterval - timeSinceRequest, 0);

    let autoRefresh$;
    if (manifest.lifetime === undefined || manifest.lifetime < 0) {
      autoRefresh$ = EMPTY;
    } else {
      const { parsingTime, updatingTime } = manifestInfos;
      let autoRefreshInterval = manifest.lifetime * 1000 - timeSinceRequest;
      if (parsingTime + (updatingTime ?? 0) >= manifest.lifetime / 4) {
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

   const maxInterval$ = maximumManifestUpdateInterval === undefined ?
     EMPTY :
     observableTimer(maximumManifestUpdateInterval)
       .pipe(mapTo({ completeRefresh: false }));

    // Emit when the manifest should be refreshed. Either when:
    //   - A buffer asks for it to be refreshed
    //   - its lifetime expired.
    return observableMerge(autoRefresh$, internalRefresh$, expired$, maxInterval$).pipe(
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
             return startInternalRefreshInterval(true,
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
 * @param {boolean} completeRefresh
 * @param {number} minimumManifestUpdateInterval
 * @param {number|undefined} lastManifestRequestTime
 * @returns {Observable.<boolean>}
 */
function startInternalRefreshInterval(
  completeRefresh : boolean,
  minimumManifestUpdateInterval : number,
  lastManifestRequestTime : number | undefined
) : Observable<unknown> {
  return observableDefer(() => {
    // The value allows to set a delay relatively to the last Manifest refresh
    // (to avoid asking for it too often).
    const delay = completeRefresh ? OUT_OF_SYNC_MANIFEST_REFRESH_DELAY :
                                    0;
    const timeSinceLastRefresh = lastManifestRequestTime == null ?
                                   0 :
                                   performance.now() - lastManifestRequestTime;
    const _minInterval = Math.max(minimumManifestUpdateInterval
                                    - timeSinceLastRefresh,
                                  0);
    return observableTimer(Math.max(delay - timeSinceLastRefresh,
                                    _minInterval));
  });
}
