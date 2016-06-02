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

const assert = require("../../utils/assert");
const { isIE } = require("../../core/compat");
const {
  concat,
  strToBytes, bytesToStr,
  hexToBytes, bytesToHex,
  be2toi, itobe2,
  be4toi, itobe4,
  be8toi, itobe8,
} = require("../../utils/bytes");

const FREQS = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

const boxNamesMem = {};
function boxName(str) {
  if (boxNamesMem[str]) {
    return boxNamesMem[str];
  }

  const nameInBytes = strToBytes(str);
  boxNamesMem[str] = nameInBytes;
  return nameInBytes;
}

function Atom(name, buff) {
  if (__DEV__) {
    assert(name.length === 4);
  }

  const len = buff.length + 8;
  return concat(itobe4(len), boxName(name), buff);
}

function readUuid(buf, id1, id2, id3, id4) {
  const l = buf.length;
  let i = 0, len;
  while (i < l) {
    len = be4toi(buf, i);
    if (
      be4toi(buf, i +  4) === 0x75756964 /* === "uuid" */ &&
      be4toi(buf, i +  8) === id1 &&
      be4toi(buf, i + 12) === id2 &&
      be4toi(buf, i + 16) === id3 &&
      be4toi(buf, i + 20) === id4
    ) {
      return buf.subarray(i + 24, i + len);
    }
    i += len;
  }
}

function findAtom(buf, atomName) {
  const l = buf.length;
  let i = 0;

  let name, size;
  while (i + 8 < l) {
    size = be4toi(buf, i);
    name = be4toi(buf, i + 4);
    assert(size > 0, "dash: out of range size");
    if (name === atomName) {
      break;
    } else {
      i += size;
    }
  }

  if (i < l) {
    return buf.subarray(i + 8, i + size);
  } else {
    return null;
  }
}

const atoms = {

  mult(name, children) {
    return Atom(name, concat.apply(null, children));
  },

  /**
   * {String}     name ("avc1" or "encv")
   * {Number}     drefIdx (shall be 1)
   * {Number}     width
   * {Number}     height
   * {Number}     hRes (horizontal resolution, eg 72)
   * {Number}     vRes (horizontal resolution, eg 72)
   * {Number}     colorDepth (eg 24)
   * {Uint8Array} avcc (Uint8Array representing the avcC atom)
   * {Uint8Array} sinf (Uint8Array representing the sinf atom, only if name == "encv")
   */
  avc1encv(name, drefIdx, width, height, hRes, vRes, encName, colorDepth, avcc, sinf) {
    if (__DEV__) {
      assert(name === "avc1" || name === "encv", "should be avc1 or encv atom");
    }
    return Atom(name, concat(
      6,                      // 6 bytes reserved
      itobe2(drefIdx), 16,    // drefIdx + QuickTime reserved, zeroes
      itobe2(width),          // size 2 w
      itobe2(height),         // size 2 h
      itobe2(hRes), 2,        // reso 4 h
      itobe2(vRes), 2 + 4,    // reso 4 v + QuickTime reserved, zeroes
      [0, 1, encName.length], // frame count (default 1)
      strToBytes(encName),    // 1byte len + encoder name str
      (31 - encName.length),  // + padding
      itobe2(colorDepth),     // color depth
      [0xFF, 0xFF],           // reserved ones
      avcc,                   // avcc atom,
      (name === "encv") ? sinf : []
    ));
  },

  /**
   * {String} spsHex
   * {String} ppsHex
   * {Number} nalLen (NAL Unit length: 1, 2 or 4 bytes)
   * eg: avcc(0x4d, 0x40, 0x0d, 4, 0xe1, "674d400d96560c0efcb80a70505050a0", 1, "68ef3880")
   */
  avcc(sps, pps, nalLen) {
    const nal = (nalLen === 2) ?
        0x1 : (nalLen === 4) ?
        0x3 : 0x0;

    // Deduce AVC Profile from SPS
    const h264Profile = sps[1];
    const h264CompatibleProfile = sps[2];
    const h264Level = sps[3];

    return Atom("avcC", concat(
      [1, h264Profile, h264CompatibleProfile, h264Level, (0x3F << 2 | nal), (0xE0 | 1)],
      itobe2(sps.length), sps, [1],
      itobe2(pps.length), pps
    ));
  },

  dref(url) {
    // only one description here... FIXME
    return Atom("dref", concat(7, [1], url));
  },

  /**
   * {Number} stream
   * {String} codecPrivateData (hex string)
   * eg: esds(1, 98800, "1190")
   */
  esds(stream, codecPrivateData) {
    return Atom("esds", concat(
      4,
      [0x03, 0x19],
      itobe2(stream),
      [0x00, 0x04, 0x11, 0x40, 0x15], 11,
      [0x05, 0x02],
      hexToBytes(codecPrivateData),
      [0x06, 0x01, 0x02]
    ));
  },

  /**
   * {String} dataFormat, four letters (eg "avc1")
   */
  frma(dataFormat) {
    if (__DEV__) {
      assert.equal(dataFormat.length, 4, "wrong data format length");
    }
    return Atom("frma", strToBytes(dataFormat));
  },

  free(length) {
    return Atom("free", new Uint8Array(length - 8));
  },

  ftyp(majorBrand, brands) {
    return Atom("ftyp", concat.apply(null, [strToBytes(majorBrand), [0, 0, 0, 1]].concat(brands.map(strToBytes))));
  },

  /**
   * {String} type ("video" or "audio")
   */
  hdlr(type) {
    let name, handlerName;

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

    return Atom("hdlr", concat(
      8,
      strToBytes(name), 12,
      strToBytes(handlerName), 1 // handler name is C-style string (0 terminated)
    ));
  },

  mdhd(timescale) {
    return Atom("mdhd", concat(12, itobe4(timescale), 8));
  },

  moof(mfhd, traf) {
    return atoms.mult("moof", [mfhd, traf]);
  },

  /**
   * {String}     name ("mp4a" or "enca")
   * {Number}     drefIdx
   * {Number}     channelsCount
   * {Number}     sampleSize
   * {Number}     packetSize
   * {Number}     sampleRate
   * {Uint8Array} esds (Uint8Array representing the esds atom)
   * {Uint8Array} sinf (Uint8Array representing the sinf atom, only if name == "enca")
   */
  mp4aenca(name, drefIdx, channelsCount, sampleSize, packetSize, sampleRate, esds, sinf) {
    return Atom(name, concat(
      6,
      itobe2(drefIdx), 8,
      itobe2(channelsCount),
      itobe2(sampleSize), 2,
      itobe2(packetSize),
      itobe2(sampleRate), 2,
      esds,
      (name === "enca") ? sinf : []
    ));
  },

  mvhd(timescale, trackId) {
    return Atom("mvhd", concat(
      12,
      itobe4(timescale), 4,
      [0, 1],  2,         // we assume rate = 1;
      [1, 0], 10,         // we assume volume = 100%;
      [0, 1], 14,         // default matrix
      [0, 1], 14,         // default matrix
      [64, 0, 0, 0], 26,
      itobe2(trackId + 1) // next trackId (=trackId + 1);
    ));
  },

  /**
   * {String}       systemId    Hex string representing the CDM, 16 bytes.
   * {Uint8Array}   privateData Data associated to protection specific system
   * {[]Uint8Array} keyIds      List of key ids contained in the PSSH
   */
  pssh(systemId, privateData=[], keyIds=[]) {
    systemId = systemId.replace(/-/g, "");

    assert(systemId.length === 32, "wrong system id length");

    let version;
    let kidList;
    const kidCount = keyIds.length;
    if (kidCount > 0) {
      version = 1;
      kidList = concat.apply(null, [itobe4(kidCount)].concat(keyIds));
    }
    else {
      version = 0;
      kidList = [];
    }

    return Atom("pssh", concat(
      [version, 0, 0, 0],
      hexToBytes(systemId),
      kidList,
      itobe4(privateData.length),
      privateData
    ));
  },

  saio(mfhd, tfhd, tfdt, trun) {
    return Atom("saio", concat(
      4, [0, 0, 0, 1], // ??
      itobe4(mfhd.length + tfhd.length + tfdt.length + trun.length + 8 + 8 + 8 + 8)
    ));
  },

  /**
   * {Uint8Array} sencData (including 8 bytes flags and entries count)
   */
  saiz(senc) {
    if (senc.length === 0) {
      return Atom("saiz", new Uint8Array());
    }

    const flags   = be4toi(senc, 0);
    const entries = be4toi(senc, 4);

    const arr = new Uint8Array(9 + entries);
    arr.set(itobe4(entries), 5);

    let i = 9;
    let j = 8;
    let pairsCnt;
    let pairsLen;
    while (j < senc.length) {
      j += 8; // assuming IV is 8 bytes TODO handle 16 bytes IV
              // if we have extradata for each entry
      if ((flags & 0x2) === 0x2) {
        pairsLen = 2;
        pairsCnt = be2toi(senc, j);
        j += 2 + (pairsCnt * 6);
      } else {
        pairsCnt = 0;
        pairsLen = 0;
      }
      arr[i] = pairsCnt * 6 + 8 + pairsLen;
      i++;
    }

    return Atom("saiz", arr);
  },

  /**
   * {String} schemeType, four letters (eg "cenc" for Common Encryption)
   * {Number} schemeVersion (eg 65536)
   */
  schm(schemeType, schemeVersion) {
    if (__DEV__) {
      assert.equal(schemeType.length, 4, "wrong scheme type length");
    }
    return Atom("schm", concat(
      4,
      strToBytes(schemeType),
      itobe4(schemeVersion)
    ));
  },

  senc(buf) {
    return Atom("senc", buf);
  },

  smhd() {
    return Atom("smhd", new Uint8Array(8));
  },

  /**
   * {Array} representations (arrays of Uint8Array, typically [avc1] or [encv, avc1])
   */
  stsd(reps) {
    // only one description here... FIXME
    return Atom("stsd", concat.apply(null, [7, [reps.length]].concat(reps)));
  },

  tkhd(width, height, trackId) {
    return Atom("tkhd", concat(
      itobe4(1 + 2 + 4), 8, // we assume track is enabled, in media and in preview.
      itobe4(trackId),  20, // we assume trackId = 1;
      [1, 0, 0, 0],         // we assume volume = 100%;
      [0, 1, 0, 0], 12,     // default matrix
      [0, 1, 0, 0], 12,     // default matrix
      [64, 0, 0, 0],        // ??
      itobe2(width),  2,    // width (TODO handle fixed)
      itobe2(height), 2     // height (TODO handle fixed)
    ));
  },

  trex(trackId) {
    // default sample desc idx = 1
    return Atom("trex", concat(
      4,
      itobe4(trackId),
      [0, 0, 0, 1], 12
    ));
  },

  tfdt(decodeTime) {
    return Atom("tfdt", concat(
      [1, 0, 0, 0],
      itobe8(decodeTime)
    ));
  },

  /**
   * {Number} algId (eg 1)
   * {Number} ivSize (eg 8)
   * {String} keyId Hex KID 93789920e8d6520098577df8f2dd5546
   */
  tenc(algId, ivSize, keyId) {
    if (__DEV__) {
      assert.equal(keyId.length, 32, "wrong default KID length");
    }
    return Atom("tenc", concat(
      6,
      [algId, ivSize],
      hexToBytes(keyId)
    ));
  },

  traf(tfhd, tfdt, trun, senc, mfhd) {
    const trafs = [tfhd, tfdt, trun];
    if (senc) {
      trafs.push(
        atoms.senc(senc),
        atoms.saiz(senc),
        atoms.saio(mfhd, tfhd, tfdt, trun)
      );
    }
    return atoms.mult("traf", trafs);
  },

  trun(oldtrun) {
    const headersLast = oldtrun[11];
    const hasDataOffset = headersLast & 0x01;
    if (hasDataOffset) {
      return oldtrun;
    }

    // If no dataoffset is present, we change the headers and add one
    const trun = new Uint8Array(oldtrun.length + 4);
    trun.set(itobe4(oldtrun.length + 4), 0);
    trun.set(oldtrun.subarray(4, 16), 4); // name + (version + headers) + samplecount
    trun[11] = trun[11] | 0x01;        // add data offset header info
    trun.set([0,0,0,0], 16);           // data offset
    trun.set(oldtrun.subarray(16, oldtrun.length), 20);
    return trun;
  },

  vmhd() {
    const arr = new Uint8Array(12);
    arr[3] = 1; // QuickTime...
    return Atom("vmhd", arr);
  },
};

const reads = {
  traf(buff) {
    const moof = findAtom(buff, 0x6D6F6F66);
    if (moof) {
      return findAtom(moof, 0x74726166);
    } else {
      return null;
    }
  },

  /**
   * Extract senc data (derived from UUID MS Atom)
   * {Uint8Array} traf
   */
  senc(traf) {
    return readUuid(traf, 0xA2394F52, 0x5A9B4F14, 0xA2446C42, 0x7C648DF4);
  },

  /**
   * Extract tfxd data (derived from UUID MS Atom)
   * {Uint8Array} traf
   */
  tfxd(traf) {
    return readUuid(traf, 0x6D1D9B05, 0x42D544E6, 0x80E2141D, 0xAFF757B2);
  },

  /**
   * Extract tfrf data (derived from UUID MS Atom)
   * {Uint8Array} traf
   */
  tfrf(traf) {
    return readUuid(traf, 0xD4807EF2, 0XCA394695, 0X8E5426CB, 0X9E46A79F);
  },

  mdat(buff) {
    return findAtom(buff, 0x6D646174 /* "mdat" */);
  },
};

/**
 * Return AAC ES Header (hexstr form)
 *
 * {Number} type
 *          1 = AAC Main
 *          2 = AAC LC
 *          cf http://wiki.multimedia.cx/index.php?title=MPEG-4_Audio
 * {Number} frequency
 * {Number} chans (1 or 2)
 */
function aacesHeader(type, frequency, chans) {
  const freq = FREQS.indexOf(frequency);
  if (__DEV__) {
    assert(freq >= 0, "non supported frequency"); // TODO : handle Idx = 15...
  }
  let val;
  val = (type & 0x3F) << 0x4;
  val = (val | (freq  & 0x1F)) << 0x4;
  val = (val | (chans & 0x1F)) << 0x3;
  return bytesToHex(itobe2(val));
}

function moovChildren(mvhd, mvex, trak, pssList) {
  const moov = [mvhd, mvex, trak];
  pssList.forEach((pss) => {
    const pssh = atoms.pssh(pss.systemId, pss.privateData, pss.keyIds);
    moov.push(pssh);
  });
  return moov;
}

function patchTrunDataOffset(segment, trunoffset, dataOffset) {
  // patch trun dataoffset with new moof atom size
  segment.set(itobe4(dataOffset), trunoffset + 16);
}

function createNewSegment(segment, newmoof, oldmoof, trunoffset) {
  const segmentlen = segment.length;
  const newmooflen = newmoof.length;
  const oldmooflen = oldmoof.length;
  const mdat = segment.subarray(oldmooflen, segmentlen);
  const newSegment = new Uint8Array(newmooflen + (segmentlen - oldmooflen));
  newSegment.set(newmoof, 0);
  newSegment.set(mdat, newmooflen);
  patchTrunDataOffset(newSegment, trunoffset, newmoof.length + 8);
  return newSegment;
}

function patchSegmentInPlace(segment, newmoof, oldmoof, trunoffset) {
  const free = oldmoof.length - newmoof.length;
  segment.set(newmoof, 0);
  segment.set(atoms.free(free), newmoof.length);
  patchTrunDataOffset(segment, trunoffset, newmoof.length + 8 + free);
  return segment;
}

function createInitSegment(
  timescale,
  type,
  stsd,
  mhd,
  width,
  height,
  pssList
) {

  const stbl = atoms.mult("stbl", [
    stsd,
    Atom("stts", new Uint8Array(0x08)),
    Atom("stsc", new Uint8Array(0x08)),
    Atom("stsz", new Uint8Array(0x0c)),
    Atom("stco", new Uint8Array(0x08)),
  ]);

  const url  = Atom("url ", new Uint8Array([0, 0, 0, 1]));
  const dref = atoms.dref(url);
  const dinf = atoms.mult("dinf", [dref]);
  const minf = atoms.mult("minf", [mhd, dinf, stbl]);
  const hdlr = atoms.hdlr(type);
  const mdhd = atoms.mdhd(timescale); //this one is really important
  const mdia = atoms.mult("mdia", [mdhd, hdlr, minf]);
  const tkhd = atoms.tkhd(width, height, 1);
  const trak = atoms.mult("trak", [tkhd, mdia]);
  const trex = atoms.trex(1);
  const mvex = atoms.mult("mvex", [trex]);
  const mvhd = atoms.mvhd(timescale, 1); // in fact, we don"t give a shit about this value ;)

  const moov = atoms.mult("moov", moovChildren(mvhd, mvex, trak, pssList));
  const ftyp = atoms.ftyp("isom", ["isom", "iso2", "iso6", "avc1", "dash"]);

  return concat(ftyp, moov);
}

module.exports = {
  getMdat: reads.mdat,
  getTraf: reads.traf,

  parseTfrf(traf) {
    const tfrf = reads.tfrf(traf);
    if (!tfrf) {
      return [];
    }

    const frags = [];
    const version = tfrf[0];
    const fragCount = tfrf[4];
    for (let i = 0; i < fragCount; i++) {
      let d, ts;
      if (version == 1) {
        ts = be8toi(tfrf, 16 * i + 5);
        d  = be8toi(tfrf, 16 * i + 5 + 8);
      } else {
        ts = be4toi(tfrf, 8 * i + 5);
        d  = be4toi(tfrf, 8 * i + 5 + 4);
      }
      frags.push({ ts, d });
    }
    return frags;
  },

  parseTfxd(traf) {
    const tfxd = reads.tfxd(traf);
    if (tfxd) {
      return {
        d:  be8toi(tfxd, 12),
        ts: be8toi(tfxd,  4),
      };
    }
  },

  /**
   * Return full Init segment as Uint8Array
   *
   * Number   timescale (lowest number, this one will be set into mdhd, *10000 in mvhd) Eg 1000
   * Number   width
   * Number   height
   * Number   hRes
   * Number   vRes
   * Number   nalLength (1, 2 or 4)
   * String   SPShexstr
   * String   PPShexstr
   * Array    (optional) pssList. List of dict {systemId: "DEADBEEF", codecPrivateData: "DEAFBEEF}
   * String   keyId (hex string representing the key Id, 32 chars. eg. a800dbed49c12c4cb8e0b25643844b9b)
   *
   *
   */
  createVideoInitSegment(
    timescale,
    width,
    height,
    hRes,
    vRes,
    nalLength,
    codecPrivateData,
    keyId,
    pssList
  ) {

    if (!pssList) {
      pssList = [];
    }
    const [, spsHex, ppsHex] = codecPrivateData.split("00000001");
    const sps = hexToBytes(spsHex);
    const pps = hexToBytes(ppsHex);

    // TODO NAL length is forced to 4
    const avcc = atoms.avcc(sps, pps, nalLength);
    let stsd;
    if (!pssList.length) {
      const avc1 = atoms.avc1encv("avc1", 1, width, height, hRes, vRes, "AVC Coding", 24, avcc);
      stsd = atoms.stsd([avc1]);
    }
    else {
      const tenc = atoms.tenc(1, 8, keyId);
      const schi = atoms.mult("schi", [tenc]);
      const schm = atoms.schm("cenc", 65536);
      const frma = atoms.frma("avc1");
      const sinf = atoms.mult("sinf", [frma, schm, schi]);
      const encv = atoms.avc1encv("encv", 1, width, height, hRes, vRes, "AVC Coding", 24, avcc, sinf);
      stsd = atoms.stsd([encv]);
    }

    return createInitSegment(timescale, "video", stsd, atoms.vmhd(), width, height, pssList);
  },

  /**
   * Return full Init segment as Uint8Array
   *
   * Number   channelsCount
   * Number   sampleSize
   * Number   packetSize
   * Number   sampleRate
   * String   codecPrivateData
   * Array    (optional) pssList. List of dict {systemId: "DEADBEEF", codecPrivateData: "DEAFBEEF"}
   * String   keyId (hex string representing the key Id, 32 chars. eg. a800dbed49c12c4cb8e0b25643844b9b)
   *
   *
   */
  createAudioInitSegment(
    timescale,
    channelsCount,
    sampleSize,
    packetSize,
    sampleRate,
    codecPrivateData,
    keyId,
    pssList
  ) {

    if (!pssList) {
      pssList = [];
    }
    if (!codecPrivateData) {
      codecPrivateData = aacesHeader(2, sampleRate, channelsCount);
    }

    const esds = atoms.esds(1, codecPrivateData);
    let stsd;
    if (!pssList.length) {
      const mp4a = atoms.mp4aenca("mp4a", 1, channelsCount, sampleSize, packetSize, sampleRate, esds);
      stsd = atoms.stsd([mp4a]);
    }
    else {
      const tenc = atoms.tenc(1, 8, keyId);
      const schi = atoms.mult("schi", [tenc]);
      const schm = atoms.schm("cenc", 65536);
      const frma = atoms.frma("mp4a");
      const sinf = atoms.mult("sinf", [frma, schm, schi]);
      const enca = atoms.mp4aenca("enca", 1, channelsCount, sampleSize, packetSize, sampleRate, esds, sinf);
      stsd = atoms.stsd([enca]);
    }

    return createInitSegment(timescale, "audio", stsd, atoms.smhd(), 0, 0, pssList);
  },

  patchSegment(segment, decodeTime) {
    if (__DEV__) {
      // TODO handle segments with styp/free...
      const name = bytesToStr(segment.subarray(4, 8));
      assert(name === "moof");
    }

    const oldmoof = segment.subarray(0, be4toi(segment, 0));
    const newtfdt = atoms.tfdt(decodeTime);

    // reads [moof[mfhd|traf[tfhd|trun|..]]]
    const tfdtlen = newtfdt.length;
    const mfhdlen = be4toi(oldmoof, 8);
    const traflen = be4toi(oldmoof, 8 + mfhdlen);
    const tfhdlen = be4toi(oldmoof, 8 + mfhdlen + 8);
    const trunlen = be4toi(oldmoof, 8 + mfhdlen + 8 + tfhdlen);
    const oldmfhd = oldmoof.subarray(8, 8 + mfhdlen);
    const oldtraf = oldmoof.subarray(8 + mfhdlen + 8, 8 + mfhdlen + 8 + traflen - 8);
    const oldtfhd = oldtraf.subarray(0, tfhdlen);
    const oldtrun = oldtraf.subarray(tfhdlen, tfhdlen + trunlen);

    // force trackId=1 since trackIds are not always reliable...
    oldtfhd.set([0, 0, 0, 1], 12);

    const oldsenc = reads.senc(oldtraf);

    // writes [moof[mfhd|traf[tfhd|tfdt|trun|senc|saiz|saio]]]
    const newtrun = atoms.trun(oldtrun);
    const newtraf = atoms.traf(oldtfhd, newtfdt, newtrun, oldsenc, oldmfhd);
    const newmoof = atoms.moof(oldmfhd, newtraf);

    const trunoffset = 8 + mfhdlen + 8 + tfhdlen + tfdtlen;
    // TODO(pierre): fix patchSegmentInPlace to work with IE11. Maybe
    // try to put free atom inside traf children
    if (isIE) {
      return createNewSegment(segment, newmoof, oldmoof, trunoffset);
    } else {
      if (oldmoof.length - newmoof.length >= 8 /* minimum "free" atom size */) {
        return patchSegmentInPlace(segment, newmoof, oldmoof, trunoffset);
      } else {
        return createNewSegment(segment, newmoof, oldmoof, trunoffset);
      }
    }
  },
};
