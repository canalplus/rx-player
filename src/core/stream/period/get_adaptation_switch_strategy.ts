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
  Period,
} from "../../../manifest";
import areCodecsCompatible from "../../../utils/are_codecs_compatible";
import {
  convertToRanges,
  excludeFromRanges,
  IRange,
  isTimeInRange,
  isTimeInRanges,
  keepRangeIntersection,
} from "../../../utils/ranges";
import {
  getFirstSegmentAfterPeriod,
  getLastSegmentBeforePeriod,
  IBufferedChunk,
  SegmentBuffer,
} from "../../segment_buffers";
import { ITrackSwitchingMode } from "../types";


export type IAdaptationSwitchStrategy =
  { type: "continue"; value: undefined } |
  { type: "clean-buffer"; value: Array<{ start: number; end: number }> } |
  { type: "flush-buffer"; value: Array<{ start: number; end: number }> } |
  { type: "needs-reload"; value: undefined };

export interface IAdaptationSwitchOptions {
  /** Behavior when a new video and/or audio codec is encountered. */
  onCodecSwitch : "continue" | "reload";
}

/**
 * Find out what to do when switching Adaptation, based on the current
 * situation.
 * @param {Object} segmentBuffer
 * @param {Object} period
 * @param {Object} adaptation
 * @param {Object} playbackInfo
 * @returns {Object}
 */
export default function getAdaptationSwitchStrategy(
  segmentBuffer : SegmentBuffer,
  period : Period,
  adaptation : Adaptation,
  switchingMode : ITrackSwitchingMode,
  playbackInfo : { currentTime : number; readyState : number },
  options : IAdaptationSwitchOptions
) : IAdaptationSwitchStrategy {
  if (segmentBuffer.codec !== undefined &&
      options.onCodecSwitch === "reload" &&
      !hasCompatibleCodec(adaptation, segmentBuffer.codec))
  {
    return { type: "needs-reload", value: undefined };
  }

  const buffered = segmentBuffer.getBufferedRanges();
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

  segmentBuffer.synchronizeInventory();
  const inventory = segmentBuffer.getInventory();

  // Continue if we have no other Adaptation buffered in the current Period
  if (!inventory.some(buf => buf.infos.period.id === period.id &&
                             buf.infos.adaptation.id !== adaptation.id))
  {
    return { type: "continue", value: undefined };
  }

  /** Data already in the right Adaptation */
  const adaptationInBuffer =
    getBufferedRangesFromAdaptation(inventory, period, adaptation);

  /**
   * Data different from the wanted Adaptation in the Period's range.
   * /!\ Could contain some data at the end of the previous Period or at the
   * beginning of the next one.
   */
  const unwantedRange = excludeFromRanges(intersection, adaptationInBuffer);

  if (unwantedRange.length === 0) {
    return { type: "continue", value: undefined };
  }

  const { currentTime } = playbackInfo;
  if (switchingMode === "reload" &&
      // We're playing the current Period
      isTimeInRange({ start, end }, currentTime) &&
      // There is data for the current position or the codecs are differents
      (playbackInfo.readyState > 1 || !adaptation.getPlayableRepresentations()
        .some(rep =>
          areCodecsCompatible(rep.getMimeTypeString(), segmentBuffer.codec ?? ""))) &&
      // We're not playing the current wanted video Adaptation
      !isTimeInRanges(adaptationInBuffer, currentTime))
  {
    return { type: "needs-reload", value: undefined };
  }

  // From here, clean-up data from the previous Adaptation, if one

  const shouldCleanAll = switchingMode === "direct";

  const rangesToExclude = [];

  // First, we don't want to accidentally remove some segments from the previous
  // Period (which overlap a little with this one)

  /** Last segment before one for the current period. */
  const lastSegmentBefore = getLastSegmentBeforePeriod(inventory, period);
  if (lastSegmentBefore !== null &&
    (lastSegmentBefore.bufferedEnd === undefined ||
      period.start - lastSegmentBefore.bufferedEnd < 1)) // Close to Period's start
  {
    // Exclude data close to the period's start to avoid cleaning
    // to much
    rangesToExclude.push({ start: 0,
                           end: period.start + 1 });
  }

  // Next, exclude data around current position to avoid decoding issues
  const bufferType = adaptation.type;
  const { ADAP_REP_SWITCH_BUFFER_PADDINGS } = config.getCurrent();

  /** Ranges that won't be cleaned from the current buffer. */
  let paddingBefore = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].before;
  if (paddingBefore == null) {
    paddingBefore = 0;
  }
  let paddingAfter = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].after;
  if (paddingAfter == null) {
    paddingAfter = 0;
  }

  if (!shouldCleanAll) {
    rangesToExclude.push({ start: currentTime - paddingBefore,
                           end: currentTime + paddingAfter });
  }

  // Now remove possible small range from the end if there is a segment from the
  // next Period
  if (period.end !== undefined) {
    /** first segment after for the current period. */
    const firstSegmentAfter = getFirstSegmentAfterPeriod(inventory, period);
    if (firstSegmentAfter !== null &&
        (firstSegmentAfter.bufferedStart === undefined ||
         (firstSegmentAfter.bufferedStart - period.end) < 1)) // Close to Period's end
    {
      rangesToExclude.push({ start: period.end - 1,
                             end: Number.MAX_VALUE });
    }
  }

  const toRemove = excludeFromRanges(unwantedRange, rangesToExclude);

  if (toRemove.length === 0) {
    return { type: "continue", value: undefined };
  }

  return shouldCleanAll && adaptation.type !== "text" ?
    { type: "flush-buffer", value: toRemove } :
    { type: "clean-buffer", value: toRemove };
}

/**
 * Returns `true` if at least one codec of the Representations in the given
 * Adaptation has a codec compatible with the given SegmentBuffer's codec.
 * @param {Object} adaptation
 * @param {string} segmentBufferCodec
 * @returns {boolean}
 */
function hasCompatibleCodec(
  adaptation : Adaptation,
  segmentBufferCodec : string
) : boolean {
  return adaptation.getPlayableRepresentations().some(rep =>
    areCodecsCompatible(rep.getMimeTypeString(), segmentBufferCodec));
}

/**
 * Returns buffered ranges of what we know correspond to the given `adaptation`
 * in the SegmentBuffer.
 * @param {Object} segmentBuffer
 * @param {Object} period
 * @param {Object} adaptation
 * @returns {Array.<Object>}
 */
function getBufferedRangesFromAdaptation(
  inventory : IBufferedChunk[],
  period : Period,
  adaptation : Adaptation
) : IRange[] {
  return inventory.reduce<IRange[]>((acc : IRange[], chunk) : IRange[] => {
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
