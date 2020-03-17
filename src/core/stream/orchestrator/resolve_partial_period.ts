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
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  mergeMap,
  take,
} from "rxjs/operators";
import { MediaError } from "../../../errors";
import Manifest, {
  LoadedPeriod,
  PartialPeriod,
} from "../../../manifest";
import { fromEvent } from "../../../utils/event_emitter";

export interface INeedsLoadedPeriodEvent { type : "needs-loaded-period";
                                           value: { period: PartialPeriod }; }
export interface IPeriodLoadedEvent { type : "period-loaded";
                                      value : { period : LoadedPeriod }; }

/**
 * Try to obtain a LoadedPeriod from the PartialPeriod and wanted time given.
 * @param {Object} Manifest
 * @param {Object} period
 * @param {number} wantedTime
 * @returns {Observable}
 */
export default function resolvePartialPeriod(
  manifest : Manifest,
  period : PartialPeriod,
  wantedTime : number
) : Observable<INeedsLoadedPeriodEvent | IPeriodLoadedEvent> {
  const loadedPeriod$ = fromEvent(manifest, "loadedPeriod").pipe(
    filter(value => value[0].id === period.id),
    take(1),
    mergeMap((value) : Observable< INeedsLoadedPeriodEvent |
                                   IPeriodLoadedEvent > => {
      const loadedPeriods = value[1];
      for (let i = 0; i < loadedPeriods.length; i++) {
        const loadedPeriod = loadedPeriods[i];
        if (loadedPeriod.end === undefined || wantedTime < loadedPeriod.end) {
          return loadedPeriod.isLoaded ?
            observableOf({ type: "period-loaded" as const,
                           value: { period: loadedPeriod } }) :
            resolvePartialPeriod(manifest, loadedPeriod, wantedTime);
        }
      }
      throw new MediaError("MEDIA_TIME_NOT_FOUND",
                           "The wanted period is not found in the Manifest.");
    }));

  return observableMerge(loadedPeriod$, // we need to bind the event listener first
                         observableOf({ type: "needs-loaded-period" as const,
                                        value: { period } }));
}
