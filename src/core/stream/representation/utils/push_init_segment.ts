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

import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../../manifest";
import { CancellationSignal } from "../../../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../../../api";
import {
  IPushedChunkData,
  SegmentBuffer,
} from "../../../segment_buffers";
import {
  IRepresentationStreamPlaybackObservation,
  IStreamEventAddedSegmentPayload,
} from "../types";
import appendSegmentToBuffer from "./append_segment_to_buffer";

/**
 * Push the initialization segment to the SegmentBuffer.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default async function pushInitSegment<T>(
  {
    playbackObserver,
    content,
    segment,
    segmentData,
    segmentBuffer,
  } : {
    playbackObserver : IReadOnlyPlaybackObserver<
      IRepresentationStreamPlaybackObservation
    >;
    content: { adaptation : Adaptation;
               manifest : Manifest;
               period : Period;
               representation : Representation; };
    segmentData : T | null;
    segment : ISegment;
    segmentBuffer : SegmentBuffer;
  },
  cancelSignal : CancellationSignal
) : Promise< IStreamEventAddedSegmentPayload<T> | null > {
  if (segmentData === null) {
    return null;
  }
  if (cancelSignal.cancellationError !== null) {
    throw cancelSignal.cancellationError;
  }
  const codec = content.representation.getMimeTypeString();
  const data : IPushedChunkData<T> = { initSegment: segmentData,
                                       chunk: null,
                                       timestampOffset: 0,
                                       appendWindow: [ undefined, undefined ],
                                       codec };
  await appendSegmentToBuffer(playbackObserver,
                              segmentBuffer,
                              { data, inventoryInfos: null },
                              cancelSignal);
  const buffered = segmentBuffer.getBufferedRanges();
  return { content, segment, buffered, segmentData };
}
