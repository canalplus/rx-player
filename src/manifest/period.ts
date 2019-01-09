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
import { IParsedPeriod } from "../parsers/manifest";
import arrayFind from "../utils/array_find";
import objectValues from "../utils/object_values";
import Adaptation, {
  IAdaptationType,
  IRepresentationFilter,
} from "./adaptation";

// Structure listing every `Adaptation` in a Period.
export type IManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;

/**
 * Class representing a single `Period` of the Manifest.
 * A Period contains every informations about the content available for a
 * specific period in time.
 * @class Period
 */
export default class Period {
  // ID uniquely identifying the Period in the Manifest.
  public readonly id : string;

  // Every 'Adaptation' in that Period, per type of Adaptation.
  public adaptations : IManifestAdaptations;

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
  constructor(
    args : IParsedPeriod,
    representationFilter? : IRepresentationFilter
  ) {
    this.parsingErrors = [];
    this.id = args.id;
    this.adaptations = (Object.keys(args.adaptations) as IAdaptationType[])
      .reduce<IManifestAdaptations>((acc, type) => {
        const adaptationsForType = args.adaptations[type];
        if (!adaptationsForType) {
          return acc;
        }
        const filteredAdaptations = adaptationsForType
          .map((adaptation) : Adaptation|null => {
            let newAdaptation : Adaptation|null = null;
            try {
              newAdaptation = new Adaptation(adaptation, { representationFilter });
            } catch (err) {
              if (err.code === "MANIFEST_UNSUPPORTED_ADAPTATION_TYPE") {
                err.fatal = false;
                this.parsingErrors.push(err);
                return null;
              }
              throw err;
            }
            this.parsingErrors.push(...newAdaptation.parsingErrors);
            return newAdaptation;
          })
          .filter((adaptation) : adaptation is Adaptation =>
            adaptation != null && adaptation.representations.length > 0
          );
        if (filteredAdaptations.length === 0 &&
            adaptationsForType.length > 0 &&
            (type === "video" || type === "audio")
        ) {
          throw new MediaError("MANIFEST_PARSE_ERROR",
                               "No supported " + type + " adaptations",
                               true);
        }

        if (filteredAdaptations.length) {
          acc[type] = filteredAdaptations;
        }
        return acc;
      }, {});

    if (!this.adaptations.video && !this.adaptations.audio) {
      throw new MediaError("MANIFEST_PARSE_ERROR",
                           "No supported audio and video tracks.",
                           true);
    }

    this.duration = args.duration;
    this.start = args.start;

    if (this.duration != null && this.start != null) {
      this.end = this.start + this.duration;
    }
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
   * Array.
   * @returns {Array.<Object>}
   */
  getAdaptations() : Adaptation[] {
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
