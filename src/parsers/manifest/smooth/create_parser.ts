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
import idGenerator from "../../../utils/id_generator";
import resolveURL, {
  normalizeBaseURL,
} from "../../../utils/resolve_url";
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
import RepresentationIndex from "./representation_index";
import parseBoolean from "./utils/parseBoolean";
import reduceChildren from "./utils/reduceChildren";
import { replaceRepresentationSmoothTokens } from "./utils/tokens";

const generateManifestID = idGenerator();

interface IAdaptationParserArguments {
  root : Element;
  rootURL : string;
  timescale : number;
  protections : IContentProtectionSmooth[];
  isLive : boolean;
  timeShiftBufferDepth? : number;
  manifestReceivedTime? : number;
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
) : (
  manifest : Document,
  url : string,
  manifestReceivedTime? : number
) => IParsedManifest {

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
   * @param {string} streamType
   * @return {Object}
   */
  function parseQualityLevel(
    q : Element,
    streamType : string
  ) : ISmoothParsedQualityLevel {
    /**
     * @param {string} name
     * @returns {string|undefined}
     */
    function getAttribute(name: string) : string|undefined {
      const attr = q.getAttribute(name);
      return attr == null ? undefined : attr;
    }

    switch (streamType) {

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
        throw new Error("Unrecognized StreamIndex type: " + streamType);
    }
  }

  /**
   * Parse the adaptations (<StreamIndex>) tree containing
   * representations (<QualityLevels>) and timestamp indexes (<c>).
   * Indexes can be quite huge, and this function needs to
   * to be optimized.
   * @param {Object} args
   * @returns {Object}
   */
  function parseAdaptation(args: IAdaptationParserArguments) : IParsedAdaptation|null {
    const {
      root,
      timescale,
      rootURL,
      protections,
      timeShiftBufferDepth,
      manifestReceivedTime,
      isLive,
    } = args;
    const _timescale = root.hasAttribute("Timescale") ?
      +(root.getAttribute("Timescale") || 0) : timescale;

    const adaptationType = root.getAttribute("Type");
    if (adaptationType == null) {
      throw new Error("StreamIndex without type.");
    }

    const subType = root.getAttribute("Subtype");
    const language = root.getAttribute("Language");
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
        isLive,
        timeShiftBufferDepth,
        manifestReceivedTime,
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
      language: language == null ?  undefined : language,
    };

    if (adaptationType === "text" && subType === "DESC") {
      parsedAdaptation.closedCaption = true;
    }

    return parsedAdaptation;
  }

  function parseFromDocument(
    doc : Document,
    url : string,
    manifestReceivedTime? : number
  ) : IParsedManifest {
    const rootURL = normalizeBaseURL(url);
    const root = doc.documentElement;
    if (!root || root.nodeName !== "SmoothStreamingMedia") {
      throw new Error("document root should be SmoothStreamingMedia");
    }
    if (!
      /^[2]-[0-2]$/.test(
        root.getAttribute("MajorVersion") + "-" + root.getAttribute("MinorVersion")
      )
    ) {
      throw new Error("Version should be 2.0, 2.1 or 2.2");
    }

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

    const isLive = parseBoolean(root.getAttribute("IsLive"));

    const timeShiftBufferDepth = isLive ?
      +(root.getAttribute("DVRWindowLength") || 0) / timescale :
      undefined;

    const adaptations: IParsedAdaptations = adaptationNodes
      .map((node: Element) => {
        return parseAdaptation({
          root: node,
          rootURL,
          timescale,
          protections,
          isLive,
          timeShiftBufferDepth,
          manifestReceivedTime,
        });
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
    let availabilityStartTime : number|undefined;
    let minimumTime : { isContinuous : boolean; value : number; time : number}|undefined;
    let maximumTime : { isContinuous : boolean; value : number; time : number}|undefined;

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

    let duration : number|undefined;
    if (isLive) {
      suggestedPresentationDelay = SUGGESTED_PERSENTATION_DELAY;
      availabilityStartTime = REFERENCE_DATE_TIME;

      const time = performance.now();
      maximumTime = {
        isContinuous: true,
        value: lastTimeReference != null ?
          lastTimeReference : (Date.now() / 1000 - availabilityStartTime),
        time,
      };
      minimumTime = {
        isContinuous: true,
        value: Math.min(
          maximumTime.value - (timeShiftBufferDepth || 0) + 5,
          maximumTime.value
        ),
        time,
      };
      const manifestDuration = root.getAttribute("Duration");
      duration = (manifestDuration != null && +manifestDuration !== 0) ?
        (+manifestDuration / timescale) : undefined;

    } else {
      minimumTime = {
        isContinuous: false,
        value: firstTimeReference != null ? firstTimeReference : 0,
        time: performance.now(),
      };

      // if non-live and first time reference different than 0. Add first time reference
      // to duration
      const manifestDuration = root.getAttribute("Duration");

      if (manifestDuration != null && +manifestDuration !== 0) {
        duration = lastTimeReference == null ?
          (+manifestDuration / timescale) + (firstTimeReference || 0) :
          lastTimeReference;
      } else {
        duration = undefined;
      }
    }

    const manifest = {
      id: "gen-smooth-manifest-" + generateManifestID(),
      isLive,
      periods: [{
        id: "gen-smooth-period-0",
        duration,
        adaptations,
        start: 0,
      }],
      transportType: "smooth",

      availabilityStartTime: availabilityStartTime || 0,
      duration,
      maximumTime,
      minimumTime,
      suggestedPresentationDelay,
      uris: [url],
    };
    checkManifestIDs(manifest);
    return manifest;
  }

  return parseFromDocument;
}

export default createSmoothStreamingParser;
