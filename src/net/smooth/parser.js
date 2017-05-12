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
const bytes = require("../../utils/bytes");
const { normalize: normalizeLang } = require("../../utils/languages");

const DEFAULT_MIME_TYPES = {
  audio: "audio/mp4",
  video: "video/mp4",
  text: "application/ttml+xml",
};

const DEFAULT_CODECS = {
  audio: "mp4a.40.2",
  video: "avc1.4D401E",
};

const MIME_TYPES = {
  "AACL": "audio/mp4",
  "AVC1": "video/mp4",
  "H264": "video/mp4",
  "TTML": "application/ttml+xml+mp4",
};

const profiles = {
  audio: [
    ["Bitrate",          "bitrate",          parseInt],
    ["AudioTag",         "audiotag",         parseInt],
    ["FourCC",           "mimeType",         MIME_TYPES],
    ["Channels",         "channels",         parseInt],
    ["SamplingRate",     "samplingRate",     parseInt],
    ["BitsPerSample",    "bitsPerSample",    parseInt],
    ["PacketSize",       "packetSize",       parseInt],
    ["CodecPrivateData", "codecPrivateData", String],
  ],
  video: [
    ["Bitrate",          "bitrate",          parseInt],
    ["FourCC",           "mimeType",         MIME_TYPES],
    ["CodecPrivateData", "codecs",           extractVideoCodecs],
    ["MaxWidth",         "width",            parseInt],
    ["MaxHeight",        "height",           parseInt],
    ["CodecPrivateData", "codecPrivateData", String],
  ],
  text: [
    ["Bitrate", "bitrate",  parseInt],
    ["FourCC",  "mimeType", MIME_TYPES],
  ],
};

function extractVideoCodecs(codecPrivateData) {
  // we can extract codes only if fourCC is on of "H264", "X264", "DAVC", "AVC1"
  const [, avcProfile] = /00000001\d7([0-9a-fA-F]{6})/.exec(codecPrivateData) || [];
  return avcProfile ? ("avc1." + avcProfile) : "";
}

function extractAudioCodecs(fourCC, codecPrivateData) {
  let mpProfile;
  if (fourCC == "AACH") {
    mpProfile = 5; // High Efficiency AAC Profile
  } else {
    if (codecPrivateData) {
      mpProfile = (parseInt(codecPrivateData.substr(0, 2), 16) & 0xF8) >> 3;
    } else {
      mpProfile = 2; // AAC Main Low Complexity
    }
  }
  return mpProfile ? ("mp4a.40." + mpProfile) : "";
}

function parseBoolean(val) {
  if (typeof val == "boolean") {
    return val;
  }
  else if (typeof val == "string") {
    return val.toUpperCase() === "TRUE";
  }
  else {
    return false;
  }
}

function calcLastRef(adaptation) {
  if (!adaptation) { return Infinity; }
  const { index } = adaptation;
  const { ts, r, d } = index.timeline[index.timeline.length - 1];
  return ((ts + (r+1)*d) / index.timescale);
}

function getKeySystems(keyIdBytes) {
  return [
    {
      // Widevine
      systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
      privateData: bytes.concat([0x08, 0x01, 0x12, 0x10], keyIdBytes),
      // keyIds: [keyIdBytes],
    },
    // {
    //   // Clearkey
    //   // (https://dvcs.w3.org/hg/html-media/raw-file/tip/encrypted-media/cenc-format.html)
    //   systemId: "1077efec-c0b2-4d02-ace3-3c1e52e2fb4b",
    //   privateData: bytes.strToBytes(JSON.stringify({
    //     kids: [bytes.toBase64URL(bytes.bytesToStr(keyIdBytes))],
    //     type: "temporary"
    //   }))
    // }
  ];
}

function createSmoothStreamingParser(parserOptions={}) {

  const SUGGESTED_PERSENTATION_DELAY = parserOptions.suggestedPresentationDelay || 20;
  const REFERENCE_DATE_TIME = parserOptions.referenceDateTime || Date.UTC(1970, 0, 1, 0, 0, 0, 0) / 1000;
  const MIN_REPRESENTATION_BITRATE = parserOptions.minRepresentationBitrate || 190000;

  const keySystems = parserOptions.keySystems || getKeySystems;

  function getHexKeyId(buf) {
    const len = bytes.le2toi(buf, 8);
    const xml = bytes.bytesToUTF16Str(buf.subarray(10, 10 + len));
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const kid = doc.querySelector("KID").textContent;
    return bytes.guidToUuid(atob(kid)).toLowerCase();
  }

  function reduceChildren(root, fn, init) {
    let node = root.firstElementChild, r = init;
    while (node) {
      r = fn(r, node.nodeName, node);
      node = node.nextElementSibling;
    }
    return r;
  }

  function parseProtection(root) {
    const header = root.firstElementChild;
    assert.equal(header.nodeName, "ProtectionHeader", "Protection should have ProtectionHeader child");
    const privateData = bytes.strToBytes(atob(header.textContent));
    const keyId = getHexKeyId(privateData);
    const keyIdBytes = bytes.hexToBytes(keyId);

    // remove possible braces
    const systemId = header.getAttribute("SystemID").toLowerCase()
      .replace(/\{|\}/g, "");

    return {
      keyId: keyId,
      keySystems: [
        {
          systemId,
          privateData,
          // keyIds: [keyIdBytes],
        },
      ].concat(keySystems(keyIdBytes)),
    };
  }

  function parseC(node, timeline) {
    const l = timeline.length;
    const prev = l > 0 ? timeline[l - 1] : { d: 0, ts: 0, r: 0 };
    const d = +node.getAttribute("d");
    const t =  node.getAttribute("t");
    let r = +node.getAttribute("r");

    // in smooth streaming format,
    // r refers to number of same duration
    // chunks, not repetitions (defers from DASH)
    if (r) {
      r--;
    }

    if (l > 0 && !prev.d) {
      prev.d = t - prev.ts;
      timeline[l - 1] = prev;
    }

    if (l > 0 && d == prev.d && t == null) {
      prev.r += (r || 0) + 1;
    }
    else {
      const ts = (t == null)
        ? prev.ts + prev.d * (prev.r + 1)
        : +t;
      timeline.push({ d, ts, r });
    }
    return timeline;
  }

  function parseQualityLevel(q, prof) {
    const obj = {};
    for (let i = 0; i < prof.length; i++) {
      const [key, name, parse] = prof[i];
      obj[name] = typeof parse == "function"
        ? parse(q.getAttribute(key))
        : parse[q.getAttribute(key)];
    }
    return obj;
  }

  // Parse the adaptations (<StreamIndex>) tree containing
  // representations (<QualityLevels>) and timestamp indexes (<c>).
  // Indexes can be quite huge, and this function needs to
  // to be optimized.
  function parseAdaptation(root, timescale) {
    if (root.hasAttribute("Timescale")) {
      timescale = +root.getAttribute("Timescale");
    }

    const type = root.getAttribute("Type");
    const subType = root.getAttribute("Subtype");
    const name = root.getAttribute("Name");
    const lang = normalizeLang(root.getAttribute("Language"));
    const baseURL = root.getAttribute("Url");
    const profile = profiles[type];

    assert(profile, "unrecognized QualityLevel type " + type);

    let representationCount = 0;

    const { representations, index } = reduceChildren(root, (res, name, node) => {
      switch (name) {
      case "QualityLevel":
        const rep = parseQualityLevel(node, profile);

        if (type == "audio") {
          const fourCC = node.getAttribute("FourCC") || "";
          rep.codecs = extractAudioCodecs(fourCC, rep.codecPrivateData);
        }

        // filter out video representations with small bitrates
        if (type != "video" || rep.bitrate > MIN_REPRESENTATION_BITRATE) {
          rep.id = representationCount++;
          res.representations.push(rep);
        }
        break;
      case "c":
        res.index.timeline = parseC(node, res.index.timeline);
        break;
      }
      return res;
    }, {
      representations: [],
      index: {
        timeline: [],
        indexType: "timeline",
        timescale: timescale,
        initialization: {},
      },
    });

    // we assume that all representations have the same
    // codec and mimeType
    assert(representations.length, "adaptation should have at least one representation");

    // apply default codec if non-supported
    representations.forEach((rep) => rep.codecs = rep.codecs || DEFAULT_CODECS[type]);

    // apply default mimetype if non-supported
    representations.forEach((rep) => rep.mimeType = rep.mimeType || DEFAULT_MIME_TYPES[type]);

    // TODO(pierre): real ad-insert support
    if (subType == "ADVT") {
      return null;
    }

    return {
      type,
      index,
      representations,
      name,
      lang,
      baseURL,
    };
  }

  function parseFromString(manifest) {
    return parseFromDocument(new DOMParser().parseFromString(manifest, "application/xml"));
  }

  function parseFromDocument(doc) {
    const root = doc.documentElement;
    assert.equal(root.nodeName, "SmoothStreamingMedia", "document root should be SmoothStreamingMedia");
    assert(/^[2]-[0-2]$/.test(root.getAttribute("MajorVersion") + "-" + root.getAttribute("MinorVersion")),
      "Version should be 2.0, 2.1 or 2.2");

    const timescale = +root.getAttribute("Timescale") || 10000000;
    let adaptationCount = 0;

    const { protection, adaptations } = reduceChildren(root, (res, name, node) => {
      switch (name) {
      case "Protection":  res.protection = parseProtection(node);  break;
      case "StreamIndex":
        const ada = parseAdaptation(node, timescale);
        if (ada) {
          ada.id = adaptationCount++;
          res.adaptations.push(ada);
        }
        break;
      }
      return res;
    }, {
      protection:  null,
      adaptations: [],
    });

    adaptations.forEach((a) => a.smoothProtection = protection);

    let
      suggestedPresentationDelay,
      presentationLiveGap,
      timeShiftBufferDepth,
      availabilityStartTime;

    const isLive = parseBoolean(root.getAttribute("IsLive"));
    if (isLive) {
      suggestedPresentationDelay = SUGGESTED_PERSENTATION_DELAY;
      timeShiftBufferDepth = +root.getAttribute("DVRWindowLength") / timescale;
      availabilityStartTime = REFERENCE_DATE_TIME;
      const video = adaptations.filter((a) => a.type == "video")[0];
      const audio = adaptations.filter((a) => a.type == "audio")[0];
      const lastRef = Math.min(calcLastRef(video), calcLastRef(audio));
      presentationLiveGap = Date.now() / 1000 - (lastRef + availabilityStartTime);
    }

    return {
      transportType: "smoothstreaming",
      profiles: "",
      type: isLive ? "dynamic" : "static",
      suggestedPresentationDelay,
      timeShiftBufferDepth,
      presentationLiveGap,
      availabilityStartTime,
      periods: [{
        duration:    (+root.getAttribute("Duration") || Infinity) / timescale,
        adaptations,
        laFragCount: +root.getAttribute("LookAheadFragmentCount"),
      }],
    };
  }

  function parser(val) {
    if (typeof val == "string") {
      return parseFromString(val);
    } else {
      return parseFromDocument(val);
    }
  }

  parser.parseFromString   = parseFromString;
  parser.parseFromDocument = parseFromDocument;

  return parser;
}

module.exports = createSmoothStreamingParser;
