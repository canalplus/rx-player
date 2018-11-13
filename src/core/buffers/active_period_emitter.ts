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

/**
 * This file helps to keep track of the currently active Periods.
 * That is, Periods for which at least a single Buffer is currently active.
 *
 * It also keep track of the currently active period:
 * The first chronological period for which all types of buffers are active.
 */

import {
  merge as observableMerge,
  Observable
} from "rxjs";
import {
  distinctUntilChanged,
  map,
  tap,
} from "rxjs/operators";
import log from "../../log";
import { IFetchedPeriod } from "../../manifest";
import SortedList from "../../utils/sorted_list";
import {
  IBufferType,
} from "../source_buffers";

// PeriodBuffer informations emitted to the ActivePeriodEmitted
export interface IPeriodBufferInfos { period: IFetchedPeriod;
                                      type: IBufferType; }

// structure used internally to keep track of which Period has which
// PeriodBuffer
interface IPeriodItem { period: IFetchedPeriod;
                        buffers: Set<IBufferType>; }

/**
 * Emit the active Period each times it changes.
 *
 * The active Period is the first Period (in chronological order) which has
 * a PeriodBuffer for every defined BUFFER_TYPES.
 *
 * Emit null if no Period has PeriodBuffers for all types.
 *
 * @example
 * For 4 BUFFER_TYPES: "AUDIO", "VIDEO", "TEXT" and "IMAGE":
 * ```
 *                     +-------------+
 *         Period 1    | Period 2    | Period 3
 * AUDIO   |=========| | |===      | |
 * VIDEO               | |=====    | |
 * TEXT    |(NO TEXT)| | |(NO TEXT)| | |====    |
 * IMAGE   |=========| | |=        | |
 *                     +-------------+
 *
 * The active Period here is Period 2 as Period 1 has no video PeriodBuffer.
 *
 * If we are missing a or multiple PeriodBuffers in the first chronological
 * Period, like that is the case here, it generally means that we are
 * currently switching between Periods.
 *
 * For here we are surely switching from Period 1 to Period 2 beginning by the
 * video PeriodBuffer. As every PeriodBuffer is ready for Period 2, we can
 * already inform that it is the current Period.
 * ```
 *
 * @param {Array.<string>} bufferTypes - Every buffer types in the content.
 * @param {Observable} addPeriodBuffer$ - Emit PeriodBuffer informations when
 * one is added.
 * @param {Observable} removePeriodBuffer$ - Emit PeriodBuffer informations when
 * one is removed.
 * @returns {Observable}
 */
export default function ActivePeriodEmitter(
  bufferTypes: IBufferType[],
  addPeriodBuffer$ : Observable<IPeriodBufferInfos>,
  removePeriodBuffer$ : Observable<IPeriodBufferInfos>
) : Observable<IFetchedPeriod|null> {
  const periodsList : SortedList<IPeriodItem> =
    new SortedList((a, b) => a.period.start - b.period.start);

  const onItemAdd$ = addPeriodBuffer$
    .pipe(tap(({ period, type }) => {
      // add or update the periodItem
      let periodItem = periodsList.findFirst(p => p.period === period);
      if (!periodItem) {
        periodItem = { period,
                       buffers: new Set<IBufferType>() };
        periodsList.add(periodItem);
      }

      if (periodItem.buffers.has(type)) {
        log.warn(`ActivePeriodEmitter: Buffer type ${type} already added to the period`);
      }
      periodItem.buffers.add(type);
    }));

  const onItemRemove$ = removePeriodBuffer$
    .pipe(tap(({ period, type }) => {
      if (!periodsList || periodsList.length() === 0) {
        log.error("ActivePeriodEmitter: cannot remove, no period is active.");
        return ;
      }

      const periodItem = periodsList.findFirst(p => p.period === period);
      if (!periodItem) {
        log.error("ActivePeriodEmitter: cannot remove, unknown period.");
        return ;
      }

      periodItem.buffers.delete(type);

      if (!periodItem.buffers.size) {
        periodsList.removeElement(periodItem);
      }
    }));

  return observableMerge(onItemAdd$, onItemRemove$).pipe(
    map(() : IFetchedPeriod|null => {
      const head = periodsList.head();
      if (!head) {
        return null;
      }

      const periodItem = periodsList.findFirst(p =>
        isBufferListFull(bufferTypes, p.buffers)
      );
      return periodItem != null ? periodItem.period : null;
    }),
    distinctUntilChanged()
  );
}

/**
 * Returns true if the set of given buffer types is complete (has all possible
 * types).
 * @param {Array.<string>} bufferTypes - Every buffer types in the content.
 * @param {Set.<string>} bufferList
 * @returns {Boolean}
 */
function isBufferListFull(
  bufferTypes : IBufferType[],
  bufferList : Set<IBufferType>
) : boolean {
  return bufferList.size >= bufferTypes.length;
}
