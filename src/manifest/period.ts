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
import arrayIncludes from "../utils/array_includes";
import objectValues from "../utils/object_values";
import Adaptation, {
  IAdaptationArguments,
  IAdaptationType,
  IRepresentationFilter,
  SUPPORTED_ADAPTATIONS_TYPE,
} from "./adaptation";

// Structure listing every `Adaptation` in a Period.
export type IManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;

export type IAdaptationsArguments =
  Partial<Record<IAdaptationType, IAdaptationArguments[]>>;

// Arguments constitutive of a new Period.
export interface IPeriodArguments {
  // required
  id : string; // unique ID for that Period.
  start : number; // start time of the Period, in seconds.

  // optional
  duration? : number; // duration of the Period, in seconds.
                      // Can be undefined for a still-running one.
  adaptations? : IAdaptationsArguments; // "Tracks" in that Period.
}

export interface IPartialPeriod {
  id : string;
  parsingErrors : Array<Error|ICustomError>;
  start : number;
  duration? : number;
  end? : number;
  getAdaptation(wantedId : number|string) : Adaptation|undefined;
  getAdaptations() : Adaptation[];
  getAdaptationsForType(adaptationType : IAdaptationType) : Adaptation[];
  isFetched() : boolean;
}

export interface IFetchedPeriod extends IPartialPeriod {
  adaptations : IManifestAdaptations;
  isFetched() : true;
}

/**
 * Class representing a single `Period` of the Manifest.
 * A Period contains every informations about the content available for a
 * specific period in time.
 * @class Period
 */
export default class Period implements IPartialPeriod {
  // ID uniquely identifying the Period in the Manifest.
  public readonly id : string;

  // Every 'Adaptation' in that Period, per type of Adaptation.
  public adaptations? : IManifestAdaptations;

  // Duration of this Period, in seconds.
  // `undefined` for still-running Periods.
  public duration? : number;

  // Absolute start time of the Period, in seconds.
  public start : number;

  // Absolute end time of the Period, in seconds.
  // `undefined` for still-running Periods.
  public end? : number;

  // Array containing every errors that happened when the Period has been
  // created, in the order they have happened.
  public readonly parsingErrors : Array<Error|ICustomError>;

  /**
   * @constructor
   * @param {Object} args
   * @param {function|undefined} [representationFilter]
   */
  constructor(args : IPeriodArguments, representationFilter? : IRepresentationFilter) {
    this.parsingErrors = [];
    this.id = args.id;

    const { adaptations } = args;
    if (adaptations != null) {
      this.adaptations = (Object.keys(adaptations) as IAdaptationType[])
        .reduce<IManifestAdaptations>((acc, type) => {
          const adaptationsForType = adaptations[type];
          if (!adaptationsForType) {
            return acc;
          }
          const filteredAdaptations = adaptationsForType
            .filter((adaptation) => {
              if (!arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, adaptation.type)) {
                log.info("not supported adaptation type", adaptation.type);
                const error = new MediaError("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE",
                  "An Adaptation has an unknown and unsupported type: " +
                  adaptation.type, false);
                this.parsingErrors.push(error);
                return false;
              } else {
                return true;
              }
            })
            .map((adaptation) => {
              const newAdaptation = new Adaptation(adaptation, representationFilter);
              this.parsingErrors.push(...newAdaptation.parsingErrors);
              return newAdaptation;
            })
            .filter((adaptation) => adaptation.representations.length);
          if (
            filteredAdaptations.length === 0 &&
            adaptationsForType.length > 0 &&
            (type === "video" || type === "audio")
          ) {
            throw new MediaError("MANIFEST_PARSE_ERROR",
              "No supported " + type + " adaptations", true);
          }

          if (filteredAdaptations.length) {
            acc[type] = filteredAdaptations;
          }
          return acc;
        }, {});

      if (!this.adaptations.video && !this.adaptations.audio) {
        throw new MediaError("MANIFEST_PARSE_ERROR",
          "No supported audio and video tracks.", true);
      }
    }

    this.duration = args.duration;
    this.start = args.start;

    if (this.duration != null && this.start != null) {
      this.end = this.start + this.duration;
    }
  }

  /**
   * @returns {Boolean}
   */
  isFetched() : this is IFetchedPeriod {
    return this.adaptations != null;
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
   * Array.
   * @returns {Array.<Object>}
   */
  getAdaptations() : Adaptation[] {
    if (!this.isFetched()) {
      return [];
    }
    const adaptationsByType = this.adaptations;
    return objectValues(adaptationsByType)
      .reduce<Adaptation[]>((acc, adaptations) =>
        // Note: the second case cannot happen. TS is just being dumb here
        adaptations != null ? acc.concat(adaptations) :
                              acc,
        []
    );
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period for a
   * given type.
   * @param {string} adaptationType
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType : IAdaptationType) : Adaptation[] {
    if (!this.isFetched()) {
      return [];
    }
    return this.adaptations[adaptationType] || [];
  }

  /**
   * Returns the Adaptation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getAdaptation(wantedId : string) : Adaptation|undefined {
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
  }
}
