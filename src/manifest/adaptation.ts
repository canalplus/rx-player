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

import arrayFind from "array-find";
import objectAssign from "object-assign";
import { isCodecSupported } from "../compat";
import { ICustomError } from "../errors";
import MediaError from "../errors/MediaError";
import log from "../log";
import generateNewId from "../utils/id";
import { normalize as normalizeLang } from "../utils/languages";
import uniq from "../utils/uniq";
import Representation, {
  IRepresentationArguments,
} from "./representation";

export type IAdaptationType = "video"|"audio"|"text"|"image";

export const SUPPORTED_ADAPTATIONS_TYPE: IAdaptationType[] =
  ["audio", "video", "text", "image"];

interface IRepresentationInfos {
  bufferType: IAdaptationType;
  language?: string;
  isAudioDescription? : boolean;
  isClosedCaption? : boolean;
  normalizedLanguage? : string;
}

export type IRepresentationFilter = (
  representation: Representation,
  adaptationInfos: IRepresentationInfos
) => boolean;

export interface IAdaptationArguments {
  // -- required
  id : string;
  representations : IRepresentationArguments[];
  type : IAdaptationType;

  // -- optional
  audioDescription? : boolean;
  closedCaption? : boolean;
  language? : string;
  manuallyAdded? : boolean;
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

  /**
   * ID uniquely identifying the Adaptation in the Period.
   * TODO in the Manifest instead?
   * @type {string}
   */
  public readonly id : string;

  /**
   * Different `Representations` (e.g. qualities) this Adaptation is available
   * in.
   * @type {Array.<Object>}
   */
  public readonly representations : Representation[];

  /**
   * Type of this Adaptation.
   * @type {string}
   */
  public readonly type : IAdaptationType;

  /**
   * Whether this track contains an audio description for the visually impaired.
   * @type {Boolean}
   */
  public isAudioDescription? : boolean;

  /**
   * Whether this Adaptation contains closed captions for the hard-of-hearing.
   * @type {Boolean}
   */
  public isClosedCaption? : boolean;

  /**
   * Language this Adaptation is in, as announced in the original Manifest.
   * @type {string|undefined}
   */
  public language? : string;

  /**
   * Language this Adaptation is in, when translated into an ISO639-3 code.
   * @type {string|undefined}
   */
  public normalizedLanguage? : string;

  /**
   * `true` if this Adaptation was not present in the original Manifest, but was
   * manually added after through the corresponding APIs.
   * @type {boolean|undefined}
   */
  public manuallyAdded? : boolean;

  /**
   * Array containing every errors that happened when the Adaptation has been
   * created, in the order they have happened.
   * @type {Array.<Error>}
   */
  public readonly parsingErrors : Array<Error|ICustomError>;

  /**
   * @constructor
   * @param {Object} args
   * @param {Function|undefined} [representationFilter]
   */
  constructor(
    args : IAdaptationArguments,
    representationFilter? : IRepresentationFilter
  ) {
    this.parsingErrors = [];
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.type = args.type;

    const hadRepresentations = !!args.representations.length;
    const argsRepresentations =
      filterSupportedRepresentations(args.type, args.representations);

    if (hadRepresentations && argsRepresentations.length === 0) {
      log.warn("Incompatible codecs for adaptation", args);
      const error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", null, false);
      this.parsingErrors.push(error);
    }

    if (args.language != null) {
      this.language = args.language;
      this.normalizedLanguage = normalizeLang(args.language);
    }

    if (args.closedCaption != null) {
      this.isClosedCaption = args.closedCaption;
    }
    if (args.audioDescription != null) {
      this.isAudioDescription = args.audioDescription;
    }

    this.representations = argsRepresentations
      .map(representation =>
        new Representation(objectAssign({ rootId: this.id }, representation))
      )
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

    // for manuallyAdded adaptations (not in the manifest)
    this.manuallyAdded = !!args.manuallyAdded;
  }

  /**
   * Returns unique bitrate for every Representation in this Adaptation.
   * @returns {Array.<Number>}
   */
  getAvailableBitrates() : number[] {
    const bitrates = this.representations
      .map(representation => representation.bitrate);
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

  /**
   * Returns the Representations linked to the given bitrate.
   * @param {Number} bitrate
   * @returns {Array.<Object>|null}
   */
  getRepresentationsForBitrate(bitrate : number) : Representation[]|null {
    return this.representations.filter(representation =>
      representation.bitrate === bitrate) || null;
  }
}

/**
 * Only keep Representations for which the codec is currently supported.
 * @param {string} adaptationType
 * @param {Array.<Object>} representations
 * @returns {Array.<Object>}
 */
function filterSupportedRepresentations(
  adaptationType : string,
  representations : IRepresentationArguments[]
) : IRepresentationArguments[] {
  if (adaptationType === "audio" || adaptationType === "video") {
    return representations.filter((representation) => {
      return isCodecSupported(getCodec(representation));
    });
  }
  // TODO for the other types?
  return representations;

  /**
   * Construct the codec string from given codecs and mimetype.
   * @param {Object} representation
   * @returns {string}
   */
  function getCodec(
    representation : IRepresentationArguments
  ) : string {
    const { codecs = "", mimeType = "" } = representation;
    return `${mimeType};codecs="${codecs}"`;
  }
}
