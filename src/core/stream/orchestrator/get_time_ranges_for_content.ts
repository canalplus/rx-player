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

import log from "../../../log";
import type {
  IAdaptationMetadata,
  IPeriodMetadata,
  IRepresentationMetadata,
} from "../../../manifest";
import { insertInto, type IRange } from "../../../utils/ranges";
import { SegmentSinkOperation, type SegmentSink } from "../../segment_sinks";

/**
 * Returns the buffered ranges which hold the given content.
 * Returns the whole buffered ranges if some of it is unknown.
 * @param {Object} segmentSink
 * @param {Array.<Object>} contents
 * @returns {Array.<Object>}
 */
export default function getTimeRangesForContent(
  segmentSink: SegmentSink,
  contents: Array<{
    adaptation: IAdaptationMetadata;
    period: IPeriodMetadata;
    representation: IRepresentationMetadata;
  }>,
): IRange[] {
  if (contents.length === 0) {
    return [];
  }
  const ranges: IRange[] = [];
  const inventory = segmentSink.getLastKnownInventory();

  const pendingOperations = segmentSink.getPendingOperations();

  for (const chunk of inventory) {
    const hasContent = contents.some((content) => {
      return (
        chunk.infos.period.id === content.period.id &&
        chunk.infos.adaptation.id === content.adaptation.id &&
        chunk.infos.representation.id === content.representation.id
      );
    });
    if (hasContent) {
      const { bufferedStart, bufferedEnd } = chunk;
      if (bufferedStart === undefined || bufferedEnd === undefined) {
        log.warn("Stream", "No buffered start or end found from a segment.", {
          bufferType: chunk.infos.adaptation.type,
          segmentStart: chunk.infos.segment.time,
        });
        return [{ start: 0, end: Number.MAX_VALUE }];
      }

      const previousLastElement = ranges[ranges.length - 1];
      if (
        previousLastElement !== undefined &&
        previousLastElement.end === bufferedStart
      ) {
        previousLastElement.end = bufferedEnd;
      } else {
        ranges.push({ start: bufferedStart, end: bufferedEnd });
      }
    }
  }

  for (const operation of pendingOperations) {
    if (operation.type !== SegmentSinkOperation.Push) {
      continue;
    }
    const pushInfo = operation.value;
    const hasContent = contents.some((content) => {
      return (
        pushInfo.inventoryInfos.period.id === content.period.id &&
        pushInfo.inventoryInfos.adaptation.id === content.adaptation.id &&
        pushInfo.inventoryInfos.representation.id === content.representation.id
      );
    });
    if (hasContent) {
      insertInto(ranges, {
        start: pushInfo.inventoryInfos.start,
        end: pushInfo.inventoryInfos.end,
      });
    }
  }
  return ranges;
}
