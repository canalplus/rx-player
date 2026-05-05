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

import BufferGarbageCollector from "./garbage_collector.ts";
import type {
  IBufferType,
  ICompleteSegmentInfo,
  ISignalCompleteSegmentOperation,
  IPushChunkInfos,
  IPushedChunkData,
  IPushOperation,
  IRemoveOperation,
  ISBOperation,
  ITextDisplayerInterface,
} from "./implementations/index.ts";
import { SegmentSink, SegmentSinkOperation } from "./implementations/index.ts";
import type {
  IBufferedHistoryEntry,
  IBufferedChunk,
  IChunkContext,
  IInsertedChunkInfos,
} from "./inventory/index.ts";
import {
  ChunkStatus,
  getFirstSegmentAfterPeriod,
  getLastSegmentBeforePeriod,
} from "./inventory/index.ts";
import SegmentSinksStore from "./segment_sinks_store.ts";

export default SegmentSinksStore;
export type {
  IBufferType,
  IBufferedChunk,
  IBufferedHistoryEntry,
  IChunkContext,
  IInsertedChunkInfos,
  IPushChunkInfos,
  IPushedChunkData,
  ICompleteSegmentInfo,
  ISBOperation,
  ISignalCompleteSegmentOperation,
  IPushOperation,
  IRemoveOperation,
  ITextDisplayerInterface,
};
export {
  BufferGarbageCollector,
  ChunkStatus,
  SegmentSink,
  SegmentSinkOperation,
  getFirstSegmentAfterPeriod,
  getLastSegmentBeforePeriod,
};
