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
  createBox,
  createBoxWithChildren,
} from "../../../parsers/containers/isobmff";
import { concat } from "../../../utils/byte_parsing";
import {
  createDREFBox,
  createFTYPBox,
  createHDLRBox,
  createMDHDBox,
  createMVHDBox,
  createTKHDBox,
  createTREXBox,
} from "./create_boxes";

export type IPSSList = Array<{
  systemId : string;
  privateData? : Uint8Array;
  keyIds? : Uint8Array;
}>;

/**
 * @param {Uint8Array} mvhd
 * @param {Uint8Array} mvex
 * @param {Uint8Array} trak
 * @returns {Array.<Uint8Array>}
 */
function createMOOVBox(
  mvhd : Uint8Array,
  mvex : Uint8Array,
  trak : Uint8Array
) : Uint8Array {
  const children = [mvhd, mvex, trak];
  return createBoxWithChildren("moov", children);
}

/**
 * Create an initialization segment with the information given.
 * @param {Number} timescale
 * @param {string} type
 * @param {Uint8Array} stsd
 * @param {Uint8Array} mhd
 * @param {Number} width
 * @param {Number} height
 * @param {Array.<Object>} pssList - List of dict, example:
 * {systemId: "DEADBEEF", codecPrivateData: "DEAFBEEF}
 * @returns {Uint8Array}
 */
export default function createInitSegment(
  timescale : number,
  type : "audio"|"video",
  stsd : Uint8Array,
  mhd : Uint8Array,
  width : number,
  height : number
) : Uint8Array {

  const stbl = createBoxWithChildren("stbl", [
    stsd,
    createBox("stts", new Uint8Array(0x08)),
    createBox("stsc", new Uint8Array(0x08)),
    createBox("stsz", new Uint8Array(0x0C)),
    createBox("stco", new Uint8Array(0x08)),
  ]);

  const url  = createBox("url ", new Uint8Array([0, 0, 0, 1]));
  const dref = createDREFBox(url);
  const dinf = createBoxWithChildren("dinf", [dref]);
  const minf = createBoxWithChildren("minf", [mhd, dinf, stbl]);
  const hdlr = createHDLRBox(type);
  const mdhd = createMDHDBox(timescale); // this one is really important
  const mdia = createBoxWithChildren("mdia", [mdhd, hdlr, minf]);
  const tkhd = createTKHDBox(width, height, 1);
  const trak = createBoxWithChildren("trak", [tkhd, mdia]);
  const trex = createTREXBox(1);
  const mvex = createBoxWithChildren("mvex", [trex]);
  const mvhd = createMVHDBox(timescale, 1); // in fact, we don't give a sh** about
                                            // this value :O

  const moov = createMOOVBox(mvhd, mvex, trak);
  const ftyp = createFTYPBox("isom", ["isom", "iso2", "iso6", "avc1", "dash"]);

  return concat(ftyp, moov);
}
