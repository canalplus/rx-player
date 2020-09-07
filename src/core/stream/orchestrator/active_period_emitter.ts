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
  Observable
} from "rxjs";
import {
  distinctUntilChanged,
  filter,
  map,
  scan,
} from "rxjs/operators";
import { Period } from "../../../manifest";
import { IBufferType } from "../../source_buffers";
import { IMultiplePeriodStreamsEvent } from "../types";

interface IPeriodObject { period : Period;
                          buffers: Set<IBufferType>; }

type IPeriodsList = Partial<Record<string, IPeriodObject>>;

/**
 * Emit the active Period each times it changes.
 *
 * The active Period is the first Period (in chronological order) which has
 * a RepresentationStream associated for every defined BUFFER_TYPES.
 *
 * Emit null if no Period can be considered active currently.
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
 * The active Period here is Period 2 as Period 1 has no video
 * RepresentationStream.
 *
 * If we are missing a or multiple PeriodStreams in the first chronological
 * Period, like that is the case here, it generally means that we are
 * currently switching between Periods.
 *
 * For here we are surely switching from Period 1 to Period 2 beginning by the
 * video PeriodStream. As every PeriodStream is ready for Period 2, we can
 * already inform that it is the current Period.
 * ```
 *
 * @param {Array.<string>} bufferTypes - Every buffer types in the content.
 * @param {Observable} addPeriodStream$ - Emit PeriodStream information when
 * one is added.
 * @param {Observable} removePeriodStream$ - Emit PeriodStream information when
 * one is removed.
 * @returns {Observable}
 */
export default function ActivePeriodEmitter(
  buffers$: Array<Observable<IMultiplePeriodStreamsEvent>>
) : Observable<Period|null> {
  const numberOfStreams = buffers$.length;
  return observableMerge(...buffers$).pipe(
    // not needed to filter, this is an optim
    filter(({ type }) => type === "periodStreamCleared" ||
                         type === "adaptationChange" ||
                         type === "representationChange"),
    scan<IMultiplePeriodStreamsEvent, IPeriodsList>((acc, evt) => {
      switch (evt.type) {
        case "periodStreamCleared": {
          const { period, type } = evt.value;
          const currentInfos = acc[period.id];
          if (currentInfos != null && currentInfos.buffers.has(type)) {
            currentInfos.buffers.delete(type);
            if (currentInfos.buffers.size === 0) {
              delete acc[period.id];
            }
          }
        }
          break;

        case "adaptationChange": {
          // `adaptationChange` with a null Adaptation will not lead to a
          // `representationChange` event
          if (evt.value.adaptation != null) {
            return acc;
          }
        }
        case "representationChange": {
          const { period, type } = evt.value;
          const currentInfos = acc[period.id];
          if (currentInfos != null && !currentInfos.buffers.has(type)) {
            currentInfos.buffers.add(type);
          } else {
            const bufferSet = new Set<IBufferType>();
            bufferSet.add(type);
            acc[period.id] = { period, buffers: bufferSet };
          }
        }
          break;

      }
      return acc;
    }, {}),

    map((list) : Period | null => {
      const activePeriodIDs = Object.keys(list);
      const completePeriods : Period[] = [];
      for (let i = 0; i < activePeriodIDs.length; i++) {
        const periodInfos = list[activePeriodIDs[i]];
        if (periodInfos != null && periodInfos.buffers.size === numberOfStreams) {
          completePeriods.push(periodInfos.period);
        }
      }

      return completePeriods.reduce<Period|null>((acc, period) => {
        if (acc == null) {
          return period;
        }
        return period.start < acc.start ? period :
                                          acc;
      }, null);
    }),

    distinctUntilChanged((a, b) => {
      return a == null && b == null ||
             a != null && b != null && a.id === b.id;
    })
  );
}
