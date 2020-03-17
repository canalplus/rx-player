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

import config from "../../../config";
import {
  Adaptation,
  LoadedPeriod,
} from "../../../manifest";
import {
  convertToRanges,
  excludeFromRanges,
  IRange,
  isTimeInRange,
  isTimeInRanges,
  keepRangeIntersection,
} from "../../../utils/ranges";
import { QueuedSourceBuffer } from "../../source_buffers";

const { ADAPTATION_SWITCH_BUFFER_PADDINGS } = config;

export type IAdaptationSwitchStrategy =
  { type: "continue"; value: undefined } |
  { type: "clean-buffer"; value: Array<{ start: number; end: number }> } |
  { type: "needs-reload"; value: undefined };

/**
 * Find out what to do when switching adaptation, based on the current
 * situation.
 * @param {Object} queuedSourceBuffer
 * @param {Object} period
 * @param {Object} adaptation
 * @param {Object} clockTick
 * @returns {Object}
 */
export default function getAdaptationSwitchStrategy(
  queuedSourceBuffer : QueuedSourceBuffer<unknown>,
  period : LoadedPeriod,
  adaptation : Adaptation,
  clockTick : { currentTime : number; readyState : number }
) : IAdaptationSwitchStrategy {
  const buffered = queuedSourceBuffer.getBufferedRanges();
  if (buffered.length === 0) {
    return { type: "continue", value: undefined };
  }
  const bufferedRanges = convertToRanges(buffered);
  const start = period.start;
  const end = period.end == null ? Infinity :
                                   period.end;
  const intersection = keepRangeIntersection(bufferedRanges, [{ start, end }]);
  if (intersection.length === 0) {
    return { type: "continue", value: undefined };
  }

  // remove from that intersection what we know to be the right Adaptation
  const adaptationInBuffer = getBufferedRangesFromAdaptation(queuedSourceBuffer,
                                                             period,
                                                             adaptation);
  const { currentTime } = clockTick;
  if (adaptation.type === "video" &&
      clockTick.readyState > 1 &&
      isTimeInRange({ start, end }, currentTime) &&
      (isTimeInRanges(bufferedRanges, currentTime) &&
       !isTimeInRanges(adaptationInBuffer, currentTime)))
  {
    return { type: "needs-reload", value: undefined };
  }

  const unwantedData = excludeFromRanges(intersection, adaptationInBuffer);
  const bufferType = adaptation.type;
  let paddingBefore = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].before;
  if (paddingBefore == null) {
    paddingBefore = 0;
  }
  let paddingAfter = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].after;
  if (paddingAfter == null) {
    paddingAfter = 0;
  }
  const toRemove = excludeFromRanges(unwantedData, [{
    start: Math.max(currentTime - paddingBefore, start),
    end: Math.min(currentTime + paddingAfter, end),
  }]);

  return toRemove.length > 0 ?  { type: "clean-buffer", value: toRemove } :
                                { type: "continue", value: undefined };
}

/**
 * Returns buffered ranges of what we know correspond to the given `adaptation`
 * in the SourceBuffer.
 * @param {Object} queuedSourceBuffer
 * @param {Object} period
 * @param {Object} adaptation
 * @returns {Array.<Object>}
 */
function getBufferedRangesFromAdaptation(
  queuedSourceBuffer : QueuedSourceBuffer<unknown>,
  period : LoadedPeriod,
  adaptation : Adaptation
) : IRange[] {
  queuedSourceBuffer.synchronizeInventory();
  return queuedSourceBuffer.getInventory()
    .reduce<IRange[]>((acc : IRange[], chunk) : IRange[] => {
      if (chunk.infos.period.id !== period.id ||
          chunk.infos.adaptation.id !== adaptation.id)
      {
        return acc;
      }
      const { bufferedStart, bufferedEnd } = chunk;
      if (bufferedStart === undefined || bufferedEnd === undefined) {
        return acc;
      }
      acc.push({ start: bufferedStart, end: bufferedEnd });
      return acc;
    }, []);
}
