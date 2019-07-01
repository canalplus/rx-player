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
  Observable,
  Subscription
} from "rxjs";
import {
  distinctUntilChanged,
  filter,
  finalize,
  map,
  tap,
} from "rxjs/operators";
import log from "../../log";
import {
  Adaptation,
  Period,
} from "../../manifest";
import SortedList from "../../utils/sorted_list";
import {
  IBufferType,
} from "../source_buffers";
import {
  IMultiplePeriodBuffersEvent,
  IPeriodBufferClearedEvent,
  IPeriodBufferReadyEvent,
} from "./types";

// PeriodBuffer informations emitted to the ActivePeriodEmitted
export interface IPeriodBufferInfos { period: Period;
                                      type: IBufferType;
                                      adaptation$?: Observable<Adaptation|null>; }

// structure used internally to keep track of which Period has which
// PeriodBuffer
interface IPeriodItem { period: Period;
                        adaptations: Set<IBufferType>;
                        representations: Set<IBufferType>;
                        adaptationsSubscriptions: Subscription[]; }

/**
 * Emit the active Period each times it changes and firsts adaptations
 * and representation have been chosen.
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
 * @param {Observable} bufferEvents$ - Events from buffer managers.
 * @returns {Observable}
 */
export default function ActivePeriodEmitter(
  bufferTypes: IBufferType[],
  bufferEvents$: Array<Observable<IMultiplePeriodBuffersEvent>>
) : Observable<Period|null> {
  const periodsList : SortedList<IPeriodItem> =
    new SortedList((a, b) => a.period.start - b.period.start);

  /**
   * Add representation to period item on representation change
   */
  function addRepresentationToItem(type: IBufferType): void {
    const periodItem = periodsList.findFirst(p =>
      isBufferListFull(bufferTypes, p.adaptations)
    );
    if (periodItem) {
      periodItem.representations.add(type);
    }
  }

  /**
   * Add period item on period buffer ready
   * @param {Object} evt
   * @returns {Observable}
   */
  function addPeriodItem(evt: IPeriodBufferReadyEvent): void {
    // add or update the periodItem
    const { value: { period, type, adaptation$ }} = evt;
    let periodItem = periodsList.findFirst(p => p.period === period);
    if (!periodItem) {
      periodItem = { period,
                     adaptations: new Set<IBufferType>(),
                     representations: new Set<IBufferType>(),
                     adaptationsSubscriptions: [] };
      periodsList.add(periodItem);
    }

    if (periodItem.adaptations.has(type)) {
      log.warn(
        `ActivePeriodEmitter: Buffer type ${type} already added to the period`);
    }
    periodItem.adaptations.add(type);

    if (adaptation$ != null) {
      periodItem.adaptationsSubscriptions.push(adaptation$.pipe(
        tap((adaptation) => {
          const firstPeriodItem =
            periodsList.findFirst(p => p.period === period);
          if (firstPeriodItem) {
            if (adaptation == null) {
              firstPeriodItem.representations.add(type);
            }
          }
        })
      ).subscribe());
    }
  }

  /**
   * Remove period item on period buffer cleared
   * @param {Object} evt
   */
  function removePeriodItem(evt: IPeriodBufferClearedEvent): void {
    if (!periodsList || periodsList.length() === 0) {
      log.error("ActivePeriodEmitter: cannot remove, no period is active.");
      return;
    }

    const periodItem = periodsList.findFirst(p => p.period === evt.value.period);
    if (!periodItem) {
      log.error("ActivePeriodEmitter: cannot remove, unknown period.");
      return;
    }

    periodItem.adaptations.delete(evt.value.type);

    if (!periodItem.adaptations.size) {
      periodsList.removeElement(periodItem);
    }
  }

  return observableMerge(...bufferEvents$).pipe(
    filter((evt) => {
      return evt.type === "representationChange" ||
      evt.type === "periodBufferReady" ||
      evt.type === "periodBufferCleared";
    }),
    tap((evt) => {
      switch (evt.type) {
        case "representationChange":
          addRepresentationToItem(evt.value.type);
          break;
        case "periodBufferReady":
          addPeriodItem(evt);
          break;
        case "periodBufferCleared":
          removePeriodItem(evt);
          break;
        default:
          break;
      }
    }),
    map(() => {
      const head = periodsList.head();
      if (!head) {
        return null;
      }

      const periodItem = periodsList.findFirst(p =>
        isBufferListFull(bufferTypes, p.adaptations) &&
        isBufferListFull(bufferTypes, p.representations)
      );
      return periodItem != null ? periodItem.period : null;
    }),
    distinctUntilChanged(),
    finalize(() => {
      while (periodsList.length) {
        const periodItem = periodsList.pop();
        if (periodItem && periodItem.adaptationsSubscriptions != null) {
          periodItem.adaptationsSubscriptions.forEach((s) => s.unsubscribe());
        }
      }
    })
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
