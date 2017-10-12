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
  le2toi,
  le4toi,
  bytesToStr,
} from "../../utils/bytes";

export interface IBifThumbnail {
  index : number;
  duration : number;
  ts : number;
  data : Uint8Array;
}

export interface IBifObject {
  fileFormat : string;
  version : string;
  imageCount : number;
  timescale : number;
  format : string;
  width : number;
  height : number;
  aspectRatio : string;
  isVod : boolean;
  thumbs : IBifThumbnail[];
}

/**
 * @param {UInt8Array} buf
 * @returns {Object}
 */
function parseBif(buf : Uint8Array) : IBifObject {
  let pos = 0;

  const length = buf.length;
  const fileFormat = bytesToStr(buf.subarray(pos, pos + 8));   pos += 8;

  const minorVersion = buf[pos]; pos += 1;
  const majorVersion = buf[pos]; pos += 1;
  const patchVersion = buf[pos]; pos += 1;
  const increVersion = buf[pos]; pos += 1;

  const version = [minorVersion, majorVersion, patchVersion, increVersion].join(".");

  const imageCount = buf[pos] + le4toi(buf, pos + 1); pos += 4;
  const timescale = le4toi(buf, pos); pos += 4;

  const format = bytesToStr(buf.subarray(pos, pos + 4)); pos += 4;

  const width = le2toi(buf, pos); pos += 2;
  const height = le2toi(buf, pos); pos += 2;

  const aspectRatio = [buf[pos], buf[pos + 1]].join(":"); pos += 2;

  const isVod = buf[pos] === 1; pos += 1;

  // bytes 0x1F to 0x40 is unused data for now
  pos = 0x40;

  const thumbs : IBifThumbnail[] = [];
  let currentImage;
  let currentTs = 0;

  if (!imageCount) {
    throw new Error("bif: no images to parse");
  }

  while (pos < length) {
    const currentImageIndex = le4toi(buf, pos); pos += 4;
    const currentImageOffset = le4toi(buf, pos); pos += 4;

    if (currentImage) {
      const index = currentImage.index;
      const duration = timescale;
      const ts = currentTs;
      const data = buf.subarray(currentImage.offset, currentImageOffset);

      thumbs.push({ index, duration, ts, data });

      currentTs += timescale;
    }

    if (currentImageIndex === 0xffffffff) {
      break;
    }

    currentImage = {
      index: currentImageIndex,
      offset: currentImageOffset,
    };
  }

  return {
    fileFormat,
    version,
    imageCount,
    timescale,
    format,
    width,
    height,
    aspectRatio,
    isVod,
    thumbs,
  };
}

export default parseBif;
