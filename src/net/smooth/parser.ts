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

import arrayIncludes from "../../utils/array-includes";
import config from "../../config";
import {
  concat,
  strToBytes,
  // toBase64URL,
  // bytesToStr,
  le2toi,
  bytesToUTF16Str,
  guidToUuid,
  hexToBytes,
} from "../../utils/bytes";

import assert from "../../utils/assert";
import { normalize as normalizeLang } from "../../utils/languages";

interface IParserFunctions {
  (manifest : string|Document) : any;
  parseFromString : (x: string) => any;
  parseFromDocument : (manifest : Document) => any;
}

interface IHSSManifestSegment {
  ts : number;
  d? : number;
  r : number;
}

interface HSSKeySystem {
  systemId : string;
  privateData : Uint8Array;
}

interface IHSSParserOptions {
  suggestedPresentationDelay? : number;
  referenceDateTime? : number;
  keySystems?: (keyIdBytes : Uint8Array) => HSSKeySystem[];
  minRepresentationBitrate? : number;
}

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
  AACL: "audio/mp4",
  AVC1: "video/mp4",
  H264: "video/mp4",
  TTML: "application/ttml+xml+mp4",
};

type ProfileFunction = ((x : string) => string|number)|IDictionary<string>;

const profiles : IDictionary<
  Array<[string, string, ProfileFunction]>
> = {
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

/**
 * @param {string} codecPrivateData
 * @returns {string}
 */
function extractVideoCodecs(codecPrivateData : string) : string {
  // we can extract codes only if fourCC is on of "H264", "X264", "DAVC", "AVC1"
  const [, avcProfile = ""] = /00000001\d7([0-9a-fA-F]{6})/
    .exec(codecPrivateData) || [];
  return avcProfile && "avc1." + avcProfile;
}

/**
 * @param {string} fourCC
 * @param {string} codecPrivateData
 * @returns {string}
 */
function extractAudioCodecs(
  fourCC : string,
  codecPrivateData : string
) : string {
  let mpProfile;
  if (fourCC === "AACH") {
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

/**
 * @param {*} parseBoolean
 * @returns {Boolean}
 */
function parseBoolean(val : string|null) : boolean {
  if (typeof val === "boolean") {
    return val;
  }
  else if (typeof val === "string") {
    return val.toUpperCase() === "TRUE";
  }
  else {
    return false;
  }
}

/**
 * @param {Object} adaptation
 * @returns {Number}
 */
function calcLastRef(
  adaptation? : {
    index : {
      timeline : Array<{ ts : number, r : number, d : number }>,
      timescale : number,
    }
  }
) : number {
  if (!adaptation) { return Infinity; }
  const { index } = adaptation;
  const { ts, r, d } = index.timeline[index.timeline.length - 1];
  return ((ts + (r + 1) * d) / index.timescale);
}

/**
 * @param {Uint8Array} keyIdBytes
 * @returns {Array.<Object>}
 */
function getKeySystems(
  keyIdBytes : Uint8Array
) : HSSKeySystem[] {
  return [
    {
      // Widevine
      systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
      privateData: concat([0x08, 0x01, 0x12, 0x10], keyIdBytes),
      // keyIds: [keyIdBytes],
    },
    // {
    //   // Clearkey
    //   // (https://dvcs.w3.org/hg/html-media/raw-file/tip/encrypted-media/cenc-format.html)
    //   systemId: "1077efec-c0b2-4d02-ace3-3c1e52e2fb4b",
    //   privateData: strToBytes(JSON.stringify({
    //     kids: [toBase64URL(bytesToStr(keyIdBytes))],
    //     type: "temporary"
    //   }))
    // }
  ];
}

/**
 * @param {Object} [parserOptions={}]
 */
function createSmoothStreamingParser(
  parserOptions : IHSSParserOptions = {}
) : IParserFunctions {

  const SUGGESTED_PERSENTATION_DELAY =
    parserOptions.suggestedPresentationDelay == null ?
      config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.SMOOTH :
      parserOptions.suggestedPresentationDelay;

  const REFERENCE_DATE_TIME = parserOptions.referenceDateTime ||
    Date.UTC(1970, 0, 1, 0, 0, 0, 0) / 1000;
  const MIN_REPRESENTATION_BITRATE = parserOptions.minRepresentationBitrate ||
    190000;

  const keySystems = parserOptions.keySystems || getKeySystems;

  /**
   * @param {Uint8Array} buf
   * @returns {string}
   */
  function getHexKeyId(buf : Uint8Array) : string {
    const len = le2toi(buf, 8);
    const xml = bytesToUTF16Str(buf.subarray(10, 10 + len));
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const kidElement = doc.querySelector("KID");
    if (!kidElement) {
      throw new Error("invalid XML");
    }
    const kid = kidElement.textContent || "";
    return guidToUuid(atob(kid)).toLowerCase();
  }

  /**
   * Reduce implementation for the children of the given element.
   * TODO better typings
   * @param {Element} root
   * @param {Function} fn
   * @param {*} init
   * @returns {*}
   */
  function reduceChildren<T>(
    root : Element,
    fn : (r : T, nodeName : string, node : Element) => T,
    init : T
  ) : T {
    let node = root.firstElementChild;
    let r = init;
    while (node) {
      r = fn(r, node.nodeName, node);
      node = node.nextElementSibling;
    }
    return r;
  }

  /**
   * @param {Element} root
   * @returns {Object}
   */
  function parseProtection(
    root : Element
  ) : {
    keyId : string,
    keySystems: HSSKeySystem[],
  } {
    const header = root.firstElementChild as Element;
    assert.equal(header.nodeName, "ProtectionHeader", "Protection should have ProtectionHeader child");
    const privateData = strToBytes(atob(header.textContent || ""));
    const keyId = getHexKeyId(privateData);
    const keyIdBytes = hexToBytes(keyId);

    // remove possible braces
    const systemId = (header.getAttribute("SystemID") || "").toLowerCase()
      .replace(/\{|\}/g, "");
    return {
      keyId,
      keySystems: [
        {
          systemId,
          privateData,
          // keyIds: [keyIdBytes],
        },
      ].concat(keySystems(keyIdBytes)),
    };
  }

  /**
   * @param {Element} node
   * @param {Array.<Object>} timeline
   * @returns {Array.<Object>}
   */
  function parseC(
    node : Element,
    timeline : IHSSManifestSegment[]
  ) : IHSSManifestSegment[] {
    const len = timeline.length;
    const prev = len > 0 ?
      timeline[len - 1] : { d: 0, ts: 0, r: 0 };
    const dAttr = node.getAttribute("d");
    const tAttr = node.getAttribute("t");
    const rAttr = node.getAttribute("r");

    // in smooth streaming format,
    // r refers to number of same duration
    // chunks, not repetitions (defers from DASH)
    const r = rAttr ? +rAttr - 1 : 0;
    const t = tAttr ? +tAttr : undefined;
    const d = dAttr ? +dAttr : undefined;

    if (len > 0 && !prev.d) {
      if (__DEV__) {
        assert(typeof t === "number");
      }
      prev.d = t != null ? t - prev.ts : 0;
      timeline[len - 1] = prev; // TODO might not be needed
    }

    // if same segment than the last one, repeat the previous one
    if (len > 0 && d === prev.d && t == null) {
      prev.r += (r || 0) + 1;
    } else {
      if (__DEV__) {
        assert(t != null || prev.d != null);
      }
      const ts = (t == null)
        ? prev.ts + (prev.d || 0) * (prev.r + 1)
        : t;
      timeline.push({ d, ts, r });
    }
    return timeline;
  }

  /**
   * @param {Element} q
   * @param {Array.<string|Function>} prof
   * @return {Object}
   * TODO Better type signatures?
   */
  function parseQualityLevel(
    q : Element,
    prof : Array<[string, string, ProfileFunction]>
  ) : IDictionary<string|number> {
    const obj : IDictionary<string|number> = {};
    for (let i = 0; i < prof.length; i++) {
      const [key, name, parse] = prof[i];
      obj[name] = typeof parse === "function"
        ? parse(q.getAttribute(key) || "")
        : parse[q.getAttribute(key) || ""];
    }
    return obj;
  }

  /**
   * Parse the adaptations (<StreamIndex>) tree containing
   * representations (<QualityLevels>) and timestamp indexes (<c>).
   * Indexes can be quite huge, and this function needs to
   * to be optimized.
   * @param {Element} root
   * @param {Number} timescale
   * @returns {Object}
   */
  function parseAdaptation(root : Element, timescale : number) {
    if (root.hasAttribute("Timescale")) {
      timescale = +(root.getAttribute("Timescale") || 0);
    }

    const type = root.getAttribute("Type");
    if (type == null) {
      throw new Error("StreamIndex without type.");
    }

    const subType = root.getAttribute("Subtype");
    const name = root.getAttribute("Name");
    const language = root.getAttribute("Language");
    const normalizedLanguage = language == null ?
      language : normalizeLang(language);
    const baseURL = root.getAttribute("Url");

    const profile = profiles[type];
    if (profile == null) {
      throw new Error("Unrecognized StreamIndex type: " + type);
    }

    const accessibility : string[] = [];
    let representationCount = 0;

    const {
      representations,
      index,
    } = reduceChildren(root, (res, _name, node) => {
      switch (_name) {
        case "QualityLevel":
          const rep = parseQualityLevel(node, profile);

          if (type === "audio") {
            const fourCC = node.getAttribute("FourCC") || "";

            // XXX TODO Better TypeScript typing?
            rep.codecs = extractAudioCodecs(
              fourCC,
              rep.codecPrivateData as string
            );
          }

          // filter out video representations with small bitrates
          if (type !== "video" || rep.bitrate > MIN_REPRESENTATION_BITRATE) {
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
      representations: [] as Array<IDictionary<string|number>>, // TODO
      index: {
        timeline: [] as IHSSManifestSegment[],
        indexType: "smooth",
        timescale,
        initialization: {},
      },
    });

    // we assume that all representations have the same
    // codec and mimeType
    assert(representations.length, "adaptation should have at least one representation");

    // apply default codec if non-supported
    representations.forEach((rep) =>
      rep.codecs = rep.codecs || DEFAULT_CODECS[type]
    );

    // apply default mimetype if non-supported
    representations.forEach((rep) =>
      rep.mimeType = rep.mimeType || DEFAULT_MIME_TYPES[type]
    );

    // TODO(pierre): real ad-insert support
    if (subType === "ADVT") {
      return null;
    }
    else if (type === "text" && subType === "DESC") {
      accessibility.push("hardOfHearing");
    }

    // TODO check that one, I did not find it in the spec
    // else if (type === "audio" && subType === "DESC") {
    //   accessibility.push("visuallyImpaired");
    // }

    return {
      type,
      accessibility,
      index,
      representations,
      name,
      language,
      normalizedLanguage,
      baseURL,
    };
  }

  function parseFromString(manifest : string) {
    return parseFromDocument(new DOMParser().parseFromString(manifest, "application/xml"));
  }

  function parseFromDocument(doc : Document) {
    const root = doc.documentElement;
    assert.equal(root.nodeName, "SmoothStreamingMedia", "document root should be SmoothStreamingMedia");
    assert(/^[2]-[0-2]$/.test(root.getAttribute("MajorVersion") + "-" + root.getAttribute("MinorVersion")),
      "Version should be 2.0, 2.1 or 2.2");

    const timescale = +(root.getAttribute("Timescale") || 10000000);
    const adaptationIds : string[] = [];

    const {
      protection,
      adaptations,
    } = reduceChildren(root, (res, name, node) => {
      switch (name) {
      case "Protection":  res.protection = parseProtection(node);  break;
      case "StreamIndex":
        const ada : any = parseAdaptation(node, timescale);
        if (ada) {
          let i = 0;
          let id;
          do {
            id = ada.type + "_" +
              (ada.language ? (ada.language + "_") : "") + i++;
          } while (arrayIncludes(adaptationIds, id));
          ada.id = id;
          adaptationIds.push(id);
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

    let suggestedPresentationDelay;
    let presentationLiveGap;
    let timeShiftBufferDepth;
    let availabilityStartTime;

    const isLive = parseBoolean(root.getAttribute("IsLive"));
    if (isLive) {
      suggestedPresentationDelay = SUGGESTED_PERSENTATION_DELAY;
      timeShiftBufferDepth =
        +(root.getAttribute("DVRWindowLength") || 0) / timescale;
      availabilityStartTime = REFERENCE_DATE_TIME;
      const video = adaptations.filter((a) => a.type === "video")[0];
      const audio = adaptations.filter((a) => a.type === "audio")[0];
      const lastRef = Math.min(calcLastRef(video), calcLastRef(audio));
      presentationLiveGap = Date.now() / 1000 -
        (lastRef + availabilityStartTime);
    }

    return {
      transportType: "smooth",
      profiles: "",
      type: isLive ? "dynamic" : "static",
      suggestedPresentationDelay,
      timeShiftBufferDepth,
      presentationLiveGap,
      availabilityStartTime,
      periods: [{
        duration: +(root.getAttribute("Duration") || Infinity) / timescale,
        adaptations,
        laFragCount: +(root.getAttribute("LookAheadFragmentCount") || 0),
      }],
    };
  }

  const parser = <IParserFunctions> function(val) {
    if (typeof val === "string") {
      return parseFromString(val);
    } else {
      return parseFromDocument(val);
    }
  };

  parser.parseFromString   = parseFromString;
  parser.parseFromDocument = parseFromDocument;

  return parser;
}

export default createSmoothStreamingParser;
