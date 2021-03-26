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

import { createBox } from "../../../parsers/containers/isobmff";
import {
  be2toi,
  be4toi,
  concat,
  itobe2,
  itobe4,
  itobe8,
} from "../../../utils/byte_parsing";
import {
  hexToBytes,
  strToUtf8,
} from "../../../utils/string_parsing";

/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} hRes - horizontal resolution, eg 72
 * @param {Number} vRes - vertical resolution, eg 72
 * @param {string} encDepth
 * @param {Number} colorDepth - eg 24
 * @param {Uint8Array} avcc - Uint8Array representing the avcC atom
 * @returns {Uint8Array}
 */
function createAVC1Box(
  width : number,
  height : number,
  hRes : number,
  vRes : number,
  encName : string,
  colorDepth : number,
  avcc : Uint8Array
) : Uint8Array {
  return createBox("avc1", concat(
    6,                       // 6 bytes reserved
    itobe2(1), 16,           // drefIdx + QuickTime reserved, zeroes
    itobe2(width),           // size 2 w
    itobe2(height),          // size 2 h
    itobe2(hRes), 2,         // reso 4 h
    itobe2(vRes), 2 + 4,     // reso 4 v + QuickTime reserved, zeroes
    [0, 1, encName.length],  // frame count (default 1)
    strToUtf8(encName),      // 1byte len + encoder name str
    (31 - encName.length),   // + padding
    itobe2(colorDepth),      // color depth
    [0xFF, 0xFF],            // reserved ones
    avcc                     // avcc atom,
  ));
}

/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} hRes - horizontal resolution, eg 72
 * @param {Number} vRes - vertical resolution, eg 72
 * @param {string} encDepth
 * @param {Number} colorDepth - eg 24
 * @param {Uint8Array} avcc - Uint8Array representing the avcC atom
 * @param {Uint8Array} sinf - Uint8Array representing the sinf atom
 * @returns {Uint8Array}
 */
function createENCVBox(
  width : number,
  height : number,
  hRes : number,
  vRes : number,
  encName : string,
  colorDepth : number,
  avcc : Uint8Array,
  sinf : Uint8Array
) : Uint8Array {
  return createBox("encv", concat(
    6,                       // 6 bytes reserved
    itobe2(1), 16,           // drefIdx + QuickTime reserved, zeroes
    itobe2(width),           // size 2 w
    itobe2(height),          // size 2 h
    itobe2(hRes), 2,         // reso 4 h
    itobe2(vRes), 2 + 4,     // reso 4 v + QuickTime reserved, zeroes
    [0, 1, encName.length],  // frame count (default 1)
    strToUtf8(encName),      // 1byte len + encoder name str
    (31 - encName.length),   // + padding
    itobe2(colorDepth),      // color depth
    [0xFF, 0xFF],            // reserved ones
    avcc,                    // avcc atom,
    sinf
  ));
}

/**
 * @param {Number} drefIdx
 * @param {Number} channelsCount
 * @param {Number} sampleSize
 * @param {Number} packetSize
 * @param {Number} sampleRate
 * @param {Uint8Array} esds - Uint8Array representing the esds atom
 * @param {Uint8Array} [sinf] - Uint8Array representing the sinf atom,
 * only if name == "enca"
 * @returns {Uint8Array}
 */
function createMP4ABox(
  drefIdx : number,
  channelsCount : number,
  sampleSize : number,
  packetSize : number,
  sampleRate : number,
  esds : Uint8Array
) : Uint8Array {
  return createBox("mp4a", concat(
    6,
    itobe2(drefIdx), 8,
    itobe2(channelsCount),
    itobe2(sampleSize), 2,
    itobe2(packetSize),
    itobe2(sampleRate), 2,
    esds
  ));
}

/**
 * @param {Number} drefIdx
 * @param {Number} channelsCount
 * @param {Number} sampleSize
 * @param {Number} packetSize
 * @param {Number} sampleRate
 * @param {Uint8Array} esds - Uint8Array representing the esds atom
 * @param {Uint8Array} [sinf] - Uint8Array representing the sinf atom,
 * only if name == "enca"
 * @returns {Uint8Array}
 */
function createENCABox(
  drefIdx : number,
  channelsCount : number,
  sampleSize : number,
  packetSize : number,
  sampleRate : number,
  esds : Uint8Array,
  sinf : Uint8Array
) : Uint8Array {
  return createBox("enca", concat(
    6,
    itobe2(drefIdx), 8,
    itobe2(channelsCount),
    itobe2(sampleSize), 2,
    itobe2(packetSize),
    itobe2(sampleRate), 2,
    esds,
    sinf
  ));
}

/**
 * @param {url} Uint8Array
 * @returns {Uint8Array}
 */
function createDREFBox(url : Uint8Array) : Uint8Array {
  // only one description here... FIXME
  return createBox("dref", concat(7, [1], url));
}

/**
 * @param {string} majorBrand
 * @param {Array.<string>} brands
 * @returns {Uint8Array}
 */
function createFTYPBox(majorBrand : string, brands : string[]) : Uint8Array {
  const content = concat(...[ strToUtf8(majorBrand),
                              [0, 0, 0, 1] ].concat(brands.map(strToUtf8)));
  return createBox("ftyp", content);
}

/**
 * @param {string} schemeType - four letters (eg "cenc" for Common Encryption)
 * @param {Number} schemeVersion - eg 65536
 * @returns {Uint8Array}
 */
function createSCHMBox(schemeType : string, schemeVersion : number) : Uint8Array {
  return createBox("schm", concat(4, strToUtf8(schemeType), itobe4(schemeVersion)));
}

/**
 * Create tfdt box from a decoding time.
 * @param {number} decodeTime
 * @returns {Uint8Array}
 */
function createTfdtBox(decodeTime : number) : Uint8Array {
  return createBox("tfdt", concat([1, 0, 0, 0], itobe8(decodeTime)));
}

/**
 * @returns {Uint8Array}
 */
function createVMHDBox() : Uint8Array {
  const arr = new Uint8Array(12);
  arr[3] = 1; // QuickTime...
  return createBox("vmhd", arr);
}

/**
 * @param {Number} trackId
 * @returns {Uint8Array}
 */
function createTREXBox(trackId : number) : Uint8Array {
  // default sample desc idx = 1
  return createBox("trex", concat(4, itobe4(trackId), [0, 0, 0, 1], 12));
}

/**
 * @param {Number} length
 * @returns {Uint8Array}
 */
function createFreeBox(length : number) : Uint8Array {
  return createBox("free", new Uint8Array(length - 8));
}

/**
 * @param {Number} stream
 * @param {string} codecPrivateData - hex string
 * @returns {Uint8Array}
 */
function createESDSBox(stream : number, codecPrivateData : string) : Uint8Array {
  return createBox("esds", concat(
    4,
    [0x03, 0x19],
    itobe2(stream),
    [0x00, 0x04, 0x11, 0x40, 0x15], 11,
    [0x05, 0x02],
    hexToBytes(codecPrivateData),
    [0x06, 0x01, 0x02]
  ));
}

/**
 * @param {string} dataFormat - four letters (eg "avc1")
 * @returns {Uint8Array}
 */
function createFRMABox(dataFormat : string) : Uint8Array {
  return createBox("frma", strToUtf8(dataFormat));
}

/**
 * @param {Uint8Array} sps
 * @param {Uint8Array} pps
 * @param {Number} nalLen - NAL Unit length: 1, 2 or 4 bytes
 * eg: avcc(0x4d, 0x40, 0x0d, 4, 0xe1, "674d400d96560c0efcb80a70505050a0",
 * 1, "68ef3880")
 * @returns {Uint8Array}
 */
function createAVCCBox(
  sps : Uint8Array,
  pps : Uint8Array,
  nalLen : number
) : Uint8Array {
  const nal = (nalLen === 2) ? 0x1 :
              (nalLen === 4) ? 0x3 :
              0x0;

  // Deduce AVC Profile from SPS
  const h264Profile = sps[1];
  const h264CompatibleProfile = sps[2];
  const h264Level = sps[3];

  return createBox("avcC", concat(
    [
      1,
      h264Profile,
      h264CompatibleProfile,
      h264Level,
      (0x3F << 2 | nal),
      (0xE0 | 1),
    ],
    itobe2(sps.length), sps, [1],
    itobe2(pps.length), pps
  ));
}

/**
 * @param {string} type - "video"/"audio"/"hint"
 * @returns {Uint8Array}
 */
function createHDLRBox(type : "audio"|"video"|"hint") : Uint8Array {
  let name;
  let handlerName;

  switch (type) {
    case "video":
      name = "vide";
      handlerName = "VideoHandler";
      break;
    case "audio":
      name = "soun";
      handlerName = "SoundHandler";
      break;
    default:
      name = "hint";
      handlerName = "";
      break;
  }

  return createBox("hdlr", concat(
    8,
    strToUtf8(name), 12,
    strToUtf8(handlerName),
    1 // handler name is C-style string (0 terminated)
  ));
}

/**
 * @param {number} timescale
 * @returns {Uint8Array}
 */
function createMDHDBox(timescale : number) : Uint8Array {
  return createBox("mdhd", concat(12, itobe4(timescale), 8));
}

  /**
   * @param {Number} timescale
   * @param {Number} trackId
   * @returns {Uint8Array}
   */
function createMVHDBox(timescale : number, trackId : number) : Uint8Array {
  return createBox("mvhd", concat(
    12,
    itobe4(timescale), 4,
    [0, 1],  2,         // we assume rate = 1;
    [1, 0], 10,         // we assume volume = 100%;
    [0, 1], 14,         // default matrix
    [0, 1], 14,         // default matrix
    [64, 0, 0, 0], 26,
    itobe2(trackId + 1) // next trackId (=trackId + 1);
  ));
}

/**
 * @param {Uint8Array} mfhd
 * @param {Uint8Array} tfhd
 * @param {Uint8Array} tfdt
 * @param {Uint8Array} trun
 * @returns {Uint8Array}
 */
function createSAIOBox(
  mfhd : Uint8Array,
  tfhd : Uint8Array,
  tfdt : Uint8Array,
  trun : Uint8Array
) : Uint8Array {
  return createBox("saio", concat(
    4, [0, 0, 0, 1], // ??
    itobe4(
      mfhd.length +
      tfhd.length +
      tfdt.length +
      trun.length +
      8 + 8 + 8 + 8
    )
  ));
}

/**
 * @param {Uint8Array} sencContent - including 8 bytes flags and entries count
 * @returns {Uint8Array}
 */
function createSAIZBox(sencContent : Uint8Array) : Uint8Array {
  if (sencContent.length === 0) {
    return createBox("saiz", new Uint8Array(0));
  }

  const flags   = be4toi(sencContent, 0);
  const entries = be4toi(sencContent, 4);

  const arr = new Uint8Array(entries + 9);
  arr.set(itobe4(entries), 5);

  let i = 9;
  let j = 8;
  let pairsCnt;
  let pairsLen;
  while (j < sencContent.length) {
    j += 8; // assuming IV is 8 bytes TODO handle 16 bytes IV
            // if we have extradata for each entry
    if ((flags & 0x2) === 0x2) {
      pairsLen = 2;
      pairsCnt = be2toi(sencContent, j);
      j += (pairsCnt * 6) + 2;
    } else {
      pairsCnt = 0;
      pairsLen = 0;
    }
    arr[i] = pairsCnt * 6 + 8 + pairsLen;
    i++;
  }

  return createBox("saiz", arr);
}

/**
 * @returns {Uint8Array}
 */
function createSMHDBox() : Uint8Array {
  return createBox("smhd", new Uint8Array(8));
}

/**
 * @param {Array.<Uint8Array>} representations - arrays of Uint8Array,
 * typically [avc1] or [encv, avc1]
 * @returns {Uint8Array}
 */
function createSTSDBox(reps : Uint8Array[]) : Uint8Array {
  // only one description here... FIXME
  const arrBase : Array<Uint8Array|number[]|number> = [7, [reps.length]];
  return createBox("stsd", concat(...arrBase.concat(reps)));
}

/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} trackId
 * @returns {Uint8Array}
 */
function createTKHDBox(width : number, height : number, trackId : number) : Uint8Array {
  return createBox("tkhd", concat(
    itobe4(1 + 2 + 4), 8, // we assume track is enabled,
                          // in media and in preview.
    itobe4(trackId),  20, // we assume trackId = 1;
    [1, 0, 0, 0],         // we assume volume = 100%;
    [0, 1, 0, 0], 12,     // default matrix
    [0, 1, 0, 0], 12,     // default matrix
    [64, 0, 0, 0],        // ??
    itobe2(width),  2,    // width (TODO handle fixed)
    itobe2(height), 2     // height (TODO handle fixed)
  ));
}

/**
 * @param {Number} algId - eg 1
 * @param {Number} ivSize - eg 8
 * @param {string} keyId - Hex KID 93789920e8d6520098577df8f2dd5546
 * @returns {Uint8Array}
 */
function createTENCBox(algId : number, ivSize : number, keyId : Uint8Array) : Uint8Array {
  return createBox("tenc", concat(6, [algId, ivSize], keyId
  ));
}

export {
  createAVC1Box,
  createAVCCBox,
  createDREFBox,
  createENCABox,
  createENCVBox,
  createESDSBox,
  createFRMABox,
  createFTYPBox,
  createFreeBox,
  createHDLRBox,
  createMDHDBox,
  createMP4ABox,
  createMVHDBox,
  createSAIOBox,
  createSAIZBox,
  createSCHMBox,
  createSMHDBox,
  createSTSDBox,
  createTENCBox,
  createTKHDBox,
  createTREXBox,
  createTfdtBox,
  createVMHDBox,
};
