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
 * @param {Number} width
 * @param {Number} height
 * @param {Number} hRes - horizontal resolution, eg 72
 * @param {Number} vRes - vertical resolution, eg 72
 * @param {string} encName
 * @param {Number} colorDepth - eg 24
 * @param {Uint8Array} avcc - Uint8Array representing the avcC atom
 * @returns {Uint8Array}
 */
declare function createAVC1Box(width: number, height: number, hRes: number, vRes: number, encName: string, colorDepth: number, avcc: Uint8Array): Uint8Array;
/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} hRes - horizontal resolution, eg 72
 * @param {Number} vRes - vertical resolution, eg 72
 * @param {string} encName
 * @param {Number} colorDepth - eg 24
 * @param {Uint8Array} avcc - Uint8Array representing the avcC atom
 * @param {Uint8Array} sinf - Uint8Array representing the sinf atom
 * @returns {Uint8Array}
 */
declare function createENCVBox(width: number, height: number, hRes: number, vRes: number, encName: string, colorDepth: number, avcc: Uint8Array, sinf: Uint8Array): Uint8Array;
/**
 * @param {Number} drefIdx
 * @param {Number} channelsCount
 * @param {Number} sampleSize
 * @param {Number} packetSize
 * @param {Number} sampleRate
 * @param {Uint8Array} esds - Uint8Array representing the esds atom
 * @returns {Uint8Array}
 */
declare function createMP4ABox(drefIdx: number, channelsCount: number, sampleSize: number, packetSize: number, sampleRate: number, esds: Uint8Array): Uint8Array;
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
declare function createENCABox(drefIdx: number, channelsCount: number, sampleSize: number, packetSize: number, sampleRate: number, esds: Uint8Array, sinf: Uint8Array): Uint8Array;
/**
 * @param {Uint8Array} url
 * @returns {Uint8Array}
 */
declare function createDREFBox(url: Uint8Array): Uint8Array;
/**
 * @param {string} majorBrand
 * @param {Array.<string>} brands
 * @returns {Uint8Array}
 */
declare function createFTYPBox(majorBrand: string, brands: string[]): Uint8Array;
/**
 * @param {string} schemeType - four letters (eg "cenc" for Common Encryption)
 * @param {Number} schemeVersion - eg 65536
 * @returns {Uint8Array}
 */
declare function createSCHMBox(schemeType: string, schemeVersion: number): Uint8Array;
/**
 * Create tfdt box from a decoding time.
 * @param {number} decodeTime
 * @returns {Uint8Array}
 */
declare function createTfdtBox(decodeTime: number): Uint8Array;
/**
 * @returns {Uint8Array}
 */
declare function createVMHDBox(): Uint8Array;
/**
 * @param {Number} trackId
 * @returns {Uint8Array}
 */
declare function createTREXBox(trackId: number): Uint8Array;
/**
 * @param {Number} length
 * @returns {Uint8Array}
 */
declare function createFreeBox(length: number): Uint8Array;
/**
 * @param {Number} stream
 * @param {string} codecPrivateData - hex string
 * @returns {Uint8Array}
 */
declare function createESDSBox(stream: number, codecPrivateData: string): Uint8Array;
/**
 * @param {string} dataFormat - four letters (eg "avc1")
 * @returns {Uint8Array}
 */
declare function createFRMABox(dataFormat: string): Uint8Array;
/**
 * @param {Uint8Array} sps
 * @param {Uint8Array} pps
 * @param {Number} nalLen - NAL Unit length: 1, 2 or 4 bytes
 * eg: avcc(0x4d, 0x40, 0x0d, 4, 0xe1, "674d400d96560c0efcb80a70505050a0",
 * 1, "68ef3880")
 * @returns {Uint8Array}
 */
declare function createAVCCBox(sps: Uint8Array, pps: Uint8Array, nalLen: number): Uint8Array;
/**
 * @param {string} type - "video"/"audio"/"hint"
 * @returns {Uint8Array}
 */
declare function createHDLRBox(type: "audio" | "video" | "hint"): Uint8Array;
/**
 * @param {number} timescale
 * @returns {Uint8Array}
 */
declare function createMDHDBox(timescale: number): Uint8Array;
/**
 * @param {Number} timescale
 * @param {Number} trackId
 * @returns {Uint8Array}
 */
declare function createMVHDBox(timescale: number, trackId: number): Uint8Array;
/**
 * @param {Uint8Array} mfhd
 * @param {Uint8Array} tfhd
 * @param {Uint8Array} tfdt
 * @param {Uint8Array} trun
 * @returns {Uint8Array}
 */
declare function createSAIOBox(mfhd: Uint8Array, tfhd: Uint8Array, tfdt: Uint8Array, trun: Uint8Array): Uint8Array;
/**
 * @param {Uint8Array} sencContent - including 8 bytes flags and entries count
 * @returns {Uint8Array}
 */
declare function createSAIZBox(sencContent: Uint8Array): Uint8Array;
/**
 * @returns {Uint8Array}
 */
declare function createSMHDBox(): Uint8Array;
/**
 * @param {Array.<Uint8Array>} reps - arrays of Uint8Array,
 * typically [avc1] or [encv, avc1]
 * @returns {Uint8Array}
 */
declare function createSTSDBox(reps: Uint8Array[]): Uint8Array;
/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} trackId
 * @returns {Uint8Array}
 */
declare function createTKHDBox(width: number, height: number, trackId: number): Uint8Array;
/**
 * @param {Number} algId - eg 1
 * @param {Number} ivSize - eg 8
 * @param {string} keyId - Hex KID 93789920e8d6520098577df8f2dd5546
 * @returns {Uint8Array}
 */
declare function createTENCBox(algId: number, ivSize: number, keyId: Uint8Array): Uint8Array;
export { createAVC1Box, createAVCCBox, createDREFBox, createENCABox, createENCVBox, createESDSBox, createFRMABox, createFTYPBox, createFreeBox, createHDLRBox, createMDHDBox, createMP4ABox, createMVHDBox, createSAIOBox, createSAIZBox, createSCHMBox, createSMHDBox, createSTSDBox, createTENCBox, createTKHDBox, createTREXBox, createTfdtBox, createVMHDBox, };
