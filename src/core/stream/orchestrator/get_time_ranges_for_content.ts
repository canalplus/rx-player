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
import type { IRange } from "../../../utils/ranges";
import type { SegmentSink } from "../../segment_sinks";

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
  const accumulator: IRange[] = [];
  const inventory = segmentSink.getLastKnownInventory();

  for (let i = 0; i < inventory.length; i++) {
    const chunk = inventory[i];
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
        log.warn("SO: No buffered start or end found from a segment.");
        return [{ start: 0, end: Number.MAX_VALUE }];
      }

      const previousLastElement = accumulator[accumulator.length - 1];
      if (
        previousLastElement !== undefined &&
        previousLastElement.end === bufferedStart
      ) {
        previousLastElement.end = bufferedEnd;
      } else {
        accumulator.push({ start: bufferedStart, end: bufferedEnd });
      }
    }
  }
  return accumulator;
}
