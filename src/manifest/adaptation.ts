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
import arrayFind from "../utils/array_find";
import normalizeLanguage from "../utils/languages";
import uniq from "../utils/uniq";
import filterSupportedRepresentations from "./filter_supported_representations";
import Representation, {
  IRepresentationArguments,
} from "./representation";

export type IAdaptationType = "video" | "audio" | "text" | "image";

export const SUPPORTED_ADAPTATIONS_TYPE: IAdaptationType[] = [ "audio",
                                                               "video",
                                                               "text",
                                                               "image" ];

export interface IRepresentationInfos { bufferType: IAdaptationType;
                                        language?: string;
                                        isAudioDescription? : boolean;
                                        isClosedCaption? : boolean;
                                        normalizedLanguage? : string; }

export type IRepresentationFilter = (
  representation: Representation,
  adaptationInfos: IRepresentationInfos
) => boolean;

export interface ITrickModeTrackArguments {
  // required
  id: string;
  representations: IRepresentationArguments[];
}

export interface IAdaptationArguments {
  // -- required
  id : string;
  representations : IRepresentationArguments[];
  type : IAdaptationType;

  // -- optional
  trickModeTrack? : ITrickModeTrackArguments;
  audioDescription? : boolean;
  closedCaption? : boolean;
  language? : string;
  manuallyAdded? : boolean;
}

interface ITrickModeTrack {
  id: string;
  representations: Representation[];
}

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

  public readonly trickModeTrack? : ITrickModeTrack;

  /**
   * @param {Object} args
   * @param {Function|undefined} [representationFilter]
   */
  constructor(
    args : IAdaptationArguments,
    representationFilter? : IRepresentationFilter
  ) {
    this.parsingErrors = [];
    this.id = args.id;
    this.type = args.type;

    const hadRepresentations = !!args.representations.length;
    const argsRepresentations = filterSupportedRepresentations(args.type,
                                                               args.representations);

    if (hadRepresentations && argsRepresentations.length === 0) {
      log.warn("Incompatible codecs for adaptation", args);
      const error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR",
                                   "An Adaptation contains only incompatible codecs.");
      this.parsingErrors.push(error);
    }

    if (args.language != null) {
      this.language = args.language;
      this.normalizedLanguage = normalizeLanguage(args.language);
    }

    if (args.closedCaption != null) {
      this.isClosedCaption = args.closedCaption;
    }
    if (args.audioDescription != null) {
      this.isAudioDescription = args.audioDescription;
    }

    if (args.trickModeTrack != null) {
      const trickmodeRepresentations = args.trickModeTrack.representations
        .map(representation => new Representation(representation))
        .sort((a, b) => a.bitrate - b.bitrate)
        .filter(representation => {
          if (representationFilter == null) {
            return true;
          }
          return representationFilter(representation, {
            bufferType: this.type,
            language: this.language,
            normalizedLanguage: this.normalizedLanguage,
            isClosedCaption: this.isClosedCaption,
            isAudioDescription: this.isAudioDescription,
          });
        });
      this.trickModeTrack = {
        id: args.trickModeTrack.id,
        representations: trickmodeRepresentations,
      };
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
                                      isAudioDescription: this.isAudioDescription });
      });

    // for manuallyAdded adaptations (not in the manifest)
    this.manuallyAdded = !!args.manuallyAdded;
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
