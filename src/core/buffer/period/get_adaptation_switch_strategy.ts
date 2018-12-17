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

import config from "../../config";
import { Period } from "../../manifest";
import {
  convertToRanges,
  isTimeInRange,
  keepRangeIntersection,
} from "../../utils/ranges";
import { IBufferType } from "../source_buffers";

const { ADAPTATION_SWITCH_BUFFER_PADDINGS } = config;

export type IAdaptationSwitchStrategy =
  { type: "continue"; value: undefined } |
  { type: "clean-buffer"; value: Array<{ start: number; end: number }> } |
  { type: "needs-reload"; value: undefined };

/**
 * Find out what to do when switching adaptation, based on the current
 * situation.
 * @param {TimeRanges} buffered
 * @param {Object} period
 * @param {string} bufferType
 * @param {Object} clockTick
 * @returns {Object}
 */
export default function getAdaptationSwitchStrategy(
  buffered : TimeRanges,
  period : Period,
  bufferType : IBufferType,
  clockTick : { currentTime : number; readyState : number }
) : IAdaptationSwitchStrategy {
  if (!buffered.length) {
    return { type: "continue", value: undefined };
  }
  const bufferedRanges = convertToRanges(buffered);
  const start = period.start;
  const end = period.end || Infinity;
  const intersection = keepRangeIntersection(bufferedRanges, [{ start, end }]);
  if (!intersection.length) {
    return { type: "continue", value: undefined };
  }

  const { currentTime } = clockTick;
  if (
    bufferType === "video" &&
    clockTick.readyState > 1 &&
    isTimeInRange({ start, end }, currentTime)
  ) {
    return { type: "needs-reload", value: undefined };
  }

  const paddingBefore = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].before || 0;
  const paddingAfter = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].after || 0;
  if (
    !paddingAfter && !paddingBefore ||
    (currentTime - paddingBefore) >= end ||
    (currentTime + paddingAfter) <= start
  ) {
    return { type: "clean-buffer", value: [{ start, end }]};
  }
  if (currentTime - paddingBefore <= start) {
    return {
      type: "clean-buffer",
      value: [{ start: currentTime + paddingAfter, end }],
    };
  }
  if (currentTime + paddingAfter >= end) {
    return {
      type: "clean-buffer",
      value: [{ start, end: currentTime - paddingBefore }],
    };
  }
  return {
    type: "clean-buffer",
    value: [
      { start, end: currentTime - paddingBefore },
      { start: currentTime + paddingAfter, end },
    ],
  };
}
