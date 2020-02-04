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
  timer as observableTimer,
} from "rxjs";
import {
  ignoreElements,
  mergeMap,
  take,
  tap,
} from "rxjs/operators";
import log from "../../log";
import Manifest from "../../manifest";
import isNonEmptyString from "../../utils/is_non_empty_string";
import { IFetchManifestResult } from "../pipelines";

export type IManifestFetcher =
    (manifestURL? : string, externalClockOffset?: number) =>
      Observable<IFetchManifestResult>;

/**
 * Refresh the Manifest at the right time.
 * @param {Object} initialManifest
 * @param {Observable} scheduleRefresh$
 * @param {Function} fetchManifest
 * @param {number} minimumManifestUpdateInterval
 * @returns {Observable}
 */
export default function manifestUpdateScheduler(
  initialManifest : { manifest : Manifest;
                      sendingTime? : number; },
  scheduleRefresh$ : Observable<number>,
  fetchManifest : IManifestFetcher,
  minimumManifestUpdateInterval : number
) : Observable<never> {
  function handleManifestRefresh$(
    manifestInfos: { manifest: Manifest;
                     sendingTime?: number; }): Observable<never> {
    const { manifest, sendingTime } = manifestInfos;
    // schedule a Manifest refresh to avoid sending too much request.
    const manualRefresh$ = scheduleRefresh$.pipe(
      mergeMap((delay) => {
        const timeSinceLastRefresh = sendingTime == null ?
                                       0 :
                                       performance.now() - sendingTime;
        const minInterval = Math.max(minimumManifestUpdateInterval
                                       - timeSinceLastRefresh,
                                     0);
        return observableTimer(Math.max(delay - timeSinceLastRefresh,
                                        minInterval));
      }));

    const autoRefresh$ = (() => {
      if (manifest.lifetime == null || manifest.lifetime <= 0) {
        return EMPTY;
      }
      const timeSinceRequest = sendingTime == null ?
                                 0 :
                                 performance.now() - sendingTime;
      const minInterval = Math.max(minimumManifestUpdateInterval
                                     - timeSinceRequest,
                                   0);
      const updateTimeout = manifest.lifetime * 1000 - timeSinceRequest;
      return observableTimer(Math.max(updateTimeout, minInterval));
    })();

    const expired$ = manifest.expired === null ? EMPTY :
                                                 observableFrom(manifest.expired);

    // Emit when the manifest should be refreshed. Either when:
    //   - A buffer asks for it to be refreshed
    //   - its lifetime expired.
    return observableMerge(autoRefresh$, manualRefresh$, expired$)
      .pipe(take(1),
            mergeMap(() => refreshManifest(initialManifest.manifest,
                                           fetchManifest)),
            mergeMap(handleManifestRefresh$),
            ignoreElements());
  }

  return observableDefer(() => handleManifestRefresh$(initialManifest));
}

/**
 * Refresh the manifest on subscription.
 * @returns {Observable}
 */
function refreshManifest(
  manifest : Manifest,
  fetchManifest : IManifestFetcher
) : Observable<IFetchManifestResult> {
  const refreshURL = manifest.getUrl();
  if (!isNonEmptyString(refreshURL)) {
    log.warn("Init: Cannot refresh the manifest: no url");
    return EMPTY;
  }

  const externalClockOffset = manifest.getClockOffset();
  return fetchManifest(refreshURL, externalClockOffset)
    .pipe(tap(({ manifest: newManifest }) => {
      manifest.replace(newManifest);
    }));
}
