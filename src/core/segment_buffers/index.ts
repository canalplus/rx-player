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
import type {
  IBufferType,
  IEndOfSegmentInfos,
  IEndOfSegmentOperation,
  IPushChunkInfos,
  IPushedChunkData,
  IPushOperation,
  IRemoveOperation,
  ISBOperation,
} from "./implementations";
import { SegmentBuffer, SegmentBufferOperation } from "./implementations";
import type { IBufferedChunk, IChunkContext, IInsertedChunkInfos } from "./inventory";
import { ChunkStatus } from "./inventory";
import type {
  ISegmentBufferOptions,
  ITextTrackSegmentBufferOptions,
} from "./segment_buffers_store";
import SegmentBuffersStore from "./segment_buffers_store";

export default SegmentBuffersStore;
export type {
  ISegmentBufferOptions,
  ITextTrackSegmentBufferOptions,
  IBufferType,
  IBufferedChunk,
  IChunkContext,
  IInsertedChunkInfos,
  IPushChunkInfos,
  IPushedChunkData,
  IEndOfSegmentInfos,
  ISBOperation,
  IEndOfSegmentOperation,
  IPushOperation,
  IRemoveOperation,
};
export { BufferGarbageCollector, ChunkStatus, SegmentBuffer, SegmentBufferOperation };
