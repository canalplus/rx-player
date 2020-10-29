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

import BufferGarbageCollector from "./garbage_collector";
import {
  IBufferType,
  IEndOfSegmentInfos,
  IEndOfSegmentOperation,
  IPushChunkInfos,
  IPushedChunkData,
  IPushOperation,
  IRemoveOperation,
  ISBOperation,
  ISegmentBuffer,
  SegmentBufferOperation,
} from "./implementations";
import SegmentBuffersStore, {
  ISegmentBufferOptions,
  ITextTrackSegmentBufferOptions,
} from "./segment_buffers_store";
import { IBufferedChunk } from "./segment_inventory";

export default SegmentBuffersStore;
export {
  BufferGarbageCollector,

  ISegmentBufferOptions,
  ITextTrackSegmentBufferOptions,

  ISegmentBuffer,

  IBufferType,
  IBufferedChunk,

  IPushChunkInfos,
  IPushedChunkData,

  IEndOfSegmentInfos,

  SegmentBufferOperation,
  ISBOperation,
  IEndOfSegmentOperation,
  IPushOperation,
  IRemoveOperation,
};
