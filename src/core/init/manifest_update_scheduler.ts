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
  EMPTY,
  merge as observableMerge,
  Observable,
  ReplaySubject,
  timer as observableTimer,
} from "rxjs";
import {
  finalize,
  ignoreElements,
  mergeMap,
  startWith,
  switchMap,
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
 * @returns {Observable}
 */
export default function manifestUpdateScheduler(
  initialManifest : { manifest : Manifest;
                      sendingTime? : number; },
  scheduleRefresh$ : Observable<number>,
  fetchManifest : IManifestFetcher
) : Observable<never> {
  // Emit each time the manifest is refreshed.
  const manifestRefreshed$ = new ReplaySubject<{ manifest : Manifest;
                                                 sendingTime? : number; }>(1);

  // Emit when the manifest should be refreshed. Either when:
  //   - A buffer asks for it to be refreshed
  //   - its lifetime expired.
  return manifestRefreshed$.pipe(
    startWith(initialManifest),
    switchMap(({ manifest: newManifest, sendingTime: newSendingTime }) => {
      const manualRefresh$ = scheduleRefresh$.pipe(
        mergeMap((delay) => {
          // schedule a Manifest refresh to avoid sending too much request.
          const timeSinceLastRefresh = newSendingTime == null ?
                                         0 :
                                         performance.now() - newSendingTime;
          return observableTimer(delay - timeSinceLastRefresh);
        }));

      const autoRefresh$ = (() => {
        if (newManifest.lifetime == null || newManifest.lifetime <= 0) {
          return EMPTY;
        }
        const timeSinceRequest = newSendingTime == null ?
                                   0 :
                                   performance.now() - newSendingTime;
        const updateTimeout = newManifest.lifetime * 1000 - timeSinceRequest;
        return observableTimer(updateTimeout);
      })();

      return observableMerge(autoRefresh$, manualRefresh$)
        .pipe(take(1),
              mergeMap(() => refreshManifest(initialManifest.manifest,
                                             fetchManifest)),
              tap(val => manifestRefreshed$.next(val)),
              ignoreElements());
    }),
    finalize(() => {
      manifestRefreshed$.complete();
    })
  );
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
            manifest.update(newManifest);
          }));
}
