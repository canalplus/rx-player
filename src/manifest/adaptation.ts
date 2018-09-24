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
import { CustomRepresentationFilter } from "../net/types";
import generateNewId from "../utils/id";
import Representation, {
  IRepresentationArguments
} from "./representation";

export type IAdaptationType = "video"|"audio"|"text"|"image";

export const SUPPORTED_ADAPTATIONS_TYPE: IAdaptationType[] =
  ["audio", "video", "text", "image"];

export interface IAdaptationArguments {
  // -- required
  representations : IRepresentationArguments[];
  type : IAdaptationType;

  // -- optional
  audioDescription? : boolean;
  closedCaption? : boolean;
  id? : number|string;
  language? : string;
  manuallyAdded? : boolean;
  normalizedLanguage? : string;
}

/**
 * Normalized Adaptation structure.
 * @class Adaptation
 */
class Adaptation {
  // required
  public readonly id : string|number;
  public readonly representations : Representation[];
  public readonly type : IAdaptationType;

  // optional
  public isAudioDescription? : boolean;
  public isClosedCaption? : boolean;
  public language? : string;
  public manuallyAdded? : boolean;
  public normalizedLanguage? : string;

  /**
   * @constructor
   * @param {Object} args
   */
  constructor(
    args : IAdaptationArguments,
    representationFilter? : CustomRepresentationFilter
  ) {
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.type = args.type;
    this.representations = Array.isArray(args.representations) ?
      args.representations
        .map(representation =>
          new Representation(objectAssign({ rootId: this.id }, representation))
        )
        .filter((representation) => representationFilter ?
          representationFilter(representation) : true)
        .sort((a, b) => a.bitrate - b.bitrate) : [];

    if (args.language != null) {
      this.language = args.language;
    }

    if (args.normalizedLanguage != null) {
      this.normalizedLanguage = args.normalizedLanguage;
    }

    if (args.closedCaption != null) {
      this.isClosedCaption = args.closedCaption;
    }
    if (args.audioDescription != null) {
      this.isAudioDescription = args.audioDescription;
    }

    // for manuallyAdded adaptations (not in the manifest)
    this.manuallyAdded = !!args.manuallyAdded;
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableBitrates() : number[] {
    return this.representations
      .map(representation => representation.bitrate);
  }

  /**
   * @param {Number|string} wantedId
   * @returns {Representation}
   */
  getRepresentation(wantedId : number|string) : Representation|undefined {
    return arrayFind(this.representations, ({ id }) => wantedId === id);
  }

  /**
   * @param {Number} bitrate
   * @returns {Array.<Representations>|null}
   */
  getRepresentationsForBitrate(bitrate : number) : Representation[]|null {
    return this.representations.filter(representation =>
      representation.bitrate === bitrate) || null;
  }
}

export default Adaptation;
