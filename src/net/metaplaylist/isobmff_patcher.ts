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
  be4toi,
  be8toi,
  bytesToStr,
  concat,
  itobe4,
  itobe8,
  strToBytes,
} from "../../utils/bytes";

/**
 * Create a new _Atom_ (isobmff box).
 * @param {string} name - The box name (e.g. sidx, moov, pssh etc.)
 * @param {Uint8Array} buff - The box's content
 */
function Atom(name : string, buff : Uint8Array) : Uint8Array {
  const len = buff.length + 8;
  return concat(itobe4(len), strToBytes(name), buff);
}

export default function patchSegmentWithTimeOffset(
      _data: Uint8Array,
      _offset: number,
      _lmsg?: boolean
  ) {
      let sizeChange = 0;
      const segmentData = _data;
      const topLevelBoxesToParse = ["moov", "styp", "sidx", "moof", "mdat"];
      const compositeBoxesToParse = ["trak", "moov", "moof", "traf"];
      const timeOffset = _offset;
      const lmsg = _lmsg || false;

  /**
   * Get size and boxtype from current box
   * @param {Uint8Array} data
   */
  function getBoxInfos(boxData: Uint8Array) {
    const size = be4toi(boxData, 0);
    const boxtype = bytesToStr(boxData.subarray(4, 8));
    return {
      size,
      boxtype,
    };
  }

  /**
   * Triggers box processing
   */
  function patchBoxes() {
    let output = new Uint8Array(0);
    let pos = 0;
    while (pos < segmentData.length) {
      const { size, boxtype } = getBoxInfos(segmentData.subarray(pos, pos + 8));
      const boxdata = segmentData.subarray(pos, pos + size);
      const concatData = (topLevelBoxesToParse
        .indexOf(boxtype) >= 0) ?
          patchBox(boxtype, boxdata, output.length) :
          boxdata;
      output = concat(output, concatData);
      pos += size;
    }
    return output;
  }

  /**
   * Process specific box and its children
   * @param {string} boxtype
   * @param {Uint8Array} data
   * @param {number} filePos
   * @param {string} _path
   */
  function patchBox(
    boxtype: string,
    boxSpecificData: Uint8Array,
    filePos: number,
    _path?: string
  ): Uint8Array {
    let output = new Uint8Array(0);
    const path = _path ? (_path + "." + boxtype) : boxtype;
    if (compositeBoxesToParse.indexOf(boxtype) >= 0) {
      output = boxSpecificData.subarray(0, 8);
      let pos = 8;
      while (pos < boxSpecificData.length) {
        const {
          size: childSize,
          boxtype: childBoxType,
        } = getBoxInfos(boxSpecificData.subarray(pos, pos + 8));
        const outputChildBox =
          patchBox(
            childBoxType,
            boxSpecificData.subarray(pos, pos + childSize),
            filePos + pos,
            path
          );
        output = concat(output, outputChildBox);
        pos += childSize;
      }
      if (output.length !== boxSpecificData.length) {
        output = concat(itobe4(output.length), output.subarray(4, output.length));
      }
    } else {
      switch (boxtype) {
        case "styp":
          output = patchStyp(boxSpecificData);
          break;
        case "trun":
          output = patchTrun(boxSpecificData);
          break;
        case "tfdt":
          output = patchTfdt(boxSpecificData);
          break;
        default:
          output = boxSpecificData;
          break;
      }
    }
    return output;
  }

  /**
   * Process styp and make sure lmsg presence follows the lmsg flag parameter.
   * @param {Uint8Array} input
   * @return {Uint8Array} patched box
   */
  function patchStyp(input: Uint8Array): Uint8Array {
    const size = be4toi(input, 0);
    let pos = 8;
    const brands = [];
    while (pos < size) {
        const brand = input.subarray(pos, pos + 4);
        if (bytesToStr(brand) !== "lmsg") {
            brands.push(brand);
        }
        pos += 4;
    }
    if (lmsg) {
      brands.push(strToBytes("lmsg"));
    }
    const dataSize = brands.length * 4;
    const stypData = new Uint8Array(dataSize);
    for (let i = 0; i < brands.length; i++) {
      stypData.set(brands[i], i * 4);
    }
    return Atom("styp", stypData);
  }

  function patchTrun(input: Uint8Array): Uint8Array {
    const flags = be4toi(input, 8) & 0xFFFFFF;
    let dataOffsetPresent = false;
    // Data offset present
    if (flags & 0x1) {
      dataOffsetPresent = true;
    }
    // Modify data_offset
    let output = input.subarray(0, 16);
    if (dataOffsetPresent && sizeChange > 0) {
      let trunOffset = be4toi(input, 16);
      trunOffset += sizeChange;
      output = concat(output, itobe4(trunOffset)); // func
    }
    else {
      output = concat(output, input.subarray(16, 20));
    }
    output = concat(output, input.subarray(20, input.length));
    return output;
  }

  /**
   * Generate new timestamps for tfdt and change size of boxes above if needed.
   * Try to keep in 32 bits if possible.
   * @param input
   */
  function patchTfdt(input: Uint8Array): Uint8Array {
    const version = input[8];
    const tfdtOffset = timeOffset;
    let newBaseMediaDecodeTime;
    let output = new Uint8Array(0);
    // 32-bit baseMediaDecodeTime
    if (version === 0) {
      const baseMediaDecodeTime = be4toi(input, 12);
      newBaseMediaDecodeTime = baseMediaDecodeTime + tfdtOffset;
      if (newBaseMediaDecodeTime < 4294967296) {
        output = concat(input.subarray(0, 12), itobe4(newBaseMediaDecodeTime));
      } else {
        // Forced to change to 64-bit tfdt.
        sizeChange = 4;
        output = concat(
          itobe4(be4toi(input, 0) + sizeChange),
          input.subarray(4, 8),
          new Uint8Array([1]),
          input.subarray(9, 12),
          itobe8(newBaseMediaDecodeTime)
        );
      }
    } else { // 64-bit
      const baseMediaDecodeTime = be8toi(input, 12);
      newBaseMediaDecodeTime = baseMediaDecodeTime + tfdtOffset;
      output = concat(input.subarray(0, 12), itobe8(newBaseMediaDecodeTime));
    }
    return output;
  }

    return patchBoxes();
  }
