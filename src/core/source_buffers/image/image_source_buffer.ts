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

/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import log from "../../../log";
import { IBifThumbnail } from "../../../parsers/images/bif";
import AbstractSourceBuffer from "../abstract_source_buffer";

export interface IImageTrackSegmentData {
  data : IBifThumbnail[]; // image track data, in the given type
  end : number; // end time time until which the segment apply
  start : number; // start time from which the segment apply
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (example: "bif")
}

/**
 * Image SourceBuffer implementation.
 * @class ImageSourceBuffer
 */
class ImageSourceBuffer
      extends AbstractSourceBuffer<IImageTrackSegmentData>
{
  /**
   * @param {Object} data
   */
  _append(data : IImageTrackSegmentData) {
    log.debug("ImageSourceBuffer: appending new data.");
    const { start, end, timescale } = data;

    const timescaledStart = start / timescale;
    const timescaledEnd = end == null ? Number.MAX_VALUE :
                                        end / timescale;

    const startTime = Math.max(this.appendWindowStart, timescaledStart);
    const endTime = Math.min(this.appendWindowEnd, timescaledEnd);

    this.buffered.insert(startTime, endTime);
  }

  /**
   * @param {Number} from
   * @param {Number} to
   */
  _remove(from : number, to : number) : void {
    log.info("ImageSourceBuffer: ignored image data remove order", from, to);

    // TODO once a better strategy for image cleaning has been set (surely done
    // when we will work for live thumbnails), restore this implementation.
    // log.debug("ImageSourceBuffer: removing image data", from, to);
    // this.buffered.remove(from, to);
  }

  _abort() {
    log.debug("ImageSourceBuffer: aborting image SourceBuffer");
    this._remove(0, Infinity);
  }
}

export default ImageSourceBuffer;
