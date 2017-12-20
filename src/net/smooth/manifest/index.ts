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

import config from "../../../config";
import arrayIncludes from "../../../utils/array-includes";
import assert from "../../../utils/assert";
import {
  // bytesToStr,
  // toBase64URL,
  bytesToUTF16Str,
  concat,
  guidToUuid,
  hexToBytes,
  le2toi,
  strToBytes,
} from "../../../utils/bytes";
import generateNewId from "../../../utils/id";
import { normalize as normalizeLang } from "../../../utils/languages";
import log from "../../../utils/log";
import {
  normalizeBaseURL,
  resolveURL,
} from "../../../utils/url";
import { IParsedManifest } from "../../types";
import {
  IAdaptationSmooth,
  IContentProtectionSmooth,
  IHSSKeySystem,
  IHSSManifestSegment,
  IHSSParserOptions,
  IPeriodSmooth,
  IRepresentationSmooth,
 } from "../types";

const DEFAULT_MIME_TYPES: IDictionary<string> = {
  audio: "audio/mp4",
  video: "video/mp4",
  text: "application/ttml+xml",
};

const DEFAULT_CODECS: IDictionary<string> = {
  audio: "mp4a.40.2",
  video: "avc1.4D401E",
};

const MIME_TYPES: IDictionary<string> = {
  AACL: "audio/mp4",
  AVC1: "video/mp4",
  H264: "video/mp4",
  TTML: "application/ttml+xml+mp4",
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
    mpProfile = codecPrivateData ?
      (parseInt(codecPrivateData.substr(0, 2), 16) & 0xF8) >> 3 : 2;
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
  index : {
    timeline : Array<{
      ts : number;
      r : number;
      d? : number;
    }>;
    timescale : number;
  }
) : number {
  const { ts, r, d } = index.timeline[index.timeline.length - 1];
  return ((ts + (r + 1) * (d ? d : 0)) / index.timescale);
}

/**
 * @param {Uint8Array} keyIdBytes
 * @returns {Array.<Object>}
 */
function getKeySystems(
  keyIdBytes : Uint8Array
) : IHSSKeySystem[] {
  return [
    {
      // Widevine
      systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
      privateData: concat([0x08, 0x01, 0x12, 0x10], keyIdBytes),
      // keyIds: [keyIdBytes],
    },
    // {
    //   // Clearkey
    /* tslint:disable:max-line-length */
    //   // (https://dvcs.w3.org/hg/html-media/raw-file/tip/encrypted-media/cenc-format.html)
    /* tslint:enable:max-line-length */
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
) : (manifest : Document, url : string) => IParsedManifest {

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
    const xml = bytesToUTF16Str(buf.subarray(10, len + 10));
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
    keyId : string;
    keySystems: IHSSKeySystem[];
  } {
    const header = root.firstElementChild as Element;
    assert.equal(
      header.nodeName,
      "ProtectionHeader",
      "Protection should have ProtectionHeader child"
    );
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
   * @param {string} type
   * @return {Object}
   */
  function parseQualityLevel(q : Element, type : string) : {
    // required
    bitrate: number;
    codecPrivateData: string;

    // optional
    audiotag?: number;
    bitsPerSample?: number;
    channels?: number;
    codecs?: string;
    height?: number;
    id?: string;
    mimeType?: string;
    packetSize?: number;
    samplingRate?: number;
    width?: number;
  } {
    /**
     * @param {string} name
     * @returns {string|undefined}
     */
    function getAttribute(name: string): string|undefined {
      const attr = q.getAttribute(name);
      return attr == null ? undefined : attr;
    }

    switch (type) {

      case "audio": {
        const audiotag = getAttribute("AudioTag");
        const bitrate = getAttribute("Bitrate");
        const bitsPerSample = getAttribute("BitsPerSample");
        const channels = getAttribute("Channels");
        const codecPrivateData = getAttribute("CodecPrivateData");
        const fourCC = getAttribute("FourCC");
        const packetSize = getAttribute("PacketSize");
        const samplingRate = getAttribute("SamplingRate");

        return {
          audiotag: audiotag !== undefined ? parseInt(audiotag, 10) : audiotag,
          bitrate: bitrate ? parseInt(bitrate, 10) || 0 : 0,
          bitsPerSample: bitsPerSample !== undefined ?
            parseInt(bitsPerSample, 10) : bitsPerSample,
          channels: channels !== undefined ? parseInt(channels, 10) : channels,
          codecPrivateData: codecPrivateData || "",
          mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
          packetSize: packetSize !== undefined ?
            parseInt(packetSize, 10) : packetSize,
          samplingRate: samplingRate !== undefined ?
            parseInt(samplingRate, 10) : samplingRate,
        };
      }

      case "video": {
        const bitrate = getAttribute("Bitrate");
        const codecPrivateData = getAttribute("CodecPrivateData");
        const fourCC = getAttribute("FourCC");
        const width = getAttribute("MaxWidth");
        const height = getAttribute("MaxHeight");

        return {
          bitrate: bitrate ? parseInt(bitrate, 10) || 0 : 0,
          mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
          codecPrivateData: codecPrivateData || "",
          codecs: extractVideoCodecs(codecPrivateData || ""),
          width: width !== undefined ? parseInt(width, 10) : undefined,
          height: height !== undefined ? parseInt(height, 10) : undefined,
        };
      }

      case "text": {
        const bitrate = getAttribute("Bitrate");
        const codecPrivateData = getAttribute("CodecPrivateData");
        const fourCC = getAttribute("FourCC");
        return {
          bitrate: bitrate ? parseInt(bitrate, 10) || 0 : 0,
          mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
          codecPrivateData: codecPrivateData || "",
        };
      }

      default:
        throw new Error("Unrecognized StreamIndex type: " + type);
    }
  }

  /**
   * Parse the adaptations (<StreamIndex>) tree containing
   * representations (<QualityLevels>) and timestamp indexes (<c>).
   * Indexes can be quite huge, and this function needs to
   * to be optimized.
   * @param {Element} root
   * @param {string} rootURL
   * @param {Number} timescale
   * @returns {Object}
   */
  function parseAdaptation(
    root : Element,
    rootURL : string,
    timescale : number
  ): IAdaptationSmooth|null {
    const _timescale = root.hasAttribute("Timescale") ?
      +(root.getAttribute("Timescale") || 0) : timescale;

    const adaptationType = root.getAttribute("Type");
    if (adaptationType == null) {
      throw new Error("StreamIndex without type.");
    }

    const subType = root.getAttribute("Subtype");
    const name = root.getAttribute("Name");
    const language = root.getAttribute("Language");
    const normalizedLanguage = language == null ?
      language : normalizeLang(language);
    const baseURL = root.getAttribute("Url") || "";
    if (__DEV__) {
      assert(baseURL);
    }

    const {
      representations,
      index,
    } = reduceChildren(root, (res, _name, node) => {
      switch (_name) {
        case "QualityLevel":
          const rep = parseQualityLevel(node, adaptationType);
          if (adaptationType === "audio") {
            const fourCC = node.getAttribute("FourCC") || "";

            rep.codecs = extractAudioCodecs(
              fourCC,
              rep.codecPrivateData
            );
          }

          // filter out video representations with small bitrates
          if (adaptationType !== "video" || rep.bitrate > MIN_REPRESENTATION_BITRATE) {
            res.representations.push(rep);
          }
          break;
        case "c":
          res.index.timeline = parseC(node, res.index.timeline);
          break;
      }
      return res;
    }, {
      representations: [] as any[],
      index: {
        timeline: [] as IHSSManifestSegment[],
        indexType: "smooth" as "smooth",
        timescale: _timescale,
        initialization: {},
      },
    });

    // we assume that all representations have the same
    // codec and mimeType
    assert(representations.length, "adaptation should have at least one representation");

    const id = adaptationType + (language ? ("_" + language) : "");

    // apply default properties
    representations.forEach((representation: IRepresentationSmooth) => {
      representation.baseURL = resolveURL(rootURL, baseURL);
      representation.mimeType =
        representation.mimeType || DEFAULT_MIME_TYPES[adaptationType];
      representation.codecs = representation.codecs || DEFAULT_CODECS[adaptationType];
      representation.id = id + "_" + adaptationType + "-" +
        representation.mimeType + "-" +
        representation.codecs + "-" + representation.bitrate;
      representation.index = index;
    });

    // TODO(pierre): real ad-insert support
    if (subType === "ADVT") {
      return null;
    }

    const parsedAdaptation : IAdaptationSmooth = {
      id,
      index,
      type: adaptationType,
      representations,
      name: name == null ? undefined : name,
      language: language == null ? undefined : language,
      normalizedLanguage,
    };

    if (adaptationType === "text" && subType === "DESC") {
      parsedAdaptation.closedCaption = true;
    }

    // TODO check that one, I did not find it in the spec
    // else if (adaptationType === "audio" && subType === "DESC") {
    //   parsedAdaptation.audioDescription = true;
    // }

    return parsedAdaptation;
  }

  function parseFromDocument(doc : Document, url : string): IParsedManifest {
    const rootURL = normalizeBaseURL(url);
    const root = doc.documentElement;
    assert.equal(
      root.nodeName,
      "SmoothStreamingMedia",
      "document root should be SmoothStreamingMedia"
    );
    assert(/^[2]-[0-2]$/
      .test(root.getAttribute("MajorVersion") + "-" + root.getAttribute("MinorVersion")),
      "Version should be 2.0, 2.1 or 2.2");

    const timescale = +(root.getAttribute("Timescale") || 10000000);

    const {
      protection,
      adaptations,
    } = reduceChildren <{
      protection: IContentProtectionSmooth|null;
      adaptations: IAdaptationSmooth[];
    }> (root, (res, name, node) => {
      switch (name) {
      case "Protection":  {
        res.protection = parseProtection(node);
        break;
      }
      case "StreamIndex":
        const adaptation : IAdaptationSmooth|null =
          parseAdaptation(node, rootURL, timescale);
        if (adaptation) {
          res.adaptations.push(adaptation);
        }
        break;
      }
      return res;
    }, {
      protection:  null,
      adaptations: [],
    });

    adaptations.forEach((a) => {
      a.smoothProtection = protection == null ? undefined : protection;
    });

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
      let lastRef;
      {
        const refsToCompare : number[] = [];
        if (video && video.index) {
          refsToCompare.push(calcLastRef(video.index));
        }
        if (audio && audio.index) {
          refsToCompare.push(calcLastRef(audio.index));
        }
        lastRef = Math.min(...refsToCompare);
      }
      presentationLiveGap = Date.now() / 1000 -
        (lastRef + availabilityStartTime);
    }

    const durationInt = parseInt(root.getAttribute("Duration") || "", 10);
    if (isNaN(durationInt)) {
      log.warn("Smooth: Invalid duration");
    }
    const duration = (durationInt || Infinity) / timescale;
    const manifest = {
      availabilityStartTime: availabilityStartTime || 0,
      duration,
      id: "gen-smooth-manifest-" + generateNewId(),
      presentationLiveGap,
      profiles: "",
      suggestedPresentationDelay,
      timeShiftBufferDepth,
      transportType: "smooth",
      type: isLive ? "dynamic" : "static",
      uris: [url],
      periods: [{
        id: "gen-smooth-period-0",
        adaptations,

        start: 0,
        duration,
        laFragCount: +(root.getAttribute("LookAheadFragmentCount") || 0),
      }],
    };
    checkManifestIDs(manifest);
    return manifest;
  }

  return parseFromDocument;
}

/**
 * Ensure that no two adaptations have the same ID and that no two
 * representations from a same adaptation neither.
 *
 * Log and mutate their ID if not until this is verified.
 *
 * @param {Object} manifest
 */
function checkManifestIDs(manifest : IParsedManifest) : void {
  (manifest.periods as IPeriodSmooth[]).forEach(({ adaptations }) => {
    const adaptationIDs : string[] = [];
    adaptations.forEach(adaptation => {
      const adaptationID = adaptation.id;
      if (arrayIncludes(adaptationIDs, adaptationID)) {
        log.warn("Smooth: Two adaptations with the same ID found. Updating.",
          adaptationID);
        const newID =  adaptationID + "-";
        adaptation.id = newID;
        checkManifestIDs(manifest);
        adaptationIDs.push(newID);
      } else {
        adaptationIDs.push(adaptationID);
      }
      const representationIDs : string[] = [];
      adaptation.representations.forEach(representation => {
        const representationID = representation.id;
        if (arrayIncludes(representationIDs, representationID)) {
          log.warn("Smooth: Two representations with the same ID found. Updating.",
            representationID);
          const newID =  representationID + "-";
          representation.id = newID;
          checkManifestIDs(manifest);
          representationIDs.push(newID);
        } else {
          representationIDs.push(representationID);
        }
      });
    });
  });
}

export default createSmoothStreamingParser;
