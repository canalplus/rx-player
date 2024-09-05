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

import log from "../../log";
import type { IParsedAdaptation } from "../../parsers/manifest";
import type {
  ITrackType,
  IRepresentationFilter,
  IRepresentationFilterRepresentation,
} from "../../public_types";
import arrayFind from "../../utils/array_find";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import normalizeLanguage from "../../utils/languages";
import type {
  IAdaptationMetadata,
  IRepresentationMetadata,
  IAdaptationSupportStatus,
} from "../types";
import type CodecSupportCache from "./codec_support_cache";
import Representation from "./representation";

/**
 * Normalized Adaptation structure.
 * An `Adaptation` describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
export default class Adaptation implements IAdaptationMetadata {
  /** ID uniquely identifying the Adaptation in the Period. */
  public readonly id: string;
  /**
   * @see IAdaptationMetadata.representations
   */
  public readonly representations: Representation[];
  /**
   * @see ITrackType
   */
  public readonly type: ITrackType;
  /**
   * @see IAdaptationMetadata.isAudioDescription
   */
  public isAudioDescription?: boolean;
  /**
   * @see IAdaptationMetadata.isClosedCaption
   */
  public isClosedCaption?: boolean;
  /**
   * @see IAdaptationMetadata.isForcedSubtitles
   */
  public isForcedSubtitles?: boolean;
  /**
   * @see IAdaptationMetadata.isSignInterpreted
   */
  public isSignInterpreted?: boolean;
  /**
   * @see IAdaptationMetadata.isDub
   */
  public isDub?: boolean;
  /**
   * @see IAdaptationMetadata.language
   */
  public language?: string;
  /**
   * @see IAdaptationMetadata.normalizedLanguage
   */
  public normalizedLanguage?: string;
  /**
   * @see IAdaptationSupportStatus
   */
  public supportStatus: IAdaptationSupportStatus;
  /**
   * @see IAdaptationMetadata.isTrickModeTrack
   */
  public isTrickModeTrack?: boolean;
  /**
   * @see IAdaptationMetadata.label
   */
  public label?: string;
  /**
   * @see IAdaptationMetadata.trickModeTracks
   */
  public readonly trickModeTracks?: Adaptation[];

  /**
   * @constructor
   * @param {Object} parsedAdaptation
   * @param {Object|undefined} [options]
   */
  constructor(
    parsedAdaptation: IParsedAdaptation,
    options: {
      codecSupportCache?: CodecSupportCache | undefined;
      enableResolutionChecks?: boolean | undefined;
      representationFilter?: IRepresentationFilter | undefined;
    } = {},
  ) {
    const { trickModeTracks } = parsedAdaptation;
    const { representationFilter, enableResolutionChecks, codecSupportCache } = options;
    this.id = parsedAdaptation.id;
    this.type = parsedAdaptation.type;

    if (parsedAdaptation.isTrickModeTrack !== undefined) {
      this.isTrickModeTrack = parsedAdaptation.isTrickModeTrack;
    }

    if (parsedAdaptation.language !== undefined) {
      this.language = parsedAdaptation.language;
      this.normalizedLanguage = normalizeLanguage(parsedAdaptation.language);
    }

    if (parsedAdaptation.closedCaption !== undefined) {
      this.isClosedCaption = parsedAdaptation.closedCaption;
    }
    if (parsedAdaptation.audioDescription !== undefined) {
      this.isAudioDescription = parsedAdaptation.audioDescription;
    }
    if (parsedAdaptation.isDub !== undefined) {
      this.isDub = parsedAdaptation.isDub;
    }
    if (parsedAdaptation.forcedSubtitles !== undefined) {
      this.isForcedSubtitles = parsedAdaptation.forcedSubtitles;
    }
    if (parsedAdaptation.isSignInterpreted !== undefined) {
      this.isSignInterpreted = parsedAdaptation.isSignInterpreted;
    }
    if (parsedAdaptation.label !== undefined) {
      this.label = parsedAdaptation.label;
    }

    if (trickModeTracks !== undefined && trickModeTracks.length > 0) {
      this.trickModeTracks = trickModeTracks.map(
        (track) => new Adaptation(track, { codecSupportCache, enableResolutionChecks }),
      );
    }

    const argsRepresentations = parsedAdaptation.representations;
    const representations: Representation[] = [];
    this.supportStatus = {
      hasSupportedCodec: false,
      hasCodecWithUndefinedSupport: false,
      isDecipherable: false,
    };
    let hasSupportedResolution = false;
    for (let i = 0; i < argsRepresentations.length; i++) {
      const representation = new Representation(argsRepresentations[i], {
        trackType: this.type,
        codecSupportCache,
        enableResolutionChecks,
      });
      let shouldAdd = true;
      if (!isNullOrUndefined(representationFilter)) {
        const reprObject: IRepresentationFilterRepresentation = {
          id: representation.id,
          bitrate: representation.bitrate,
          codecs: representation.codecs,
          height: representation.height,
          width: representation.width,
          frameRate: representation.frameRate,
          hdrInfo: representation.hdrInfo,
        };
        if (representation.contentProtections !== undefined) {
          reprObject.contentProtections = {};
          if (representation.contentProtections.keyIds !== undefined) {
            const keyIds = representation.contentProtections.keyIds;
            reprObject.contentProtections.keyIds = keyIds;
          }
        }
        shouldAdd = representationFilter(reprObject, {
          trackType: this.type,
          language: this.language,
          normalizedLanguage: this.normalizedLanguage,
          isClosedCaption: this.isClosedCaption,
          isDub: this.isDub,
          isAudioDescription: this.isAudioDescription,
          isSignInterpreted: this.isSignInterpreted,
        });
      }
      if (shouldAdd) {
        if (representation.isResolutionSupported !== false) {
          hasSupportedResolution = true;
        }
        representations.push(representation);
        if (representation.isCodecSupported === undefined) {
          this.supportStatus.hasCodecWithUndefinedSupport = true;
          if (this.supportStatus.hasSupportedCodec === false) {
            this.supportStatus.hasSupportedCodec = undefined;
          }
        } else if (representation.isCodecSupported) {
          this.supportStatus.hasSupportedCodec = true;
        }
        if (representation.decipherable === undefined) {
          if (this.supportStatus.isDecipherable === false) {
            this.supportStatus.isDecipherable = undefined;
          }
        } else if (representation.decipherable) {
          this.supportStatus.isDecipherable = true;
        }
      } else {
        log.debug(
          "Filtering Representation due to representationFilter",
          this.type,
          `Adaptation: ${this.id}`,
          `Representation: ${representation.id}`,
          `(${representation.bitrate})`,
        );
      }
    }
    if (representations.length > 0 && !hasSupportedResolution) {
      for (const representation of representations) {
        // As resolution checks might not be an exact science, for now if all
        // seems unsupported, don't consider it.
        representation.isResolutionSupported = undefined;
      }
    }
    representations.sort((a, b) => a.bitrate - b.bitrate);
    this.representations = representations;
  }

  /**
   * Some environments (e.g. in a WebWorker) may not have the capability to know
   * if a mimetype+codec combination is supported on the current platform.
   *
   * Calling `refreshCodecSupport` manually once the codecs supported are known
   * by the current environnement allows to work-around this issue.
   *
   *
   * If the right mimetype+codec combination is found in the provided object,
   * this `Adaptation`'s `supportStatus` property will be updated accordingly as
   * well as all of its inner `Representation`'s `isCodecSupported` attributes.
   *
   * @param {Array.<Object>} codecSupportCache
   */
  refreshCodecSupport(codecSupportCache: CodecSupportCache): void {
    let hasCodecWithUndefinedSupport = false;
    let hasSupportedRepresentation = false;
    for (const representation of this.representations) {
      representation.refreshCodecSupport(codecSupportCache);
      if (representation.isCodecSupported === undefined) {
        hasCodecWithUndefinedSupport = true;
      } else if (representation.isCodecSupported) {
        hasSupportedRepresentation = true;
      }
    }

    if (hasSupportedRepresentation) {
      /* The adaptation is supported because at least one representation is supported */
      this.supportStatus.hasSupportedCodec = true;
    } else if (hasCodecWithUndefinedSupport) {
      /* The adaptation support is unknown because there is no representation explicitly
      supported but there is codec with unknown support */
      this.supportStatus.hasSupportedCodec = undefined;
    } else {
      /* All codecs support are known and no codecs are supported, adaptation
      is not supported */
      this.supportStatus.hasSupportedCodec = false;
    }

    this.supportStatus.hasCodecWithUndefinedSupport = hasCodecWithUndefinedSupport;
  }

  /**
   * Returns the Representation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getRepresentation(wantedId: number | string): Representation | undefined {
    return arrayFind(this.representations, ({ id }) => wantedId === id);
  }

  /**
   * Format the current `Adaptation`'s properties into a
   * `IAdaptationMetadata` format which can better be communicated through
   * another thread.
   *
   * Please bear in mind however that the returned object will not be updated
   * when the current `Adaptation` instance is updated, it is only a
   * snapshot at the current time.
   *
   * If you want to keep that data up-to-date with the current `Adaptation`
   * instance, you will have to do it yourself.
   *
   * @returns {Object}
   */
  getMetadataSnapshot(): IAdaptationMetadata {
    const representations: IRepresentationMetadata[] = [];
    const baseRepresentations = this.representations;
    for (const representation of baseRepresentations) {
      representations.push(representation.getMetadataSnapshot());
    }
    return {
      id: this.id,
      type: this.type,
      supportStatus: this.supportStatus,
      language: this.language,
      isForcedSubtitles: this.isForcedSubtitles,
      isClosedCaption: this.isClosedCaption,
      isAudioDescription: this.isAudioDescription,
      isSignInterpreted: this.isSignInterpreted,
      normalizedLanguage: this.normalizedLanguage,
      representations,
      label: this.label,
      isDub: this.isDub,
    };
  }
}
