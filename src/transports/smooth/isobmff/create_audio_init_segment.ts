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

import { createBoxWithChildren } from "../../../parsers/containers/isobmff";
import {
  createENCABox,
  createESDSBox,
  createFRMABox,
  createMP4ABox,
  createSCHMBox,
  createSMHDBox,
  createSTSDBox,
  createTENCBox,
} from "./create_boxes";
import createInitSegment from "./create_init_segment";
import getAacesHeader from "./get_aaces_header";

/**
 * Return full audio initialization segment as Uint8Array.
 * @param {Number} timescale
 * @param {Number} channelsCount
 * @param {Number} sampleSize
 * @param {Number} packetSize
 * @param {Number} sampleRate
 * @param {string} codecPrivateData
 * @param {Uint8Array} keyId - hex string representing the key Id, 32 chars.
 * eg. a800dbed49c12c4cb8e0b25643844b9b
 * @param {Array.<Object>} [pssList]
 * @returns {Uint8Array}
 */
export default function createAudioInitSegment(
  timescale : number,
  channelsCount : number,
  sampleSize : number,
  packetSize : number,
  sampleRate : number,
  codecPrivateData : string,
  keyId? : Uint8Array
) : Uint8Array {
  const _codecPrivateData = codecPrivateData.length === 0 ?
    getAacesHeader(2, sampleRate, channelsCount) :
    codecPrivateData;

  const esds = createESDSBox(1, _codecPrivateData);
  const stsd : Uint8Array = (() => {
    if (keyId === undefined) {
      const mp4a = createMP4ABox(1,
                                 channelsCount,
                                 sampleSize,
                                 packetSize,
                                 sampleRate,
                                 esds);
      return createSTSDBox([mp4a]);
    }
    const tenc = createTENCBox(1, 8, keyId);
    const schi = createBoxWithChildren("schi", [tenc]);
    const schm = createSCHMBox("cenc", 65536);
    const frma = createFRMABox("mp4a");
    const sinf = createBoxWithChildren("sinf", [frma, schm, schi]);
    const enca = createENCABox(1,
                               channelsCount,
                               sampleSize,
                               packetSize,
                               sampleRate,
                               esds,
                               sinf);
    return createSTSDBox([enca]);
  })();

  return createInitSegment(timescale, "audio", stsd, createSMHDBox(), 0, 0);
}
