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
import log from "../../../log";
import arrayIncludes from "../../../utils/array-includes";
import assert from "../../../utils/assert";
import {
  bytesToUTF16Str,
  concat,
  guidToUuid,
  hexToBytes,
  le2toi,
  strToBytes,
} from "../../../utils/bytes";
import generateNewId from "../../../utils/id";
import { normalize as normalizeLang } from "../../../utils/languages";
import {
  normalizeBaseURL,
  resolveURL,
} from "../../../utils/url";
import {
  IKeySystem,
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedManifest,
  IParsedRepresentation,
} from "../types";
import { replaceRepresentationSmoothTokens } from "./helpers";
import RepresentationIndex from "./representationIndex";

interface IHSSManifestSegment {
  ts : number;
  d : number;
  r : number;
}

const DEFAULT_MIME_TYPES: Partial<Record<string, string>> = {
  audio: "audio/mp4",
  video: "video/mp4",
  text: "application/ttml+xml",
};

const DEFAULT_CODECS: Partial<Record<string, string>> = {
  audio: "mp4a.40.2",
  video: "avc1.4D401E",
};

const MIME_TYPES: Partial<Record<string, string>> = {
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
 * @param {Uint8Array} keyIdBytes
 * @returns {Array.<Object>}
 */
function getKeySystems(
  keyIdBytes : Uint8Array
) : IKeySystem[] {
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

export interface IHSSParserConfiguration {
  suggestedPresentationDelay? : number;
  referenceDateTime? : number;
  minRepresentationBitrate? : number;
  keySystems? : (hex? : Uint8Array) => IKeySystem[];
}

export interface IContentProtectionSmooth {
  keyId : string;
  keySystems: IKeySystem[];
}

/**
 * @param {Object|undefined} parserOptions
 * @returns {Function}
 */
function createSmoothStreamingParser(
  parserOptions : IHSSParserConfiguration = {}
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
    keySystems: IKeySystem[];
  } {
    if (
      !root.firstElementChild ||
      root.firstElementChild.nodeName !== "ProtectionHeader"
    ) {
      throw new Error("Protection should have ProtectionHeader child");
    }
    const header = root.firstElementChild;
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
   * Parse C nodes to build index timeline.
   * @param {Element} nodes
   */
  function parseCNodes(
    nodes : Element[]
  ) : IHSSManifestSegment[] {
    return nodes.reduce<IHSSManifestSegment[]>((timeline, node , i) => {
      const dAttr = node.getAttribute("d");
      const tAttr = node.getAttribute("t");
      const rAttr = node.getAttribute("r");

      const r = rAttr ? +rAttr - 1 : 0;
      let ts = tAttr ? +tAttr : undefined;
      let d = dAttr ? +dAttr : undefined;

      if (i === 0) { // first node
        ts = ts || 0;
      } else { // from second node to the end
        const prev = timeline[i - 1];
        if (ts == null || isNaN(ts)) {
          if (prev.d == null || isNaN(prev.d)) {
            throw new Error("Smooth: Invalid CNodes. Missing timestamp.");
          }
          ts = prev.ts + prev.d * (prev.r + 1);
        }
      }
      if (d == null || isNaN(d)) {
        const nextNode = nodes[i + 1];
        if (nextNode) {
          const nextTAttr = nextNode.getAttribute("t");
          const nextTS = nextTAttr ? +nextTAttr : null;
          if (nextTS === null) {
            throw new Error(
              "Can't build index timeline from Smooth Manifest.");
          }
          d = nextTS - ts;
        } else {
          return timeline;
        }
      }
      timeline.push({ d, ts, r });
      return timeline;
    }, []);
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
    function getAttribute(name: string) : string|undefined {
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
    timescale : number,
    protection? : IContentProtectionSmooth
  ) : IParsedAdaptation|null {
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
      assert(baseURL !== "");
    }

    const {
      representations,
      cNodes,
    } = reduceChildren<{
      representations: any[]; /* TODO */
      cNodes : Element[];
    }>(root, (res, _name, node) => {
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
          res.cNodes.push(node);
          break;
      }
      return res;
    }, {
      representations: [],
      cNodes: [],
    });

    const index = {
      timeline: parseCNodes(cNodes),
      timescale: _timescale,
    };

    // we assume that all representations have the same
    // codec and mimeType
    assert(
      representations.length !== 0,
      "adaptation should have at least one representation"
    );

    const id = adaptationType + (language ? ("_" + language) : "");

    // apply default properties
    representations.forEach((representation: IParsedRepresentation) => {
      const path = resolveURL(rootURL, baseURL);
      const repIndex = {
        timeline: index.timeline,
        timescale: index.timescale,
        media: replaceRepresentationSmoothTokens(path, representation),
      };
      representation.mimeType =
        representation.mimeType || DEFAULT_MIME_TYPES[adaptationType];
      representation.codecs = representation.codecs || DEFAULT_CODECS[adaptationType];
      representation.id = id + "_" + adaptationType + "-" +
        representation.mimeType + "-" +
        representation.codecs + "-" + representation.bitrate;

      const initSegmentInfos = {
        bitsPerSample: representation.bitsPerSample,
        channels: representation.channels,
        codecPrivateData: representation.codecPrivateData || "",
        packetSize: representation.packetSize,
        samplingRate: representation.samplingRate,
        protection,
      };
      representation.index = new RepresentationIndex(repIndex, initSegmentInfos);
    });

    // TODO(pierre): real ad-insert support
    if (subType === "ADVT") {
      return null;
    }

    const parsedAdaptation : IParsedAdaptation = {
      id,
      type: adaptationType,
      representations,
      name: name == null ? undefined : name,
      language: language == null ?
        undefined : language,
      normalizedLanguage: normalizedLanguage == null ?
        undefined : normalizedLanguage,
    };

    if (adaptationType === "text" && subType === "DESC") {
      parsedAdaptation.closedCaption = true;
    }

    return parsedAdaptation;
  }

  function parseFromDocument(doc : Document, url : string) : IParsedManifest {
    const rootURL = normalizeBaseURL(url);
    const root = doc.documentElement;
    assert(
      root.nodeName === "SmoothStreamingMedia",
      "document root should be SmoothStreamingMedia"
    );
    assert(/^[2]-[0-2]$/
      .test(root.getAttribute("MajorVersion") + "-" + root.getAttribute("MinorVersion")),
      "Version should be 2.0, 2.1 or 2.2");

    const timescale = +(root.getAttribute("Timescale") || 10000000);

    const {
      protection,
      adaptationNodes,
    } = reduceChildren <{
      protection?: IContentProtectionSmooth;
      adaptationNodes: Element[];
    }> (root, (res, name, node) => {
      switch (name) {
      case "Protection":  {
        res.protection = parseProtection(node);
        break;
      }
      case "StreamIndex":
        res.adaptationNodes.push(node);
        break;
      }
      return res;
    }, {
      adaptationNodes: [],
    });

    const initialAdaptations: IParsedAdaptations = {};

    const adaptations: IParsedAdaptations = adaptationNodes
      .map((node: Element) => {
        return parseAdaptation(node, rootURL, timescale, protection);
      })
      .filter((adaptation) : adaptation is IParsedAdaptation => adaptation != null)
      .reduce((acc: IParsedAdaptations, adaptation) => {
        const type = adaptation.type;
        if (acc[type] === undefined) {
          acc[type] = [adaptation];
        } else {
          (acc[type] || []).push(adaptation);
        }
        return acc;
      }, initialAdaptations);

    let suggestedPresentationDelay : number|undefined;
    let presentationLiveGap : number|undefined;
    let timeShiftBufferDepth : number|undefined;
    let availabilityStartTime : number|undefined;
    let duration : number;

    const firstVideoAdaptation = adaptations.video ? adaptations.video[0] : undefined;
    const firstAudioAdaptation = adaptations.audio ? adaptations.audio[0] : undefined;
    let firstTimeReference : number|undefined;
    let lastTimeReference : number|undefined;

    if (firstVideoAdaptation || firstAudioAdaptation) {
      const firstTimeReferences : number[] = [];
      const lastTimeReferences : number[] = [];

      if (firstVideoAdaptation) {
        const firstVideoRepresentation = firstVideoAdaptation.representations[0];
        if (firstVideoRepresentation) {
          const firstVideoTimeReference =
            firstVideoRepresentation.index.getFirstPosition();
          const lastVideoTimeReference =
            firstVideoRepresentation.index.getLastPosition();

          if (firstVideoTimeReference != null) {
            firstTimeReferences.push(firstVideoTimeReference);
          }

          if (lastVideoTimeReference != null) {
            lastTimeReferences.push(lastVideoTimeReference);
          }
        }
      }

      if (firstAudioAdaptation) {
        const firstAudioRepresentation = firstAudioAdaptation.representations[0];
        if (firstAudioRepresentation) {
          const firstAudioTimeReference =
            firstAudioRepresentation.index.getFirstPosition();
          const lastAudioTimeReference =
            firstAudioRepresentation.index.getLastPosition();

          if (firstAudioTimeReference != null) {
            firstTimeReferences.push(firstAudioTimeReference);
          }

          if (lastAudioTimeReference != null) {
            lastTimeReferences.push(lastAudioTimeReference);
          }
        }
      }

      if (firstTimeReferences.length) {
        firstTimeReference = Math.max(...firstTimeReferences);
      }

      if (lastTimeReferences.length) {
        lastTimeReference = Math.max(...lastTimeReferences);
      }
    }

    const isLive = parseBoolean(root.getAttribute("IsLive"));
    if (isLive) {
      suggestedPresentationDelay = SUGGESTED_PERSENTATION_DELAY;
      timeShiftBufferDepth =
        +(root.getAttribute("DVRWindowLength") || 0) / timescale;
      availabilityStartTime = REFERENCE_DATE_TIME;
      presentationLiveGap = Date.now() / 1000 -
        (lastTimeReference != null ?
          (lastTimeReference + availabilityStartTime) : 10);
      const manifestDuration = root.getAttribute("Duration");
      duration = (manifestDuration != null && +manifestDuration !== 0) ?
        (+manifestDuration / timescale) : Infinity;
    } else {
      // if non-live and first time reference different than 0. Add first time reference
      // to duration
      const manifestDuration = root.getAttribute("Duration");

      if (manifestDuration != null && +manifestDuration !== 0) {
        duration = lastTimeReference == null ?
          (+manifestDuration + (firstTimeReference || 0)) / timescale :
          lastTimeReference;
      } else {
        duration = Infinity;
      }

    }

    const minimumTime = firstTimeReference != null ?
      firstTimeReference / timescale : undefined;

    const manifest = {
      id: "gen-smooth-manifest-" + generateNewId(),
      availabilityStartTime: availabilityStartTime || 0,
      duration,
      presentationLiveGap,
      suggestedPresentationDelay,
      timeShiftBufferDepth,
      transportType: "smooth",
      type: isLive ? "dynamic" : "static",
      uris: [url],
      minimumTime,
      periods: [{
        id: "gen-smooth-period-0",
        duration,
        adaptations,
        start: 0,
        // laFragCount: +(root.getAttribute("LookAheadFragmentCount") || 0),
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
  manifest.periods.forEach(({ adaptations }) => {
    const adaptationIDs : string[] = [];
    Object.keys(adaptations).forEach((type) => {
      (adaptations[type] || []).forEach(adaptation => {
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
  });
}

export default createSmoothStreamingParser;
