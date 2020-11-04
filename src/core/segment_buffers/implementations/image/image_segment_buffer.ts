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

import {
  defer as observableDefer,
  Observable,
  of as observableOf,
} from "rxjs";
import log from "../../../../log";
import { IBifThumbnail } from "../../../../parsers/images/bif";
import {
  IEndOfSegmentInfos,
  IPushChunkInfos,
  SegmentBuffer,
} from "../types";
import ManualTimeRanges from "../utils/manual_time_ranges";

/** Format of the data pushed to the `ImageSegmentBuffer`. */
export interface IImageTrackSegmentData {
  /** Image track data, in the given type */
  data : IBifThumbnail[];
  /** The type of the data (example: "bif") */
  type : string;
  /** End time time until which the segment apply */
  end : number;
  /** Start time from which the segment apply */
  start : number;
  /** Timescale to convert the start and end into seconds */
  timescale : number;
}

/**
 * Image SegmentBuffer implementation.
 * @class ImageSegmentBuffer
 */
export default class ImageSegmentBuffer
                 extends SegmentBuffer<IImageTrackSegmentData> {
  public readonly bufferType : "image";
  private _buffered : ManualTimeRanges;

  constructor() {
    log.debug("ISB: Creating ImageSegmentBuffer");
    super();
    this.bufferType = "image";
    this._buffered = new ManualTimeRanges();
  }

  /**
   * @param {Object} data
   */
  public pushChunk(
    infos : IPushChunkInfos<IImageTrackSegmentData>
  ) : Observable<void> {
    return observableDefer(() => {
      log.debug("ISB: appending new data.");
      if (infos.data.chunk === null) {
        return observableOf(undefined);
      }
      const { appendWindow,
              chunk } = infos.data;
      const { start, end, timescale } = chunk;
      const appendWindowStart = appendWindow[0] ?? 0;
      const appendWindowEnd = appendWindow[1] ?? Infinity;

      const timescaledStart = start / timescale;
      const timescaledEnd = end == null ? Number.MAX_VALUE :
                                          end / timescale;

      const startTime = Math.max(appendWindowStart, timescaledStart);
      const endTime = Math.min(appendWindowEnd, timescaledEnd);

      this._buffered.insert(startTime, endTime);
      if (infos.inventoryInfos !== null) {
        this._segmentInventory.insertChunk(infos.inventoryInfos);
      }
      return observableOf(undefined);
    });
  }

  /**
   * @param {Number} from
   * @param {Number} to
   */
  public removeBuffer(start : number, end : number) : Observable<void> {
    return observableDefer(() => {
      log.info("ISB: ignored image data remove order", start, end);

      // Logic removed as it caused more problems than it resolved:
      // Image thumbnails are always downloaded as a single BIF file, meaning that
      // any removing might necessitate to re-load the whole file in the future
      // which seems pointless.
      // In any case, image handling through the regular RxPlayer APIs has been
      // completely deprecated now for several reasons, and should disappear in
      // the next major version.
      return observableOf(undefined);
    });
  }

  /**
   * Indicate that every chunks from a Segment has been given to pushChunk so
   * far.
   * This will update our internal Segment inventory accordingly.
   * The returned Observable will emit and complete successively once the whole
   * segment has been pushed and this indication is acknowledged.
   * @param {Object} infos
   * @returns {Observable}
   */
  public endOfSegment(_infos : IEndOfSegmentInfos) : Observable<void> {
    return observableDefer(() => {
      this._segmentInventory.completeSegment(_infos);
      return observableOf(undefined);
    });
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBufferedRanges() : ManualTimeRanges {
    return this._buffered;
  }

  public dispose() : void {
    log.debug("ISB: disposing image SegmentBuffer");
    this._buffered.remove(0, Infinity);
  }
}
