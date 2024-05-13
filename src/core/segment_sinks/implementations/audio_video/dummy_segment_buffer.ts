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

import type { IRange } from "../../../../utils/ranges";
import type {
  IBufferType,
  ICompleteSegmentInfo,
  IPushChunkInfos,
  ISBOperation,
} from "../types";
import { SegmentSink } from "../types";

/**
 * Allows to push and remove new segments to a SourceBuffer while keeping an
 * inventory of what has been pushed and what is being pushed.
 *
 * To work correctly, only a single AudioVideoSegmentSink per SourceBuffer
 * should be created.
 *
 * @class DummySegmentSink
 */
export default class DummySegmentSink extends SegmentSink {
  /** "Type" of the buffer concerned. */
  public readonly bufferType: IBufferType;

  /** SourceBuffer implementation. */

  /**
   * @constructor
   * @param {string} bufferType
   * @param {string} codec
   */
  constructor(bufferType: IBufferType, codec: string) {
    super();
    this.bufferType = bufferType;
    this.codec = codec;
  }

  /** @see SegmentSink */
  public declareInitSegment(_uniqueId: string, _initSegmentData: unknown): void {
    return;
  }

  /** @see SegmentSink */
  public freeInitSegment(_uniqueId: string): void {
    return;
  }

  /**
   * Push a chunk of the media segment given to the attached SourceBuffer.
   *
   * @param {Object} _infos
   * @returns {Promise}
   */
  public async pushChunk(_infos: IPushChunkInfos<unknown>): Promise<IRange[]> {
    return new Promise(() => []);
  }

  /** @see SegmentSink */
  public async removeBuffer(_start: number, _end: number): Promise<IRange[]> {
    return new Promise(() => []);
  }

  /**
   * Indicate that every chunks from a Segment has been given to pushChunk so
   * far.
   * This will update our internal Segment inventory accordingly.
   * The returned Promise will resolve once the whole segment has been pushed
   * and this indication is acknowledged.
   * @param {Object} infos
   * @returns {Promise}
   */
  public async signalSegmentComplete(_infos: ICompleteSegmentInfo): Promise<void> {
    return new Promise(() => {
      //
    });
  }

  /**
   * Returns the list of every operations that the `AudioVideoSegmentSink` is
   * still processing.
   * @returns {Array.<Object>}
   */
  public getPendingOperations(): Array<ISBOperation<unknown>> {
    return [];
  }

  /** @see SegmentSink */
  public dispose(): void {
    //
  }
}
