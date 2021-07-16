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
  distinctUntilChanged,
  filter,
  map,
  merge as observableMerge,
  Observable,
  scan,
} from "rxjs";
import { Period } from "../../../manifest";
import { IBufferType } from "../../segment_buffers";
import { IStreamOrchestratorEvent } from "../types";

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
 * For 3 BUFFER_TYPES: "AUDIO", "VIDEO" and "TEXT":
 * ```
 *                     +-------------+
 *         Period 1    | Period 2    | Period 3
 * AUDIO   |=========| | |===      | |
 * VIDEO               | |=====    | |
 * TEXT    |(NO TEXT)| | |(NO TEXT)| | |====    |
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
 * @param {Array.<Observable>} buffers$
 * @returns {Observable}
 */
export default function ActivePeriodEmitter(
  buffers$: Array<Observable<IStreamOrchestratorEvent>>
) : Observable<Period|null> {
  const numberOfStreams = buffers$.length;
  return observableMerge(...buffers$).pipe(
    // not needed to filter, this is an optim
    filter(({ type }) => type === "periodStreamCleared" ||
                         type === "adaptationChange" ||
                         type === "representationChange"),
    scan<IStreamOrchestratorEvent, IPeriodsList>((acc, evt) => {
      switch (evt.type) {
        case "periodStreamCleared": {
          const { period, type } = evt.value;
          const currentInfos = acc[period.id];
          if (currentInfos !== undefined && currentInfos.buffers.has(type)) {
            currentInfos.buffers.delete(type);
            if (currentInfos.buffers.size === 0) {
              delete acc[period.id];
            }
          }
        }
          break;

        case "adaptationChange": {
          // For Adaptations that are not null, we will receive a
          // `representationChange` event. We can thus skip this event and only
          // listen to the latter.
          if (evt.value.adaptation !== null) {
            return acc;
          }
        }
        // /!\ fallthrough done on purpose
        // Note that we fall-through only when the Adaptation sent through the
        // `adaptationChange` event is `null`. This is because in those cases,
        // we won't receive any "representationChange" event. We however still
        // need to register that Period as active for the current type.
        // eslint-disable-next-line no-fallthrough
        case "representationChange": {
          const { period, type } = evt.value;
          const currentInfos = acc[period.id];
          if (currentInfos === undefined) {
            const bufferSet = new Set<IBufferType>();
            bufferSet.add(type);
            acc[period.id] = { period, buffers: bufferSet };
          } else if (!currentInfos.buffers.has(type)) {
            currentInfos.buffers.add(type);
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
        if (periodInfos !== undefined && periodInfos.buffers.size === numberOfStreams) {
          completePeriods.push(periodInfos.period);
        }
      }

      return completePeriods.reduce<Period|null>((acc, period) => {
        if (acc === null) {
          return period;
        }
        return period.start < acc.start ? period :
                                          acc;
      }, null);
    }),

    distinctUntilChanged((a, b) => {
      return a === null && b === null ||
             a !== null && b !== null && a.id === b.id;
    })
  );
}
