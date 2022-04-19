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

import type { IAdaptation, IPeriod, IRepresentation } from "../../../manifest";
import { SegmentSink } from "../../segment_sinks";

interface IBufferedStream {
  bufferedStart: number;
  bufferedEnd: number;
  streamId: string;
}

/**
 * Get buffered stream between given start and end.
 * @param {Object} sink
 * @param {Object} range
 * @returns {Array.<Object>}
 */
export default function getBufferedStreams(
  sink: SegmentSink,
  range: { start: number; end: number }
): IBufferedStream[] {
  const { start, end } = range;

  // TODO more intelligent for loop
  const bufferedSegments = sink.getLastKnownInventory().filter((s) => {
    return end >= s.start && start <= end;
  });

  return bufferedSegments.reduce((acc: IBufferedStream[], value) => {
    const lastElement = acc[acc.length - 1];
    const { period, adaptation, representation } = value.infos;
    const streamId = getStreamId(period, adaptation, representation);
    if (value.bufferedStart != null && value.bufferedEnd != null) {
      if (lastElement !== undefined && streamId === lastElement.streamId) {
        lastElement.bufferedEnd = value.bufferedEnd;
      } else {
        acc.push({
          bufferedStart: value.bufferedStart,
          bufferedEnd: value.bufferedEnd,
          streamId,
        });
      }
    }
    return acc;
  }, []);
}

/**
 * Get a unique stream ID by concatenating
 * period, adaptation and representation ids.
 *
 * @param {Object} period
 * @param {Object} adaptation
 * @param {Object} representation
 * @return {string} - gen_stream_${periodId}_${adaptationId}_${representationId}
 */
function getStreamId(
  period: IPeriod,
  adaptation: IAdaptation,
  representation: IRepresentation
): string {
  return (
    "gen_stream_" +
    period.id.toString() +
    "_" +
    adaptation.id.toString() +
    "_" +
    representation.id.toString()
  );
}
