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
import type { IAdaptation, IPeriod } from "../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../playback_observer";
import arrayIncludes from "../../../utils/array_includes";
import type {
  IRange } from "../../../utils/ranges";
import {
  excludeFromRanges,
  insertInto,
} from "../../../utils/ranges";
import type {
  SegmentSink } from "../../segment_sinks";
import {
  getFirstSegmentAfterPeriod,
  getLastSegmentBeforePeriod,
  SegmentSinkOperation,
} from "../../segment_sinks";
import type {
  IRepresentationsChoice,
  IRepresentationStreamPlaybackObservation,
} from "../representation";

export default function getRepresentationsSwitchingStrategy(
  period : IPeriod,
  adaptation : IAdaptation,
  settings : IRepresentationsChoice,
  segmentSink : SegmentSink,
  playbackObserver : IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>
) : IRepresentationSwitchStrategy {
  if (settings.switchingMode === "lazy") {
    return { type: "continue", value: undefined };
  }

  const inventory = segmentSink.getLastKnownInventory();
  const unwantedRange: IRange[] = [];
  for (const elt of inventory) {
    if (
      elt.infos.period.id === period.id && (
        elt.infos.adaptation.id !== adaptation.id ||
        !arrayIncludes(settings.representationIds, elt.infos.representation.id)
      )
    ) {
      insertInto(unwantedRange, { start: elt.bufferedStart ?? elt.start,
                                  end: elt.bufferedEnd ?? elt.end });
    }
  }

  const pendingOperations = segmentSink.getPendingOperations();
  for (const operation of pendingOperations) {
    if (operation.type === SegmentSinkOperation.Push) {
      const info = operation.value.inventoryInfos;
      if (
        info.period.id === period.id && (
          info.adaptation.id !== adaptation.id ||
          !arrayIncludes(settings.representationIds, info.representation.id)
        )
      ) {
        const start = info.segment.time;
        const end = start + info.segment.duration;
        insertInto(unwantedRange, { start, end });
      }
    }
  }

  // Continue if we have no other Adaptation buffered in the current Period
  if (unwantedRange.length === 0) {
    return { type: "continue", value: undefined };
  }

  if (settings.switchingMode === "reload") {
    const readyState = playbackObserver.getReadyState();
    if (readyState === undefined || readyState > 1) {
      return { type: "needs-reload", value: undefined };
    }
  }

  // From here, clean-up data from the previous Adaptation, if one
  const shouldFlush = settings.switchingMode === "direct";

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

  if (!shouldFlush) {
    // exclude data around current position to avoid decoding issues
    const { ADAP_REP_SWITCH_BUFFER_PADDINGS } = config.getCurrent();
    const bufferType = adaptation.type;

    /** Ranges that won't be cleaned from the current buffer. */
    const paddingBefore = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].before ?? 0;
    const paddingAfter = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].after ?? 0;

    let currentTime = playbackObserver.getCurrentTime();
    if (currentTime === undefined) {
      // TODO current position might be old. A better solution should be found.
      const lastObservation = playbackObserver.getReference().getValue();
      currentTime = lastObservation.position.getPolled();
    }

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
         // Close to Period's end
         (firstSegmentAfter.bufferedStart - period.end) < 1))
    {
      rangesToExclude.push({ start: period.end - 1,
                             end: Number.MAX_VALUE });
    }
  }

  const toRemove = excludeFromRanges(unwantedRange, rangesToExclude);

  if (toRemove.length === 0) {
    return { type: "continue", value: undefined };
  }

  return shouldFlush ? { type: "flush-buffer", value: toRemove } :
                       { type: "clean-buffer", value: toRemove };
}

export type IRepresentationSwitchStrategy =
  /** Do nothing special. */
  { type: "continue"; value: undefined } |
  /**
   * Clean the given ranges of time from the buffer, preferably avoiding time
   * around the current position to continue playback smoothly.
   */
  { type: "clean-buffer"; value: Array<{ start: number; end: number }> } |
  /**
   * Clean the given ranges of time from the buffer and try to flush the buffer
   * so that it is taken in account directly.
   */
  { type: "flush-buffer"; value: Array<{ start: number; end: number }> } |
  /** Reload completely the media buffers. */
  { type: "needs-reload"; value: undefined };
