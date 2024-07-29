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
import { SUPPORTED_TRACK_TYPE } from "../../../manifest";
import type { ITrackType } from "../../../public_types";
import arrayIncludes from "../../../utils/array_includes";
import assert from "../../../utils/assert";
import { concat, itobe4 } from "../../../utils/byte_parsing";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import objectAssign from "../../../utils/object_assign";
import { getFilenameIndexInUrl } from "../../../utils/resolve_url";
import { hexToBytes } from "../../../utils/string_parsing";
import { createBox } from "../../containers/isobmff";
import type {
  IParsedTrack,
  IParsedManifest,
  IParsedRepresentation,
  IParsedVariantStreamMetadata,
} from "../types";
import checkManifestIDs from "../utils/check_manifest_ids";
import { getAudioCodecs, getVideoCodecs } from "./get_codecs";
import parseCNodes from "./parse_C_nodes";
import type { IContentProtectionSmooth, IKeySystem } from "./parse_protection_node";
import parseProtectionNode from "./parse_protection_node";
import RepresentationIndex from "./representation_index";
import SharedSmoothSegmentTimeline from "./shared_smooth_segment_timeline";
import parseBoolean from "./utils/parseBoolean";
import reduceChildren from "./utils/reduceChildren";
import { replaceRepresentationSmoothTokens } from "./utils/tokens";

interface ITrackParserArguments {
  root: Element;
  baseUrl: string;
  timescale: number;
  protections: IContentProtectionSmooth[];
  isLive: boolean;
  timeShiftBufferDepth?: number | undefined;
  manifestReceivedTime?: number | undefined;
}

const DEFAULT_MIME_TYPES: Partial<Record<string, string>> = {
  audio: "audio/mp4",
  video: "video/mp4",
  text: "application/ttml+xml",
};

const MIME_TYPES: Partial<Record<string, string>> = {
  AACL: "audio/mp4",
  AVC1: "video/mp4",
  H264: "video/mp4",
  TTML: "application/ttml+xml+mp4",
  DFXP: "application/ttml+xml+mp4",
};

export interface IHSSParserConfiguration {
  suggestedPresentationDelay?: number | undefined;
  referenceDateTime?: number | undefined;
  minRepresentationBitrate?: number | undefined;
  keySystems?: ((hex: Uint8Array | undefined) => IKeySystem[]) | undefined;
  serverSyncInfos?:
    | {
        serverTimestamp: number;
        clientTime: number;
      }
    | undefined;
}

interface ISmoothParsedQualityLevel {
  // required
  bitrate: number;
  codecPrivateData: string;
  customAttributes: string[];

  // optional
  audiotag?: number | undefined;
  bitsPerSample?: number | undefined;
  channels?: number | undefined;
  codecs?: string | undefined;
  height?: number | undefined;
  id?: string | undefined;
  mimeType?: string | undefined;
  packetSize?: number | undefined;
  samplingRate?: number | undefined;
  width?: number | undefined;
}

/**
 * @param {Object|undefined} parserOptions
 * @returns {Function}
 */
function createSmoothStreamingParser(
  parserOptions: IHSSParserConfiguration = {},
): (
  manifest: Document,
  url?: string | undefined,
  manifestReceivedTime?: number | undefined,
) => IParsedManifest {
  const referenceDateTime =
    parserOptions.referenceDateTime === undefined
      ? Date.UTC(1970, 0, 1, 0, 0, 0, 0) / 1000
      : parserOptions.referenceDateTime;
  const minRepresentationBitrate =
    parserOptions.minRepresentationBitrate === undefined
      ? 0
      : parserOptions.minRepresentationBitrate;

  const { serverSyncInfos } = parserOptions;
  const serverTimeOffset =
    serverSyncInfos !== undefined
      ? serverSyncInfos.serverTimestamp - serverSyncInfos.clientTime
      : undefined;

  /**
   * @param {Element} q
   * @param {string} streamType
   * @return {Object}
   */
  function parseQualityLevel(
    q: Element,
    streamType: string,
  ): ISmoothParsedQualityLevel | null {
    const customAttributes = reduceChildren<string[]>(
      q,
      (acc, qName, qNode) => {
        if (qName === "CustomAttributes") {
          acc.push(
            ...reduceChildren<string[]>(
              qNode,
              (cAttrs, cName, cNode) => {
                if (cName === "Attribute") {
                  const name = cNode.getAttribute("Name");
                  const value = cNode.getAttribute("Value");
                  if (name !== null && value !== null) {
                    cAttrs.push(name + "=" + value);
                  }
                }
                return cAttrs;
              },
              [],
            ),
          );
        }
        return acc;
      },
      [],
    );

    /**
     * @param {string} name
     * @returns {string|undefined}
     */
    function getAttribute(name: string): string | undefined {
      const attr = q.getAttribute(name);
      return attr === null ? undefined : attr;
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

        let bitrate = bitrateAttr === undefined ? 0 : parseInt(bitrateAttr, 10);
        bitrate = isNaN(bitrate) ? 0 : bitrate;

        if (
          (fourCC !== undefined && MIME_TYPES[fourCC] === undefined) ||
          codecPrivateData === undefined
        ) {
          log.warn("Smooth parser: Unsupported audio codec. Ignoring quality level.");
          return null;
        }

        const codecs = getAudioCodecs(codecPrivateData, fourCC);

        return {
          audiotag: audiotag !== undefined ? parseInt(audiotag, 10) : audiotag,
          bitrate,
          bitsPerSample:
            bitsPerSample !== undefined ? parseInt(bitsPerSample, 10) : bitsPerSample,
          channels: channels !== undefined ? parseInt(channels, 10) : channels,
          codecPrivateData,
          codecs,
          customAttributes,
          mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
          packetSize: packetSize !== undefined ? parseInt(packetSize, 10) : packetSize,
          samplingRate:
            samplingRate !== undefined ? parseInt(samplingRate, 10) : samplingRate,
        };
      }

      case "video": {
        const codecPrivateData = getAttribute("CodecPrivateData");
        const fourCC = getAttribute("FourCC");
        const width = getAttribute("MaxWidth");
        const height = getAttribute("MaxHeight");
        const bitrateAttr = getAttribute("Bitrate");

        let bitrate = bitrateAttr === undefined ? 0 : parseInt(bitrateAttr, 10);
        bitrate = isNaN(bitrate) ? 0 : bitrate;

        if (
          (fourCC !== undefined && MIME_TYPES[fourCC] === undefined) ||
          codecPrivateData === undefined
        ) {
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

        let bitrate = bitrateAttr === undefined ? 0 : parseInt(bitrateAttr, 10);
        bitrate = isNaN(bitrate) ? 0 : bitrate;

        return {
          bitrate,
          customAttributes,
          mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
          codecPrivateData: codecPrivateData ?? "",
        };
      }

      default:
        log.error("Smooth Parser: Unrecognized StreamIndex type: " + streamType);
        return null;
    }
  }

  /**
   * Parse the tracks (<StreamIndex>) tree containing
   * representations (<QualityLevels>) and timestamp indexes (<c>).
   * Indexes can be quite huge, and this function needs to
   * to be optimized.
   * @param {Object} args
   * @returns {Object}
   */
  function parseTrack(args: ITrackParserArguments): IParsedTrack | null {
    const {
      root,
      timescale,
      baseUrl,
      protections,
      timeShiftBufferDepth,
      manifestReceivedTime,
      isLive,
    } = args;
    const timescaleAttr = root.getAttribute("Timescale");
    let _timescale = timescaleAttr === null ? timescale : +timescaleAttr;
    if (isNaN(_timescale)) {
      _timescale = timescale;
    }

    const typeAttribute = root.getAttribute("Type");
    if (typeAttribute === null) {
      throw new Error("StreamIndex without type.");
    }
    if (!arrayIncludes(SUPPORTED_TRACK_TYPE, typeAttribute)) {
      log.warn("Smooth Parser: Unrecognized track type:", typeAttribute);
    }
    const trackType = typeAttribute as ITrackType;

    const subType = root.getAttribute("Subtype");
    const language = root.getAttribute("Language");
    const UrlAttr = root.getAttribute("Url");
    const UrlPathWithTokens = UrlAttr === null ? "" : UrlAttr;
    if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
      assert(UrlPathWithTokens !== "");
    }

    const { qualityLevels, cNodes } = reduceChildren<{
      qualityLevels: ISmoothParsedQualityLevel[];
      cNodes: Element[];
    }>(
      root,
      (res, _name, node) => {
        switch (_name) {
          case "QualityLevel":
            const qualityLevel = parseQualityLevel(node, trackType);
            if (qualityLevel === null) {
              return res;
            }

            // filter out video qualityLevels with small bitrates
            if (
              trackType !== "video" ||
              qualityLevel.bitrate > minRepresentationBitrate
            ) {
              res.qualityLevels.push(qualityLevel);
            }
            break;
          case "c":
            res.cNodes.push(node);
            break;
        }
        return res;
      },
      { qualityLevels: [], cNodes: [] },
    );

    const sharedSmoothTimeline = new SharedSmoothSegmentTimeline({
      timeline: parseCNodes(cNodes),
      timescale: _timescale,
      timeShiftBufferDepth,
      manifestReceivedTime,
    });

    // we assume that all qualityLevels have the same
    // codec and mimeType
    assert(
      qualityLevels.length !== 0,
      "Track should have at least one playable representation.",
    );

    const trackID = trackType + (isNonEmptyString(language) ? "_" + language : "");

    const representations = qualityLevels.map((qualityLevel) => {
      const media = replaceRepresentationSmoothTokens(
        UrlPathWithTokens,
        qualityLevel.bitrate,
        qualityLevel.customAttributes,
      );
      const mimeType = isNonEmptyString(qualityLevel.mimeType)
        ? qualityLevel.mimeType
        : DEFAULT_MIME_TYPES[trackType];
      const codecs = qualityLevel.codecs;
      const id =
        trackID +
        "_" +
        (!isNullOrUndefined(trackType) ? trackType + "-" : "") +
        (!isNullOrUndefined(mimeType) ? mimeType + "-" : "") +
        (!isNullOrUndefined(codecs) ? codecs + "-" : "") +
        String(qualityLevel.bitrate);

      const keyIDs: Uint8Array[] = [];
      let firstProtection: IContentProtectionSmooth | undefined;
      if (protections.length > 0) {
        firstProtection = protections[0];
        protections.forEach((protection) => {
          keyIDs.push(protection.keyId);
        });
      }

      const segmentPrivateInfos = {
        bitsPerSample: qualityLevel.bitsPerSample,
        channels: qualityLevel.channels,
        codecPrivateData: qualityLevel.codecPrivateData,
        packetSize: qualityLevel.packetSize,
        samplingRate: qualityLevel.samplingRate,
        height: qualityLevel.height,
        width: qualityLevel.width,

        // TODO set multiple protections here
        // instead of the first one
        protection: !isNullOrUndefined(firstProtection)
          ? {
              keyId: firstProtection.keyId,
            }
          : undefined,
      };

      const reprIndex = new RepresentationIndex({
        isLive,
        sharedSmoothTimeline,
        media,
        segmentPrivateInfos,
      });
      const representation: IParsedRepresentation = objectAssign({}, qualityLevel, {
        index: reprIndex,
        cdnMetadata: [{ baseUrl }],
        mimeType,
        codecs,
        id,
      });
      if (keyIDs.length > 0 || firstProtection !== undefined) {
        const initDataValues: Array<{ systemId: string; data: Uint8Array }> =
          firstProtection === undefined
            ? []
            : firstProtection.keySystems.map((keySystemData) => {
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

    const parsedTrack: IParsedTrack = {
      id: trackID,
      trackType,
      representations,
      language: language === null ? undefined : language,
    };

    if (trackType === "text" && subType === "DESC") {
      parsedTrack.isClosedCaption = true;
    }

    return parsedTrack;
  }

  function parseFromDocument(
    doc: Document,
    url?: string,
    manifestReceivedTime?: number,
  ): IParsedManifest {
    let baseUrl: string = "";
    if (url !== undefined) {
      const filenameIdx = getFilenameIndexInUrl(url);
      baseUrl = url.substring(0, filenameIdx);
    }
    const root = doc.documentElement;
    if (isNullOrUndefined(root) || root.nodeName !== "SmoothStreamingMedia") {
      throw new Error("document root should be SmoothStreamingMedia");
    }
    const majorVersionAttr = root.getAttribute("MajorVersion");
    const minorVersionAttr = root.getAttribute("MinorVersion");
    if (
      majorVersionAttr === null ||
      minorVersionAttr === null ||
      !/^[2]-[0-2]$/.test(majorVersionAttr + "-" + minorVersionAttr)
    ) {
      throw new Error("Version should be 2.0, 2.1 or 2.2");
    }

    const timescaleAttr = root.getAttribute("Timescale");
    let timescale = !isNonEmptyString(timescaleAttr) ? 10000000 : +timescaleAttr;
    if (isNaN(timescale)) {
      timescale = 10000000;
    }

    const { protections, trackNodes } = reduceChildren<{
      protections: IContentProtectionSmooth[];
      trackNodes: Element[];
    }>(
      root,
      (res, name, node) => {
        switch (name) {
          case "Protection": {
            res.protections.push(parseProtectionNode(node, parserOptions.keySystems));
            break;
          }
          case "StreamIndex":
            res.trackNodes.push(node);
            break;
        }
        return res;
      },
      {
        trackNodes: [],
        protections: [],
      },
    );

    const initialTracks: Record<ITrackType, IParsedTrack[]> = {
      audio: [],
      video: [],
      text: [],
    };

    const isLive = parseBoolean(root.getAttribute("IsLive"));

    let timeShiftBufferDepth: number | undefined;
    if (isLive) {
      const dvrWindowLength = root.getAttribute("DVRWindowLength");
      if (
        dvrWindowLength !== null &&
        !isNaN(+dvrWindowLength) &&
        +dvrWindowLength !== 0
      ) {
        timeShiftBufferDepth = +dvrWindowLength / timescale;
      }
    }

    const tracks = trackNodes.reduce((acc, node: Element) => {
      const track = parseTrack({
        root: node,
        baseUrl,
        timescale,
        protections,
        isLive,
        timeShiftBufferDepth,
        manifestReceivedTime,
      });
      if (track === null) {
        return acc;
      }
      acc[track.trackType].push(track);
      return acc;
    }, initialTracks);

    let suggestedPresentationDelay: number | undefined;
    let availabilityStartTime: number | undefined;
    let minimumTime: number | undefined;
    let timeshiftDepth: number | null = null;
    let maximumTimeData: {
      isLinear: boolean;
      maximumSafePosition: number;
      livePosition: number | undefined;
      time: number;
    };

    const firstVideoTrack = tracks.video !== undefined ? tracks.video[0] : undefined;
    const firstAudioTrack = tracks.audio !== undefined ? tracks.audio[0] : undefined;

    /** Minimum time that can be reached regardless of the StreamIndex chosen. */
    let safeMinimumTime: number | undefined;

    /** Maximum time that can be reached regardless of the StreamIndex chosen. */
    let safeMaximumTime: number | undefined;

    /** Maximum time that can be reached in absolute on the content. */
    let unsafeMaximumTime: number | undefined;

    if (firstVideoTrack !== undefined || firstAudioTrack !== undefined) {
      const firstTimeReferences: number[] = [];
      const lastTimeReferences: number[] = [];

      if (firstVideoTrack !== undefined) {
        const firstVideoRepresentation = firstVideoTrack.representations[0];
        if (firstVideoRepresentation !== undefined) {
          const firstVideoTimeReference =
            firstVideoRepresentation.index.getFirstAvailablePosition();
          const lastVideoTimeReference =
            firstVideoRepresentation.index.getLastAvailablePosition();

          if (!isNullOrUndefined(firstVideoTimeReference)) {
            firstTimeReferences.push(firstVideoTimeReference);
          }

          if (!isNullOrUndefined(lastVideoTimeReference)) {
            lastTimeReferences.push(lastVideoTimeReference);
          }
        }
      }

      if (firstAudioTrack !== undefined) {
        const firstAudioRepresentation = firstAudioTrack.representations[0];
        if (firstAudioRepresentation !== undefined) {
          const firstAudioTimeReference =
            firstAudioRepresentation.index.getFirstAvailablePosition();
          const lastAudioTimeReference =
            firstAudioRepresentation.index.getLastAvailablePosition();

          if (!isNullOrUndefined(firstAudioTimeReference)) {
            firstTimeReferences.push(firstAudioTimeReference);
          }

          if (!isNullOrUndefined(lastAudioTimeReference)) {
            lastTimeReferences.push(lastAudioTimeReference);
          }
        }
      }

      if (firstTimeReferences.length > 0) {
        safeMinimumTime = Math.max(...firstTimeReferences);
      }

      if (lastTimeReferences.length > 0) {
        safeMaximumTime = Math.min(...lastTimeReferences);
        unsafeMaximumTime = Math.max(...lastTimeReferences);
      }
    }

    const manifestDuration = root.getAttribute("Duration");
    const duration =
      manifestDuration !== null && +manifestDuration !== 0
        ? +manifestDuration / timescale
        : undefined;

    if (isLive) {
      suggestedPresentationDelay = parserOptions.suggestedPresentationDelay;
      availabilityStartTime = referenceDateTime;

      minimumTime = safeMinimumTime ?? availabilityStartTime;
      let livePosition = unsafeMaximumTime;
      if (livePosition === undefined) {
        livePosition = Date.now() / 1000 - availabilityStartTime;
      }
      let maximumSafePosition = safeMaximumTime;
      if (maximumSafePosition === undefined) {
        maximumSafePosition = livePosition;
      }
      maximumTimeData = {
        isLinear: true,
        maximumSafePosition,
        livePosition,
        time: getMonotonicTimeStamp(),
      };
      timeshiftDepth = timeShiftBufferDepth ?? null;
    } else {
      minimumTime = safeMinimumTime ?? 0;
      let maximumTime = safeMaximumTime;
      if (maximumTime === undefined) {
        maximumTime = duration !== undefined ? minimumTime + duration : Infinity;
      }
      maximumTimeData = {
        isLinear: false,
        maximumSafePosition: maximumTime,
        livePosition: undefined,
        time: getMonotonicTimeStamp(),
      };
    }

    const periodStart = isLive ? 0 : minimumTime;
    const periodEnd = isLive ? undefined : maximumTimeData.maximumSafePosition;

    const getMediaForType = (type: ITrackType) => {
      return tracks[type].map((t) => {
        return {
          id: t.id,
          linkedTrack: t.id,
          representations: t.representations.map((r) => r.id),
        };
      });
    };
    const variantStream: IParsedVariantStreamMetadata = {
      id: "0",
      bandwidth: undefined,
      media: {
        audio: getMediaForType("audio"),
        video: getMediaForType("video"),
        text: getMediaForType("text"),
      },
    };
    const manifest = {
      availabilityStartTime:
        availabilityStartTime === undefined ? 0 : availabilityStartTime,
      clockOffset: serverTimeOffset,
      isLive,
      isDynamic: isLive,
      isLastPeriodKnown: true,
      timeBounds: {
        minimumSafePosition: minimumTime,
        timeshiftDepth,
        maximumTimeData,
      },
      periods: [
        {
          tracksMetadata: tracks,
          variantStreams: [variantStream],
          duration: periodEnd !== undefined ? periodEnd - periodStart : duration,
          end: periodEnd,
          id: "gen-smooth-period-0",
          start: periodStart,
        },
      ],
      suggestedPresentationDelay,
      transportType: "smooth",
      uris: isNullOrUndefined(url) ? [] : [url],
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
function createPSSHBox(systemId: string, privateData: Uint8Array): Uint8Array {
  if (systemId.length !== 32) {
    throw new Error("HSS: wrong system id length");
  }
  const version = 0;
  return createBox(
    "pssh",
    concat(
      [version, 0, 0, 0],
      hexToBytes(systemId),
      /** To put there KIDs if it exists (necessitate PSSH v1) */
      itobe4(privateData.length),
      privateData,
    ),
  );
}

export default createSmoothStreamingParser;
