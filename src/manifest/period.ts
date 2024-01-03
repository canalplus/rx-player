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
import { MediaError } from "../errors";
import {
  IManifestStreamEvent,
  IParsedPeriod,
} from "../parsers/manifest";
import {
  ITrackType,
  IRepresentationFilter,
} from "../public_types";
import arrayFind from "../utils/array_find";
import Adaptation from "./adaptation";
import { ICodecSupportList } from "./representation";
import {
  IAdaptationMetadata,
  IPeriodMetadata,
} from "./types";
import {
  getAdaptations,
  getSupportedAdaptations,
  periodContainsTime,
} from "./utils";

/** Structure listing every `Adaptation` in a Period. */
export type IManifestAdaptations = Partial<Record<ITrackType, Adaptation[]>>;

/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
export default class Period implements IPeriodMetadata {
  /** ID uniquely identifying the Period in the Manifest. */
  public readonly id : string;

  /** Every 'Adaptation' in that Period, per type of Adaptation. */
  public adaptations : IManifestAdaptations;

  /** Absolute start time of the Period, in seconds. */
  public start : number;

  /**
   * Duration of this Period, in seconds.
   * `undefined` for still-running Periods.
   */
  public duration : number | undefined;

  /**
   * Absolute end time of the Period, in seconds.
   * `undefined` for still-running Periods.
   */
  public end : number | undefined;

  /** Array containing every stream event happening on the period */
  public streamEvents : IManifestStreamEvent[];

  /**
   * @constructor
   * @param {Object} args
   * @param {Array.<Object>} unsupportedAdaptations - Array on which
   * `Adaptation`s objects which have no supported `Representation` will be
   * pushed.
   * This array might be useful for minor error reporting.
   * @param {function|undefined} [representationFilter]
   */
  constructor(
    args : IParsedPeriod,
    unsupportedAdaptations: Adaptation[],
    representationFilter? : IRepresentationFilter | undefined
  ) {
    this.id = args.id;
    this.adaptations = (Object.keys(args.adaptations) as ITrackType[])
      .reduce<IManifestAdaptations>((acc, type) => {
        const adaptationsForType = args.adaptations[type];
        if (adaptationsForType == null) {
          return acc;
        }
        const filteredAdaptations = adaptationsForType
          .map((adaptation) : Adaptation => {
            const newAdaptation = new Adaptation(adaptation,
                                                 { representationFilter });
            if (
              newAdaptation.representations.length > 0
              && newAdaptation.isSupported === false
            ) {
              unsupportedAdaptations.push(newAdaptation);
            }
            return newAdaptation;
          })
          .filter((adaptation) : adaptation is Adaptation =>
            adaptation.representations.length > 0
          );
        if (filteredAdaptations.every(adaptation => adaptation.isSupported === false) &&
            adaptationsForType.length > 0 &&
            (type === "video" || type === "audio")
        ) {
          throw new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR",
                               "No supported " + type + " adaptations",
                               { tracks: undefined });
        }

        if (filteredAdaptations.length > 0) {
          acc[type] = filteredAdaptations;
        }
        return acc;
      }, {});

    if (!Array.isArray(this.adaptations.video) &&
        !Array.isArray(this.adaptations.audio))
    {
      throw new MediaError("MANIFEST_PARSE_ERROR",
                           "No supported audio and video tracks.");
    }

    this.duration = args.duration;
    this.start = args.start;

    if (this.duration != null && this.start != null) {
      this.end = this.start + this.duration;
    }
    this.streamEvents = args.streamEvents === undefined ?
      [] :
      args.streamEvents;
  }

  /**
   * Some environments (e.g. in a WebWorker) may not have the capability to know
   * if a mimetype+codec combination is supported on the current platform.
   *
   * Calling `refreshCodecSupport` manually with a clear list of codecs supported
   * once it has been requested on a compatible environment (e.g. in the main
   * thread) allows to work-around this issue.
   *
   * @param {Array.<Object>} supportList
   * @param {Array.<Object>} unsupportedAdaptations - Array on which
   * `Adaptation`s objects which are now known to have no supported
   * `Representation` will be pushed.
   * This array might be useful for minor error reporting.
   */
  refreshCodecSupport(
    supportList: ICodecSupportList,
    unsupportedAdaptations: Adaptation[]
  ) {
    (Object.keys(this.adaptations) as ITrackType[]).forEach((ttype) => {
      const adaptationsForType = this.adaptations[ttype];
      if (adaptationsForType === undefined) {
        return;
      }
      let hasSupportedAdaptations: boolean | undefined = false;
      for (const adaptation of adaptationsForType) {
        const wasSupported = adaptation.isSupported;
        adaptation.refreshCodecSupport(supportList);
        if (wasSupported !== false && adaptation.isSupported === false) {
          unsupportedAdaptations.push(adaptation);
        }

        if (hasSupportedAdaptations === false) {
          hasSupportedAdaptations = adaptation.isSupported;
        } else if (
          hasSupportedAdaptations === undefined &&
          adaptation.isSupported === true
        ) {
          hasSupportedAdaptations = true;
        }
      }
      if (
        (ttype === "video" || ttype === "audio") &&
        hasSupportedAdaptations === false
      ) {
        throw new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR",
                             "No supported " + ttype + " adaptations",
                             { tracks: undefined });
      }
    }, {});
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
   * Array.
   * @returns {Array.<Object>}
   */
  getAdaptations() : Adaptation[] {
    return getAdaptations(this);
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period for a
   * given type.
   * @param {string} adaptationType
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType : ITrackType) : Adaptation[] {
    const adaptationsForType = this.adaptations[adaptationType];
    return adaptationsForType == null ? [] :
                                        adaptationsForType;
  }

  /**
   * Returns the Adaptation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getAdaptation(wantedId : string) : Adaptation|undefined {
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
  }

  /**
   * Returns Adaptations that contain Representations in supported codecs.
   * @param {string|undefined} type - If set filter on a specific Adaptation's
   * type. Will return for all types if `undefined`.
   * @returns {Array.<Adaptation>}
   */
  getSupportedAdaptations(type? : ITrackType | undefined) : Adaptation[] {
    return getSupportedAdaptations(this, type);
  }

  /**
   * Returns true if the give time is in the time boundaries of this `Period`.
   * @param {number} time
   * @param {object|null} nextPeriod - Period coming chronologically just
   * after in the same Manifest. `null` if this instance is the last `Period`.
   * @returns {boolean}
   */
  containsTime(time : number, nextPeriod : Period | null) : boolean {
    return periodContainsTime(this, time, nextPeriod);
  }

  /**
   * Format the current `Period`'s properties into a
   * `IPeriodMetadata` format which can better be communicated through
   * another thread.
   *
   * Please bear in mind however that the returned object will not be updated
   * when the current `Period` instance is updated, it is only a
   * snapshot at the current time.
   *
   * If you want to keep that data up-to-date with the current `Period`
   * instance, you will have to do it yourself.
   *
   * @returns {Object}
   */
  public getMetadataSnapshot() : IPeriodMetadata {
    const adaptations : Partial<Record<ITrackType, IAdaptationMetadata[]>> = {};
    const baseAdaptations = this.getAdaptations();
    for (const adaptation of baseAdaptations) {
      let currentAdaps : IAdaptationMetadata[] | undefined = adaptations[adaptation.type];
      if (currentAdaps === undefined) {
        currentAdaps = [];
        adaptations[adaptation.type] = currentAdaps;
      }
      currentAdaps.push(adaptation.getMetadataSnapshot());
    }
    return { start: this.start,
             end: this.end,
             id: this.id,
             streamEvents: this.streamEvents,
             adaptations };
  }
}
