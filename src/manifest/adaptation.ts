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

import {
  ICustomError,
  MediaError,
} from "../errors";
import log from "../log";
import { IParsedAdaptation } from "../parsers/manifest";
import arrayFind from "../utils/array_find";
import arrayIncludes from "../utils/array_includes";
import normalizeLanguage from "../utils/languages";
import uniq from "../utils/uniq";
import filterSupportedRepresentations from "./filter_supported_representations";
import Representation from "./representation";

export type IAdaptationType = "video" | "audio" | "text" | "image";

export const SUPPORTED_ADAPTATIONS_TYPE: IAdaptationType[] = [ "audio",
                                                               "video",
                                                               "text",
                                                               "image" ];

function isSupportedAdaptationType(
  adaptationType : string
) : adaptationType is IAdaptationType {
  return arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, adaptationType);
}

export interface IRepresentationInfos { bufferType: IAdaptationType;
                                        language?: string;
                                        isAudioDescription? : boolean;
                                        isClosedCaption? : boolean;
                                        isDub? : boolean;
                                        normalizedLanguage? : string; }

export type IRepresentationFilter = (representation: Representation,
                                     adaptationInfos: IRepresentationInfos)
                                    => boolean;

/**
 * Normalized Adaptation structure.
 * An Adaptation describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
export default class Adaptation {

  // ID uniquely identifying the Adaptation in the Period.
  public readonly id : string;

  // Different `Representations` (e.g. qualities) this Adaptation is available
  // in.
  public readonly representations : Representation[];

  // Type of this Adaptation.
  public readonly type : IAdaptationType;

  // Whether this track contains an audio description for the visually impaired.
  public isAudioDescription? : boolean;

  // Whether this Adaptation contains closed captions for the hard-of-hearing.
  public isClosedCaption? : boolean;

  // If `true`, this Adaptation is a "dub", meaning it was recorded in another
  // language than the original
  public isDub? : boolean;

  // Language this Adaptation is in, as announced in the original Manifest.
  public language? : string;

  // Language this Adaptation is in, when translated into an ISO639-3 code.
  public normalizedLanguage? : string;

  // `true` if this Adaptation was not present in the original Manifest, but was
  // manually added after through the corresponding APIs.
  public manuallyAdded : boolean;

  // Array containing every errors that happened when the Adaptation has been
  // created, in the order they have happened.
  public readonly parsingErrors : ICustomError[];

  /**
   * @constructor
   * @param {Object} parsedAdaptation
   * @param {Object|undefined} [options]
   */
  constructor(parsedAdaptation : IParsedAdaptation, options : {
    representationFilter? : IRepresentationFilter;
    isManuallyAdded? : boolean;
  } = {}) {
    const { representationFilter, isManuallyAdded } = options;
    this.parsingErrors = [];
    this.id = parsedAdaptation.id;

    if (!isSupportedAdaptationType(parsedAdaptation.type)) {
      log.info("Manifest: Not supported adaptation type", parsedAdaptation.type);
      throw new MediaError("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE",
                           `"${parsedAdaptation.type}" is not a valid ` +
                           "Adaptation type.");
    }
    this.type = parsedAdaptation.type;

    const hadRepresentations = parsedAdaptation.representations.length !== 0;
    const argsRepresentations =
      filterSupportedRepresentations(parsedAdaptation.type,
                                     parsedAdaptation.representations);

    if (hadRepresentations && argsRepresentations.length === 0) {
      log.warn("Incompatible codecs for adaptation", parsedAdaptation);
      const error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR",
                                   "An Adaptation contains only incompatible codecs.");
      this.parsingErrors.push(error);
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

    this.representations = argsRepresentations
      .map(representation => new Representation(representation))
      .sort((a, b) => a.bitrate - b.bitrate)
      .filter(representation => {
        if (representationFilter == null) {
          return true;
        }
        return representationFilter(representation,
                                    { bufferType: this.type,
                                      language: this.language,
                                      normalizedLanguage: this.normalizedLanguage,
                                      isClosedCaption: this.isClosedCaption,
                                      isDub: this.isDub,
                                      isAudioDescription: this.isAudioDescription });
      });

    // for manuallyAdded adaptations (not in the manifest)
    this.manuallyAdded = isManuallyAdded === true;
  }

  /**
   * Returns unique bitrate for every Representation in this Adaptation.
   * @returns {Array.<Number>}
   */
  getAvailableBitrates() : number[] {
    const bitrates = this.representations.map(r => r.bitrate);
    return uniq(bitrates);
  }

  /**
   * Returns the Representation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getRepresentation(wantedId : number|string) : Representation|undefined {
    return arrayFind(this.representations, ({ id }) => wantedId === id);
  }
}
