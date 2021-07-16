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

import log from "../../../log";
import { SUPPORTED_ADAPTATIONS_TYPE } from "../../../manifest";
import arrayIncludes from "../../../utils/array_includes";
import assert from "../../../utils/assert";
import {
  concat,
  itobe4,
} from "../../../utils/byte_parsing";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import objectAssign from "../../../utils/object_assign";
import resolveURL, {
  normalizeBaseURL,
} from "../../../utils/resolve_url";
import { hexToBytes } from "../../../utils/string_parsing";
import takeFirstSet from "../../../utils/take_first_set";
import { createBox } from "../../containers/isobmff";
import {
  IContentProtectionKID,
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

/**
 * Default value for the aggressive `mode`.
 * In this mode, segments will be returned even if we're not sure those had time
 * to be generated.
 */
const DEFAULT_AGGRESSIVE_MODE = false;

interface IAdaptationParserArguments { root : Element;
                                       rootURL : string;
                                       timescale : number;
                                       protections : IContentProtectionSmooth[];
                                       isLive : boolean;
                                       timeShiftBufferDepth? : number;
                                       manifestReceivedTime? : number; }

type IAdaptationType = "audio" |
                       "video" |
                       "text";

const DEFAULT_MIME_TYPES : Partial<Record<string, string>> = {
  audio: "audio/mp4",
  video: "video/mp4",
  text: "application/ttml+xml",
};

const MIME_TYPES : Partial<Record<string, string>> = {
  AACL: "audio/mp4",
  AVC1: "video/mp4",
  H264: "video/mp4",
  TTML: "application/ttml+xml+mp4",
};

export interface IHSSParserConfiguration {
  aggressiveMode? : boolean;
  suggestedPresentationDelay? : number;
  referenceDateTime? : number;
  minRepresentationBitrate? : number;
  keySystems? : (hex? : Uint8Array) => IKeySystem[];
  serverSyncInfos? : {
    serverTimestamp: number;
    clientTime: number;
  };
}

interface ISmoothParsedQualityLevel {
  // required
  bitrate : number;
  codecPrivateData : string;
  customAttributes : string[];

  // optional
  audiotag? : number;
  bitsPerSample? : number;
  channels? : number;
  codecs? : string;
  height? : number;
  id? : string;
  mimeType? : string;
  packetSize? : number;
  samplingRate? : number;
  width? : number;
}

/**
 * @param {Object|undefined} parserOptions
 * @returns {Function}
 */
function createSmoothStreamingParser(
  parserOptions : IHSSParserConfiguration = {}
) : (manifest : Document, url? : string, manifestReceivedTime? : number)
  => IParsedManifest
{
  const referenceDateTime = parserOptions.referenceDateTime === undefined ?
    Date.UTC(1970, 0, 1, 0, 0, 0, 0) / 1000 :
    parserOptions.referenceDateTime;
  const minRepresentationBitrate =
    parserOptions.minRepresentationBitrate === undefined ?
      0 :
      parserOptions.minRepresentationBitrate;

  const { serverSyncInfos } = parserOptions;
  const serverTimeOffset = serverSyncInfos !== undefined ?
    serverSyncInfos.serverTimestamp - serverSyncInfos.clientTime :
    undefined;

  /**
   * @param {Element} q
   * @param {string} streamType
   * @return {Object}
   */
  function parseQualityLevel(
    q : Element,
    streamType : string
  ) : ISmoothParsedQualityLevel|null {

    const customAttributes = reduceChildren<string[]>(q, (acc, qName, qNode) => {
      if (qName === "CustomAttributes") {
        acc.push(...reduceChildren<string[]>(qNode, (cAttrs, cName, cNode) => {
          if (cName === "Attribute") {
            const name = cNode.getAttribute("Name");
            const value = cNode.getAttribute("Value");
            if (name !== null && value !== null) {
              cAttrs.push(name + "=" + value);
            }
          }
          return cAttrs;
        }, []));
      }
      return acc;
    }, []);

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
        const bitsPerSample = getAttribute("BitsPerSample");
        const channels = getAttribute("Channels");
        const codecPrivateData = getAttribute("CodecPrivateData");
        const fourCC = getAttribute("FourCC");
        const packetSize = getAttribute("PacketSize");
        const samplingRate = getAttribute("SamplingRate");
        const bitrateAttr = getAttribute("Bitrate");
        const bitrate = bitrateAttr === undefined ? 0 :
                        isNaN(parseInt(bitrateAttr, 10)) ? 0 :
                                                           parseInt(bitrateAttr, 10);

        if ((fourCC !== undefined &&
             MIME_TYPES[fourCC] === undefined) ||
            codecPrivateData === undefined) {
          log.warn("Smooth parser: Unsupported audio codec. Ignoring quality level.");
          return null;
        }

        const codecs = getAudioCodecs(codecPrivateData, fourCC);

        return {
          audiotag: audiotag !== undefined ? parseInt(audiotag, 10) : audiotag,
          bitrate,
          bitsPerSample: bitsPerSample !== undefined ?
            parseInt(bitsPerSample, 10) : bitsPerSample,
          channels: channels !== undefined ? parseInt(channels, 10) : channels,
          codecPrivateData,
          codecs,
          customAttributes,
          mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
          packetSize: packetSize !== undefined ?
            parseInt(packetSize, 10) :
            packetSize,
          samplingRate: samplingRate !== undefined ?
            parseInt(samplingRate, 10) :
            samplingRate,
        };
      }

      case "video": {
        const codecPrivateData = getAttribute("CodecPrivateData");
        const fourCC = getAttribute("FourCC");
        const width = getAttribute("MaxWidth");
        const height = getAttribute("MaxHeight");
        const bitrateAttr = getAttribute("Bitrate");
        const bitrate = bitrateAttr === undefined ? 0 :
                        isNaN(parseInt(bitrateAttr, 10)) ? 0 :
                                                           parseInt(bitrateAttr, 10);

        if ((fourCC !== undefined &&
             MIME_TYPES[fourCC] === undefined) ||
            codecPrivateData === undefined) {
          log.warn("Smooth parser: Unsupported video codec. Ignoring quality level.");
          return null;
        }

        const codecs = getVideoCodecs(codecPrivateData);

        return {
          bitrate,
          customAttributes,
          mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
          codecPrivateData,
          codecs,
          width: width !== undefined ? parseInt(width, 10) : undefined,
          height: height !== undefined ? parseInt(height, 10) : undefined,
        };
      }

      case "text": {
        const codecPrivateData = getAttribute("CodecPrivateData");
        const fourCC = getAttribute("FourCC");
        const bitrateAttr = getAttribute("Bitrate");
        const bitrate = bitrateAttr === undefined ? 0 :
                        isNaN(parseInt(bitrateAttr, 10)) ? 0 :
                                                           parseInt(bitrateAttr, 10);
        return { bitrate,
                 customAttributes,
                 mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] :
                                                  fourCC,
                 codecPrivateData: takeFirstSet<string>(codecPrivateData, "") };
      }

      default:
        log.error("Smooth Parser: Unrecognized StreamIndex type: " + streamType);
        return null;
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
    const { root,
            timescale,
            rootURL,
            protections,
            timeShiftBufferDepth,
            manifestReceivedTime,
            isLive } = args;
    const timescaleAttr = root.getAttribute("Timescale");
    const _timescale = timescaleAttr === null ? timescale :
                       isNaN(+timescaleAttr) ? timescale :
                                               +timescaleAttr;

    const typeAttribute = root.getAttribute("Type");
    if (typeAttribute === null) {
      throw new Error("StreamIndex without type.");
    }
    if (!arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, typeAttribute)) {
      log.warn("Smooth Parser: Unrecognized adaptation type:", typeAttribute);
    }
    const adaptationType = typeAttribute as IAdaptationType;

    const subType = root.getAttribute("Subtype");
    const language = root.getAttribute("Language");
    const baseURLAttr = root.getAttribute("Url");
    const baseURL = baseURLAttr === null ? "" :
                                           baseURLAttr;
    if (__DEV__) {
      assert(baseURL !== "");
    }

    const { qualityLevels, cNodes } =
      reduceChildren<
        { qualityLevels: ISmoothParsedQualityLevel[];
          cNodes : Element[]; }
      >(root, (res, _name, node) => {
        switch (_name) {
          case "QualityLevel":
            const qualityLevel = parseQualityLevel(node, adaptationType);
            if (qualityLevel === null) {
              return res;
            }

            // filter out video qualityLevels with small bitrates
            if (adaptationType !== "video" ||
                qualityLevel.bitrate > minRepresentationBitrate)
            {
              res.qualityLevels.push(qualityLevel);
            }
            break;
          case "c":
            res.cNodes.push(node);
            break;
        }
        return res;
      }, { qualityLevels: [], cNodes: [] });

    const index = { timeline: parseCNodes(cNodes),
                    timescale: _timescale };

    // we assume that all qualityLevels have the same
    // codec and mimeType
    assert(qualityLevels.length !== 0,
           "Adaptation should have at least one playable representation.");

    const adaptationID = adaptationType +
                         (isNonEmptyString(language) ? ("_" + language) :
                                                       "");

    const representations = qualityLevels.map((qualityLevel) => {
      const path = resolveURL(rootURL, baseURL);
      const repIndex = {
        timeline: index.timeline,
        timescale: index.timescale,
        media: replaceRepresentationSmoothTokens(path,
                                                 qualityLevel.bitrate,
                                                 qualityLevel.customAttributes),
      };
      const mimeType = isNonEmptyString(qualityLevel.mimeType) ?
        qualityLevel.mimeType :
        DEFAULT_MIME_TYPES[adaptationType];
      const codecs = qualityLevel.codecs;
      const id =  adaptationID + "_" +
                  (adaptationType != null ? adaptationType + "-" :
                                            "") +
                  (mimeType != null ? mimeType + "-" :
                                      "") +
                  (codecs != null ? codecs + "-" :
                                    "") +
                  String(qualityLevel.bitrate);

      const keyIDs : IContentProtectionKID[] = [];
      let firstProtection : IContentProtectionSmooth|undefined;
      if (protections.length > 0) {
        firstProtection = protections[0];
        protections.forEach((protection) => {
          const keyId = protection.keyId;
          protection.keySystems.forEach((keySystem) => {
            keyIDs.push({ keyId,
                          systemId: keySystem.systemId });
          });
        });
      }

      const segmentPrivateInfos = { bitsPerSample: qualityLevel.bitsPerSample,
                                    channels: qualityLevel.channels,
                                    codecPrivateData: qualityLevel.codecPrivateData,
                                    packetSize: qualityLevel.packetSize,
                                    samplingRate: qualityLevel.samplingRate,

                                    // TODO set multiple protections here
                                    // instead of the first one
                                    protection: firstProtection != null ? {
                                      keyId: firstProtection.keyId,
                                    } : undefined };

      const aggressiveMode = parserOptions.aggressiveMode == null ?
        DEFAULT_AGGRESSIVE_MODE :
        parserOptions.aggressiveMode;
      const reprIndex = new RepresentationIndex(repIndex, { aggressiveMode,
                                                            isLive,
                                                            manifestReceivedTime,
                                                            segmentPrivateInfos,
                                                            timeShiftBufferDepth });
      const representation : IParsedRepresentation = objectAssign({},
                                                                  qualityLevel,
                                                                  { index: reprIndex,
                                                                    mimeType,
                                                                    codecs,
                                                                    id });
      if (keyIDs.length > 0 || firstProtection !== undefined) {
        const initDataValues : Array<{ systemId: string;
                                       data: Uint8Array; }> =
          firstProtection === undefined ?
            [] :
            firstProtection.keySystems.map((keySystemData) => {
              const { systemId, privateData } = keySystemData;
              const cleanedSystemId = systemId.replace(/-/g, "");
              const pssh = createPSSHBox(cleanedSystemId, privateData);
              return { systemId: cleanedSystemId, data: pssh };
            });
        if (initDataValues.length > 0) {
          const initData = [{ type: "cenc", values: initDataValues }];
          representation.contentProtections = { keyIds: keyIDs, initData };
        } else {
          representation.contentProtections = { keyIds: keyIDs, initData: [] };
        }
      }
      return representation;
    });

    // TODO(pierre): real ad-insert support
    if (subType === "ADVT") {
      return null;
    }

    const parsedAdaptation : IParsedAdaptation = { id: adaptationID,
                                                   type: adaptationType,
                                                   representations,
                                                   language: language == null ?
                                                     undefined :
                                                     language };

    if (adaptationType === "text" && subType === "DESC") {
      parsedAdaptation.closedCaption = true;
    }

    return parsedAdaptation;
  }

  function parseFromDocument(
    doc : Document,
    url? : string,
    manifestReceivedTime? : number
  ) : IParsedManifest {
    const rootURL = normalizeBaseURL(url == null ? "" : url);
    const root = doc.documentElement;
    if (root == null || root.nodeName !== "SmoothStreamingMedia") {
      throw new Error("document root should be SmoothStreamingMedia");
    }
    const majorVersionAttr = root.getAttribute("MajorVersion");
    const minorVersionAttr = root.getAttribute("MinorVersion");
    if (majorVersionAttr === null || minorVersionAttr === null ||
        !/^[2]-[0-2]$/.test(majorVersionAttr + "-" + minorVersionAttr))
    {
      throw new Error("Version should be 2.0, 2.1 or 2.2");
    }

    const timescaleAttr = root.getAttribute("Timescale");
    const timescale = !isNonEmptyString(timescaleAttr) ? 10000000 :
                      isNaN(+timescaleAttr) ? 10000000 :
                      +timescaleAttr;

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

    let timeShiftBufferDepth : number|undefined;
    if (isLive) {
      const dvrWindowLength = root.getAttribute("DVRWindowLength");
      if (dvrWindowLength != null &&
          !isNaN(+dvrWindowLength) &&
          +dvrWindowLength !== 0)
      {
        timeShiftBufferDepth = +dvrWindowLength / timescale;
      }
    }

    const adaptations: IParsedAdaptations = adaptationNodes
      .reduce((acc: IParsedAdaptations, node : Element) => {
        const adaptation = parseAdaptation({ root: node,
                                             rootURL,
                                             timescale,
                                             protections,
                                             isLive,
                                             timeShiftBufferDepth,
                                             manifestReceivedTime });
        if (adaptation === null) {
          return acc;
        }
        const type = adaptation.type;
        const adaps = acc[type];
        if (adaps === undefined) {
          acc[type] = [adaptation];
        } else {
          adaps.push(adaptation);
        }
        return acc;
      }, initialAdaptations);

    let suggestedPresentationDelay : number|undefined;
    let availabilityStartTime : number|undefined;
    let minimumTime : number | undefined;
    let timeshiftDepth : number | null = null;
    let maximumTimeData : { isLinear : boolean; value : number; time : number };

    const firstVideoAdaptation = adaptations.video !== undefined ?
      adaptations.video[0] :
      undefined;
    const firstAudioAdaptation = adaptations.audio !== undefined ?
      adaptations.audio[0] :
      undefined;
    let firstTimeReference : number|undefined;
    let lastTimeReference : number|undefined;

    if (firstVideoAdaptation !== undefined || firstAudioAdaptation !== undefined) {
      const firstTimeReferences : number[] = [];
      const lastTimeReferences : number[] = [];

      if (firstVideoAdaptation !== undefined) {
        const firstVideoRepresentation = firstVideoAdaptation.representations[0];
        if (firstVideoRepresentation !== undefined) {
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

      if (firstAudioAdaptation !== undefined) {
        const firstAudioRepresentation = firstAudioAdaptation.representations[0];
        if (firstAudioRepresentation !== undefined) {
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

      if (firstTimeReferences.length > 0) {
        firstTimeReference = Math.max(...firstTimeReferences);
      }

      if (lastTimeReferences.length > 0) {
        lastTimeReference = Math.min(...lastTimeReferences);
      }
    }

    const manifestDuration = root.getAttribute("Duration");
    const duration = (manifestDuration != null && +manifestDuration !== 0) ?
      (+manifestDuration / timescale) : undefined;

    if (isLive) {
      suggestedPresentationDelay = parserOptions.suggestedPresentationDelay;
      availabilityStartTime = referenceDateTime;

      minimumTime = firstTimeReference ?? availabilityStartTime;
      const maximumTime = lastTimeReference != null ?
        lastTimeReference :
        (Date.now() / 1000 - availabilityStartTime);
      maximumTimeData = { isLinear: true,
                          value: maximumTime,
                          time: performance.now() };
      timeshiftDepth = timeShiftBufferDepth ?? null;
    } else {
      minimumTime = firstTimeReference ?? 0;
      const maximumTime = lastTimeReference !== undefined ? lastTimeReference :
                          duration !== undefined ? minimumTime + duration :
                                                   Infinity;
      maximumTimeData = { isLinear: false,
                          value: maximumTime,
                          time: performance.now() };
    }

    const periodStart = isLive ? 0 :
                                 minimumTime;
    const periodEnd = isLive ? undefined :
                               maximumTimeData.value;
    const manifest = {
      availabilityStartTime: availabilityStartTime === undefined ?
        0 :
        availabilityStartTime,
      clockOffset: serverTimeOffset,
      isLive,
      isDynamic: isLive,
      isLastPeriodKnown: true,
      timeBounds: { absoluteMinimumTime: minimumTime,
                    timeshiftDepth,
                    maximumTimeData },
      periods: [{ adaptations,
                  duration: periodEnd !== undefined ?
                    periodEnd - periodStart : duration,
                  end: periodEnd,
                  id: "gen-smooth-period-0",
                  start: periodStart }],
      suggestedPresentationDelay,
      transportType: "smooth",
      uris: url == null ? [] : [url],
    };
    checkManifestIDs(manifest);
    return manifest;
  }

  return parseFromDocument;
}

/**
 * @param {string} systemId - Hex string representing the CDM, 16 bytes.
 * @param {Uint8Array|undefined} privateData - Data associated to protection
 * specific system.
 * @returns {Uint8Array}
 */
function createPSSHBox(
  systemId : string,
  privateData : Uint8Array
) : Uint8Array {
  if (systemId.length !== 32) {
    throw new Error("HSS: wrong system id length");
  }
  const version = 0;
  return createBox("pssh", concat(
    [version, 0, 0, 0],
    hexToBytes(systemId),
    /** To put there KIDs if it exists (necessitate PSSH v1) */
    itobe4(privateData.length),
    privateData
  ));
}


export default createSmoothStreamingParser;
