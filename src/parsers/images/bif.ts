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

import {
  bytesToStr,
  le2toi,
  le4toi,
} from "../../utils/byte_parsing";

export interface IBifThumbnail { index : number;
                                 duration : number;
                                 ts : number;
                                 data : Uint8Array; }

export interface IBifObject { fileFormat : string;
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
  if (fileFormat !== "\u0089BIF\r\n\u001a\n") {
    throw new Error("Invalid BIF file");
  }

  const minorVersion = buf[pos]; pos += 1;
  const majorVersion = buf[pos]; pos += 1;
  const patchVersion = buf[pos]; pos += 1;
  const increVersion = buf[pos]; pos += 1;

  const version = [minorVersion, majorVersion, patchVersion, increVersion].join(".");

  if (majorVersion > 0) {
    throw new Error(`Unhandled version: ${majorVersion}`);
  }

  const imageCount = le4toi(buf, pos); pos += 4;
  const framewiseSeparation = le4toi(buf, pos); pos += 4;

  const format = bytesToStr(buf.subarray(pos, pos + 4)); pos += 4;

  const width = le2toi(buf, pos); pos += 2;
  const height = le2toi(buf, pos); pos += 2;

  const aspectRatio = [buf[pos], buf[pos + 1]].join(":"); pos += 2;

  const isVod = buf[pos] === 1; pos += 1;

  // bytes 0x1F to 0x40 is unused data for now
  pos = 0x40;

  const thumbs : IBifThumbnail[] = [];

  if (imageCount === 0) {
    throw new Error("bif: no images to parse");
  }

  let index = 0;
  let previousImageInfo = null;
  while (pos < length) {
    const currentImageTimestamp = le4toi(buf, pos); pos += 4;
    const currentImageOffset = le4toi(buf, pos); pos += 4;

    if (previousImageInfo !== null) {
      // calculate for index-1
      const ts = previousImageInfo.timestamp * framewiseSeparation;
      const duration = framewiseSeparation;
      const data = buf.slice(previousImageInfo.offset, currentImageOffset);

      thumbs.push({ index, duration, ts, data });

      index++;
    }

    if (currentImageTimestamp === 0xFFFFFFFF) {
      break;
    }

    previousImageInfo = { timestamp: currentImageTimestamp,
                          offset: currentImageOffset };
  }

  return { fileFormat: "BIF",
           version,
           imageCount,
           timescale: 1000,
           format,
           width,
           height,
           aspectRatio,
           isVod,
           thumbs };
}

export default parseBif;
