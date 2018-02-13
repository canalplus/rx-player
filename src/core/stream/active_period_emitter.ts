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

// TODO
// This turns out to be a mess
// The Stream should probably emit a "currentPeriodChanged" event instead.

import { Observable } from "rxjs/Observable";
import { Period } from "../../manifest";
import log from "../../utils/log";
import SortedList from "../../utils/sorted_list";
import {
  BUFFER_TYPES,
  SupportedBufferTypes,
} from "../source_buffers";

export interface IPeriodBufferItem {
  period: Period;
  type: SupportedBufferTypes;
}

interface IPeriodItem {
  period: Period;
  buffers: Set<SupportedBufferTypes>;
}

/**
 * Emit the active Period each times it changes.
 *
 * The active Period is the first Period (in chronological order) which has
 * PeriodBuffers for all BUFFER_TYPES.
 *
 * Emit null if no Period has PeriodBuffers for all types.
 *
 * @example
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
 * @param {Observable} addPeriodBuffer$ - Emit PeriodBuffer informations when
 * one is added.
 * @param {Observable} removePeriodBuffer$ - Emit PeriodBuffer informations when
 * one is removed.
 * @returns {Observable}
 */
export default function ActivePeriodEmitter(
  addPeriodBuffer$ : Observable<IPeriodBufferItem>,
  removePeriodBuffer$ : Observable<IPeriodBufferItem>
) : Observable<Period|null> {
  const periodsList : SortedList<IPeriodItem> =
    new SortedList((a, b) => a.period.start - b.period.start);

  const onItemAdd$ = addPeriodBuffer$
    .do(({ period, type }) => {
      // add or update the periodItem
      let periodItem = periodsList.find(p => p.period === period);
      if (!periodItem) {
        periodItem = {
          period,
          buffers: new Set<SupportedBufferTypes>(),
        };
        periodsList.add(periodItem);
      }

      if (periodItem.buffers.has(type)) {
        log.warn(`Buffer type ${type} already added to the period`);
      }
      periodItem.buffers.add(type);
    });

  const onItemRemove$ = removePeriodBuffer$
    .do(({ period, type }) => {
      if (!periodsList || periodsList.length() === 0) {
        log.error("ActivePeriodStore: cannot remove, no period is active.");
        return ;
      }

      const periodItem = periodsList.find(p => p.period === period);
      if (!periodItem) {
        log.error("ActivePeriodStore: cannot remove, unknown period.");
        return ;
      }

      periodItem.buffers.delete(type);

      if (!periodItem.buffers.size) {
        periodsList.removeFirst(periodItem);
      }
    });

  return Observable.merge(onItemAdd$, onItemRemove$)
    .map(() : Period|null => {
      const head = periodsList.head();
      if (!head) {
        return null;
      }

      const periodItem = periodsList.find(p => isBufferListFull(p.buffers));
      return periodItem != null ? periodItem.period : null;
    }).distinctUntilChanged();
}

/**
 * Returns true if the set of given buffer types is complete (has all possible
 * types).
 * @param {Set} bufferList
 * @returns {Boolean}
 */
function isBufferListFull(bufferList : Set<SupportedBufferTypes>) : boolean {
  return bufferList.size >= BUFFER_TYPES.length;
}
