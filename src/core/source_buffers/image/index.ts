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

import { IBifThumbnail } from "../../../parsers/images/bif";
import AbstractSourceBuffer from "../abstract_source_buffer";

export interface IImageTrackSegmentData {
  data : IBifThumbnail[]; // image track data, in the given type
  end : number; // end time time until which the segment apply
  start : number; // start time from which the segment apply
  timeOffset : number; // time offset, in seconds, to add to each image
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (example: "bif")
}

// TODO
class ImageSourceBuffer
  extends AbstractSourceBuffer<IImageTrackSegmentData>
{
  /**
   * @param {Object} data
   */
  _append(data : IImageTrackSegmentData) {
    const {
      start,
      end,
      timescale,
    } = data;

    this.buffered.insert(
      start / timescale,
      end == null ? Number.MAX_VALUE : end / timescale
    );
  }

  // TODO
  /* tslint:disable no-empty */
  _remove() {}
  /* tslint:enable no-empty */

  // TODO
  /* tslint:disable no-empty */
  _abort() {}
  /* tslint:enable no-empty */
}

export default ImageSourceBuffer;
