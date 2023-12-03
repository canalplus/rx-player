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

import log from "../log";
import { IParsedAdaptation } from "../parsers/manifest";
import {
  ITrackType,
  IAudioTrack,
  IRepresentationFilter,
  ITextTrack,
  IVideoTrack,
} from "../public_types";
import arrayFind from "../utils/array_find";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import normalizeLanguage from "../utils/languages";
import Representation from "./representation";

/** List in an array every possible value for the Adaptation's `type` property. */
export const SUPPORTED_ADAPTATIONS_TYPE: ITrackType[] = [ "audio",
                                                          "video",
                                                          "text" ];

/**
 * Normalized Adaptation structure.
 * An `Adaptation` describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
export default class Adaptation {
  /** ID uniquely identifying the Adaptation in the Period. */
  public readonly id : string;

  /**
   * Different `Representations` (e.g. qualities) this Adaptation is available
   * in.
   */
  public readonly representations : Representation[];

  /** Type of this Adaptation. */
  public readonly type : ITrackType;

  /** Whether this track contains an audio description for the visually impaired. */
  public isAudioDescription? : boolean;

  /** Whether this Adaptation contains closed captions for the hard-of-hearing. */
  public isClosedCaption? : boolean;

  /**
   * If `true` this Adaptation are subtitles Meant for display when no other text
   * Adaptation is selected. It is used to clarify dialogue, alternate
   * languages, texted graphics or location/person IDs that are not otherwise
   * covered in the dubbed/localized audio Adaptation.
   */
  public isForcedSubtitles? : boolean;

  /** If true this Adaptation contains sign interpretation. */
  public isSignInterpreted? : boolean;

  /**
   * If `true`, this Adaptation is a "dub", meaning it was recorded in another
   * language than the original one.
   */
  public isDub? : boolean;

  /** Language this Adaptation is in, as announced in the original Manifest. */
  public language? : string;

  /** Language this Adaptation is in, when translated into an ISO639-3 code. */
  public normalizedLanguage? : string;

  /**
   * `true` if this Adaptation was not present in the original Manifest, but was
   * manually added after through the corresponding APIs.
   */
  public manuallyAdded? : boolean;

  /** `true` if at least one Representation is in a supported codec. `false` otherwise. */
  public isSupported : boolean;

  /** Tells if the track is a trick mode track. */
  public isTrickModeTrack? : boolean;

  /** Label of the adaptionSet */
  public label?: string;

  public readonly trickModeTracks? : Adaptation[];

  /**
   * @constructor
   * @param {Object} parsedAdaptation
   * @param {Object|undefined} [options]
   */
  constructor(parsedAdaptation : IParsedAdaptation, options : {
    representationFilter? : IRepresentationFilter | undefined;
    isManuallyAdded? : boolean | undefined;
  } = {}) {
    const { trickModeTracks } = parsedAdaptation;
    const { representationFilter, isManuallyAdded } = options;
    this.id = parsedAdaptation.id;
    this.type = parsedAdaptation.type;

    if  (parsedAdaptation.isTrickModeTrack !== undefined) {
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

    if (trickModeTracks !== undefined &&
        trickModeTracks.length > 0) {
      this.trickModeTracks = trickModeTracks.map((track) => new Adaptation(track));
    }

    const argsRepresentations = parsedAdaptation.representations;
    const representations : Representation[] = [];
    let isSupported : boolean = false;
    for (let i = 0; i < argsRepresentations.length; i++) {
      const representation = new Representation(argsRepresentations[i],
                                                { type: this.type });
      const shouldAdd =
        isNullOrUndefined(representationFilter) ||
        representationFilter(representation,
                             { bufferType: this.type,
                               language: this.language,
                               normalizedLanguage: this.normalizedLanguage,
                               isClosedCaption: this.isClosedCaption,
                               isDub: this.isDub,
                               isAudioDescription: this.isAudioDescription,
                               isSignInterpreted: this.isSignInterpreted });
      if (shouldAdd) {
        representations.push(representation);
        if (!isSupported && representation.isSupported) {
          isSupported = true;
        }
      } else {
        log.debug("Filtering Representation due to representationFilter",
                  this.type,
                  `Adaptation: ${this.id}`,
                  `Representation: ${representation.id}`,
                  `(${representation.bitrate})`);
      }
    }
    representations.sort((a, b) => a.bitrate - b.bitrate);
    this.representations = representations;

    this.isSupported = isSupported;

    // for manuallyAdded adaptations (not in the manifest)
    this.manuallyAdded = isManuallyAdded === true;
  }

  /**
   * Returns all Representation in this Adaptation that can be played (that is:
   * not undecipherable and with a supported codec).
   * @returns {Array.<Representation>}
   */
  getPlayableRepresentations() : Representation[] {
    return this.representations.filter(rep => rep.isPlayable());
  }

  /**
   * Returns the Representation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getRepresentation(wantedId : number|string) : Representation|undefined {
    return arrayFind(this.representations, ({ id }) => wantedId === id);
  }

  /**
   * Format an `Adaptation`, generally of type `"audio"`, as an `IAudioTrack`.
   * @param {boolean} filterPlayable - If `true` only "playable" Representation
   * will be returned.
   * @returns {Object}
   */
  public toAudioTrack(filterPlayable: boolean) : IAudioTrack {
    const formatted : IAudioTrack = {
      language: this.language ?? "",
      normalized: this.normalizedLanguage ?? "",
      audioDescription: this.isAudioDescription === true,
      id: this.id,
      representations: (
        filterPlayable ?
          this.getPlayableRepresentations() :
          this.representations
      ).map(r => r.toAudioRepresentation()),
      label: this.label,
    };
    if (this.isDub === true) {
      formatted.dub = true;
    }
    return formatted;
  }

  /**
   * Format an `Adaptation`, generally of type `"audio"`, as an `IAudioTrack`.
   * @returns {Object}
   */
  public toTextTrack() : ITextTrack {
    return {
      language: this.language ?? "",
      normalized: this.normalizedLanguage ?? "",
      closedCaption: this.isClosedCaption === true,
      id: this.id,
      label: this.label,
      forced: this.isForcedSubtitles,
    };
  }

  /**
   * Format an `Adaptation`, generally of type `"video"`, as an `IAudioTrack`.
   * @param {boolean} filterPlayable - If `true` only "playable" Representation
   * will be returned.
   * @returns {Object}
   */
  public toVideoTrack(filterPlayable: boolean) : IVideoTrack {
    const trickModeTracks = this.trickModeTracks !== undefined ?
      this.trickModeTracks.map((trickModeAdaptation) => {
        const representations = (
          filterPlayable ?
            trickModeAdaptation.getPlayableRepresentations() :
            trickModeAdaptation.representations
        ).map(r => r.toVideoRepresentation());
        const trickMode : IVideoTrack = { id: trickModeAdaptation.id,
                                          representations,
                                          isTrickModeTrack: true };
        if (trickModeAdaptation.isSignInterpreted === true) {
          trickMode.signInterpreted = true;
        }
        return trickMode;
      }) :
      undefined;

    const videoTrack: IVideoTrack = {
      id: this.id,
      representations: (
        filterPlayable ?
          this.getPlayableRepresentations() :
          this.representations
      ).map(r => r.toVideoRepresentation()),
      label: this.label,
    };
    if (this.isSignInterpreted === true) {
      videoTrack.signInterpreted = true;
    }
    if (this.isTrickModeTrack === true) {
      videoTrack.isTrickModeTrack = true;
    }
    if (trickModeTracks !== undefined) {
      videoTrack.trickModeTracks = trickModeTracks;
    }
    return videoTrack;
  }
}
