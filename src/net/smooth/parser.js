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

var _ = require("canal-js-utils/misc");
var assert = require("canal-js-utils/assert");
var bytes = require("canal-js-utils/bytes");

var DEFAULT_MIME_TYPES = {
  audio: "audio/mp4",
  video: "video/mp4",
  text: "application/ttml+xml",
};

var DEFAULT_CODECS = {
  audio: "mp4a.40.2",
  video: "avc1.4D401E",
};

var MIME_TYPES = {
  "AACL": "audio/mp4",
  "AVC1": "video/mp4",
  "H264": "video/mp4",
  "TTML": "application/ttml+xml+mp4"
};

var CODECS = {
  "AACL": "mp4a.40.5",
  "AACH": "mp4a.40.5",
  "AVC1": "avc1.4D401E",
  "H264": "avc1.4D401E",
};

var profiles = {
  audio: [
    ["Bitrate",          "bitrate",          parseInt],
    ["AudioTag",         "audiotag",         parseInt],
    ["FourCC",           "mimeType",         MIME_TYPES],
    ["FourCC",           "codecs",           CODECS],
    ["Channels",         "channels",         parseInt],
    ["SamplingRate",     "samplingRate",     parseInt],
    ["BitsPerSample",    "bitsPerSample",    parseInt],
    ["PacketSize",       "packetSize",       parseInt],
    ["CodecPrivateData", "codecPrivateData", String],
  ],
  video: [
    ["Bitrate",          "bitrate",          parseInt],
    ["FourCC",           "mimeType",         MIME_TYPES],
    ["FourCC",           "codecs",           CODECS],
    ["MaxWidth",         "width",            parseInt],
    ["MaxHeight",        "height",           parseInt],
    ["CodecPrivateData", "codecPrivateData", String],
  ],
  text: [
    ["Bitrate", "bitrate",  parseInt],
    ["FourCC",  "mimeType", MIME_TYPES],
  ]
};

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

function calcLastRef(index) {
  var { ts, r, d } = _.last(index.timeline);
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

  var SUGGESTED_PERSENTATION_DELAY = parserOptions.suggestedPresentationDelay || 20;
  var REFERENCE_DATE_TIME = parserOptions.referenceDateTime || Date.UTC(1970, 0, 1, 0, 0, 0, 0) / 1000;
  var MIN_REPRESENTATION_BITRATE = parserOptions.minRepresentationBitrate || 190000;

  var keySystems = parserOptions.keySystems || getKeySystems;

  function getHexKeyId(buf) {
    var len = bytes.le2toi(buf, 8);
    var xml = bytes.bytesToUTF16Str(buf.subarray(10, 10 + len));
    var doc = new DOMParser().parseFromString(xml, "application/xml");
    var kid = doc.querySelector("KID").textContent;
    return bytes.guidToUuid(atob(kid)).toLowerCase();
  }

  function reduceChildren(root, fn, init) {
    var node = root.firstElementChild, r = init;
    while (node) {
      r = fn(r, node.nodeName, node);
      node = node.nextElementSibling;
    }
    return r;
  }

  function parseProtection(root) {
    var header = root.firstElementChild;
    assert.equal(header.nodeName, "ProtectionHeader", "parser: Protection should have ProtectionHeader child");
    var privateData = bytes.strToBytes(atob(header.textContent));
    var keyId = getHexKeyId(privateData);
    var keyIdBytes = bytes.hexToBytes(keyId);

    // remove possible braces
    var systemId = header.getAttribute("SystemID").toLowerCase()
      .replace(/\{|\}/g, "");

    return {
      keyId: keyId,
      keySystems: [
        {
          systemId,
          privateData,
          // keyIds: [keyIdBytes],
        }
      ].concat(keySystems(keyIdBytes))
    };
  }

  function parseC(node, timeline) {
    var l = timeline.length;
    var prev = l > 0 ? timeline[l - 1] : { d: 0, ts: 0, r: 0 };
    var d = +node.getAttribute("d");
    var t =  node.getAttribute("t");
    var r = +node.getAttribute("r");

    // in smooth streaming format,
    // r refers to number of same duration
    // chunks, not repetitions (defers from DASH)
    if (r)  r--;

    if (l > 0 && !prev.d) {
      prev.d = t - prev.ts;
      timeline[l - 1] = prev;
    }

    if (l > 0 && d == prev.d && t == null) {
      prev.r += (r || 0) + 1;
    }
    else {
      var ts = (t == null)
        ? prev.ts + prev.d * (prev.r + 1)
        : +t;
      timeline.push({ d, ts, r });
    }
    return timeline;
  }

  function parseQualityLevel(q, prof) {
    return _.reduce(prof, (obj, [key, name, parse]) => {
      obj[name] = _.isFunction(parse)
        ? parse(q.getAttribute(key))
        : parse[q.getAttribute(key)];
      return obj;
    }, {});
  }

  // Parse the adaptations (<StreamIndex>) tree containing
  // representations (<QualityLevels>) and timestamp indexes (<c>).
  // Indexes can be quite huge, and this function needs to
  // to be optimized.
  function parseAdaptation(root, timescale) {
    if (root.hasAttribute("Timescale")) {
      timescale = +root.getAttribute("Timescale");
    }

    var type = root.getAttribute("Type");
    var subType = root.getAttribute("Subtype");
    var profile = profiles[type];

    assert(profile, "parser: unrecognized QualityLevel type " + type);

    var representationCount = 0;

    var { representations, index } = reduceChildren(root, (res, name, node) => {
      switch (name) {
      case "QualityLevel":
        var rep = parseQualityLevel(node, profile);

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
    assert(representations.length, "parser: adaptation should have at least one representation");

    // apply default codec if non-supported
    var codecs = representations[0].codecs;
    if (!codecs) {
      codecs = DEFAULT_CODECS[type];
      _.each(representations, rep => rep.codecs = codecs);
    }

    // apply default mimetype if non-supported
    var mimeType = representations[0].mimeType;
    if (!mimeType) {
      mimeType = DEFAULT_MIME_TYPES[type];
      _.each(representations, rep => rep.mimeType = mimeType);
    }

    // TODO(pierre): real ad-insert support
    if (subType == "ADVT")
      return null;

    return {
      type,
      index,
      representations,
      name: root.getAttribute("Name"),
      lang: root.getAttribute("Language"),
      baseURL: root.getAttribute("Url"),
    };
  }

  function parseFromString(manifest) {
    return parseFromDocument(new DOMParser().parseFromString(manifest, "application/xml"));
  }

  function parseFromDocument(doc) {
    var root = doc.documentElement;
    assert.equal(root.nodeName, "SmoothStreamingMedia", "parser: document root should be SmoothStreamingMedia");
    assert(/^[2]-[0-2]$/.test(root.getAttribute("MajorVersion") + "-" + root.getAttribute("MinorVersion")),
      "Version should be 2.0, 2.1 or 2.2");

    var timescale = +root.getAttribute("Timescale") || 10000000;
    var adaptationCount = 0;

    var { protection, adaptations } = reduceChildren(root, (res, name, node) => {
      switch (name) {
      case "Protection":  res.protection = parseProtection(node);  break;
      case "StreamIndex":
        var ada = parseAdaptation(node, timescale);
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

    _.each(adaptations, a => a.smoothProtection = protection);

    var
      suggestedPresentationDelay,
      presentationLiveGap,
      timeShiftBufferDepth,
      availabilityStartTime;

    var isLive = parseBoolean(root.getAttribute("IsLive"));
    if (isLive) {
      suggestedPresentationDelay = SUGGESTED_PERSENTATION_DELAY;
      timeShiftBufferDepth = +root.getAttribute("DVRWindowLength") / timescale;
      availabilityStartTime = REFERENCE_DATE_TIME;
      var video = _.find(adaptations, a => a.type == "video");
      var audio = _.find(adaptations, a => a.type == "audio");
      var lastRef = Math.min(calcLastRef(video.index), calcLastRef(audio.index));
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
      }]
    };
  }

  function parser(val) {
    if (_.isString(val))                return parseFromString(val);
    if (val instanceof window.Document) return parseFromDocument(val);
    throw new Error("parser: unsupported type to parse");
  }

  parser.parseFromString   = parseFromString;
  parser.parseFromDocument = parseFromDocument;

  return parser;
}

module.exports = createSmoothStreamingParser;
