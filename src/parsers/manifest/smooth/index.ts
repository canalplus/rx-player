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

import objectAssign from "object-assign";
import config from "../../../config";
import assert from "../../../utils/assert";
import generateNewId from "../../../utils/id";
import { normalize as normalizeLang } from "../../../utils/languages";
import {
  normalizeBaseURL,
  resolveURL,
} from "../../../utils/url";
import {
  IContentProtection,
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedManifest,
  IParsedRepresentation,
} from "../types";
import checkManifestIDs from "../utils/check_manifest_ids";
import {
  getAudioCodecs,
  getVideoCodecs,
} from "./get_codecs";
import parseCNodes from "./parse_C_nodes";
import parseProtectionNode, {
  IContentProtectionSmooth,
  IKeySystem,
} from "./parse_protection_node";
import RepresentationIndex from "./representationIndex";
import parseBoolean from "./utils/parseBoolean";
import reduceChildren from "./utils/reduceChildren";
import { replaceRepresentationSmoothTokens } from "./utils/tokens";

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

export interface IHSSParserConfiguration {
  suggestedPresentationDelay? : number;
  referenceDateTime? : number;
  minRepresentationBitrate? : number;
  keySystems? : (hex? : Uint8Array) => IKeySystem[];
}

interface ISmoothParsedQualityLevel {
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
    0;

  /**
   * @param {Element} q
   * @param {string} type
   * @return {Object}
   */
  function parseQualityLevel(
    q : Element,
    type : string
  ) : ISmoothParsedQualityLevel {
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
          codecs: getVideoCodecs(codecPrivateData || ""),
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
    protections : IContentProtectionSmooth[]
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
      qualityLevels,
      cNodes,
    } = reduceChildren<{
      qualityLevels: ISmoothParsedQualityLevel[];
      cNodes : Element[];
    }>(root, (res, _name, node) => {
      switch (_name) {
        case "QualityLevel":
          const qualityLevel = parseQualityLevel(node, adaptationType);
          if (adaptationType === "audio") {
            const fourCC = node.getAttribute("FourCC") || "";

            qualityLevel.codecs = getAudioCodecs(
              fourCC,
              qualityLevel.codecPrivateData
            );
          }

          // filter out video qualityLevels with small bitrates
          if (
            adaptationType !== "video" ||
            qualityLevel.bitrate > MIN_REPRESENTATION_BITRATE
          ) {
            res.qualityLevels.push(qualityLevel);
          }
          break;
        case "c":
          res.cNodes.push(node);
          break;
      }
      return res;
    }, {
      qualityLevels: [],
      cNodes: [],
    });

    const index = {
      timeline: parseCNodes(cNodes),
      timescale: _timescale,
    };

    // we assume that all qualityLevels have the same
    // codec and mimeType
    assert(
      qualityLevels.length !== 0,
      "adaptation should have at least one representation"
    );

    const adaptationID = adaptationType + (language ? ("_" + language) : "");

    const representations = qualityLevels.map((qualityLevel) => {
      const path = resolveURL(rootURL, baseURL);
      const repIndex = {
        timeline: index.timeline,
        timescale: index.timescale,
        media: replaceRepresentationSmoothTokens(path, qualityLevel.bitrate),
      };
      const mimeType = qualityLevel.mimeType || DEFAULT_MIME_TYPES[adaptationType];
      const codecs = qualityLevel.codecs || DEFAULT_CODECS[adaptationType];
      const id =  adaptationID + "_" + adaptationType + "-" + mimeType + "-" +
        codecs + "-" + qualityLevel.bitrate;

      const contentProtections : IContentProtection[] = [];
      let firstProtection : IContentProtectionSmooth|undefined;
      if (protections.length) {
        firstProtection = protections[0];
        protections.forEach((protection) => {
          const keyId = protection.keyId;
          protection.keySystems.forEach((keySystem) => {
            contentProtections.push({
              keyId,
              systemId: keySystem.systemId,
            });
          });
        });
      }

      const initSegmentInfos = {
        bitsPerSample: qualityLevel.bitsPerSample,
        channels: qualityLevel.channels,
        codecPrivateData: qualityLevel.codecPrivateData || "",
        packetSize: qualityLevel.packetSize,
        samplingRate: qualityLevel.samplingRate,

        // TODO set multiple protections here instead of the first one
        protection: firstProtection != null ? {
          keyId: firstProtection.keyId,
          keySystems: firstProtection.keySystems,
        } : undefined,
      };

      const representation : IParsedRepresentation = objectAssign({}, qualityLevel, {
        index: new RepresentationIndex(repIndex, initSegmentInfos),
        mimeType,
        codecs,
        id,
      });
      if (contentProtections.length) {
        representation.contentProtections = contentProtections;
      }
      return representation;
    });

    // TODO(pierre): real ad-insert support
    if (subType === "ADVT") {
      return null;
    }

    const parsedAdaptation : IParsedAdaptation = {
      id: adaptationID,
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
      protections,
      adaptationNodes,
    } = reduceChildren <{
      protections: IContentProtectionSmooth[];
      adaptationNodes: Element[];
    }> (root, (res, name, node) => {
      switch (name) {
      case "Protection":  {
        res.protections.push(parseProtectionNode(node, parserOptions.keySystems));
        break;
      }
      case "StreamIndex":
        res.adaptationNodes.push(node);
        break;
      }
      return res;
    }, {
      adaptationNodes: [],
      protections : [],
    });

    const initialAdaptations: IParsedAdaptations = {};

    const adaptations: IParsedAdaptations = adaptationNodes
      .map((node: Element) => {
        return parseAdaptation(node, rootURL, timescale, protections);
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

export default createSmoothStreamingParser;
