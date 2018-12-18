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
import { Subject } from "rxjs";
import { ICustomError } from "../errors";
import MediaError from "../errors/MediaError";
import log from "../log";
import arrayIncludes from "../utils/array-includes";
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
  id : string; // unique ID for that Period.
  adaptations : IAdaptationsArguments; // "Tracks" in that Period.
  start : number; // start time of the Period, in seconds.
  duration? : number; // duration of the Period, in seconds.
                      // Can be undefined for a still-running one.
}

/**
 * Class representing a single `Period` of the Manifest.
 * A Period contains every informations about the content available for a
 * specific period in time.
 * @class Period
 */
export default class Period {
  /**
   * ID uniquely identifying the Period in the Manifest.
   * @type {string}
   */
  public readonly id : string;

  /**
   * Every 'Adaptation' in that Period, per type of Adaptation.
   * @type {Object}
   */
  public adaptations : IManifestAdaptations;

  /**
   * Duration of this Period, in seconds.
   * `undefined` for still-running Periods.
   * @type {number|undefined}
   */
  public duration? : number;

  /**
   * Absolute start time of the Period, in seconds.
   * @type {number}
   */
  public start : number;

  /**
   * Absolute end time of the Period, in seconds.
   * `undefined` for still-running Periods.
   * @type {number|undefined}
   */
  public end? : number;

  /**
   * @constructor
   * @param {Object} args
   * @param {Subject} warning$
   * @param {function|undefined} [representationFilter]
   */
  constructor(
    args : IPeriodArguments,
    warning$: Subject<Error|ICustomError>,
    representationFilter? : IRepresentationFilter
  ) {
    this.id = args.id;
    this.adaptations =
      (Object.keys(args.adaptations) as IAdaptationType[])
        .reduce<IManifestAdaptations>((acc, type) => {
          if (args.adaptations[type]) {
            const adaptationsForType = args.adaptations[type];
            if (adaptationsForType) {
              const filteredAdaptations = adaptationsForType
                .filter((adaptation) => {
                  if (!arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, adaptation.type)) {
                    log.info("not supported adaptation type", adaptation.type);
                    warning$.next(
                      new MediaError("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE", null, false)
                    );
                    return false;
                  } else {
                    return true;
                  }
                })
                .map((adaptation) => {
                  return new Adaptation(adaptation, warning$, representationFilter);
                })
                .filter((adaptation) => adaptation.representations.length);
              if (
                filteredAdaptations.length === 0 &&
                adaptationsForType.length > 0 &&
                (type === "video" || type === "audio")
              ) {
                const error = new Error("No supported " + type + " adaptations");
                throw new MediaError("MANIFEST_PARSE_ERROR", error, true);
              }
              acc[type] = filteredAdaptations;
            }
          }
          return acc;
        }, {});

    if (
      (!this.adaptations.video || !this.adaptations.video.length) &&
      (!this.adaptations.audio || !this.adaptations.audio.length)
    ) {
      const error = new Error("No supported audio and video adaptations.");
      throw new MediaError("MANIFEST_PARSE_ERROR", error, true);
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
    const adaptationsList : Adaptation[] = [];
    for (const adaptationType in adaptationsByType) {
      if (adaptationsByType.hasOwnProperty(adaptationType)) {
        const adaptations =
          adaptationsByType[adaptationType as IAdaptationType] as Adaptation[];
        adaptationsList.push(...adaptations);
      }
    }
    return adaptationsList;
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
  getAdaptation(wantedId : number|string) : Adaptation|undefined {
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
  }
}
