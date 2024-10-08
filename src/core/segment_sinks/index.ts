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
  ICompleteSegmentInfo,
  ISignalCompleteSegmentOperation,
  IPushChunkInfos,
  IPushedChunkData,
  IPushOperation,
  IRemoveOperation,
  ISBOperation,
  ITextDisplayerInterface,
} from "./implementations";
import { SegmentSink, SegmentSinkOperation } from "./implementations";
import type {
  IBufferedHistoryEntry,
  IBufferedChunk,
  IChunkContext,
  IInsertedChunkInfos,
} from "./inventory";
import {
  ChunkStatus,
  getFirstSegmentAfterPeriod,
  getLastSegmentBeforePeriod,
} from "./inventory";
import SegmentSinksStore from "./segment_sinks_store";

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
