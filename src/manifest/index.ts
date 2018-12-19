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
import { ICustomError } from "../errors";
import log from "../log";
import generateNewId from "../utils/id";
import warnOnce from "../utils/warnOnce";
import Adaptation, {
  IAdaptationType,
  IRepresentationFilter,
  SUPPORTED_ADAPTATIONS_TYPE,
} from "./adaptation";
import Period, {
  IPeriodArguments,
} from "./period";
import Representation from "./representation";
import IRepresentationIndex, {
  ISegment,
  StaticRepresentationIndex,
} from "./representation_index";

type ManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;

interface ISupplementaryImageTrack {
  mimeType : string;
  url : string;
}

interface ISupplementaryTextTrack {
  mimeType : string;
  codecs? : string;
  url : string;
  language? : string;
  languages? : string[];
  closedCaption : boolean;
}

interface IManifestArguments {
  // required
  id : string;
  isLive : boolean;
  periods : IPeriodArguments[];
  transportType : string;

  // optional
  availabilityStartTime? : number;
  baseURL? : string;
  duration? : number;
  lifetime? : number;
  minimumTime? : number;
  presentationLiveGap? : number;
  suggestedPresentationDelay? : number;
  timeShiftBufferDepth? : number;
  uris? : string[];
}

interface IManifestParsingOptions {
  supplementaryTextTracks? : ISupplementaryTextTrack[];
  supplementaryImageTracks? : ISupplementaryImageTrack[];
  representationFilter? : IRepresentationFilter;
}

/**
 * Normalized Manifest structure.
 * @class Manifest
 */
export default class Manifest {
  /**
   * ID uniquely identifying this Manifest.
   * @type {string}
   */
  public readonly id : string;

  /**
   * Type of transport used by this Manifest (e.g. `"dash"` or `"smooth`".
   * @type {string}
   */
  public readonly transport : string;

  /**
   * Every `Adaptations` for the first `Period` of the Manifest.
   * @deprecated
   * @type {Object}
   */
  public readonly adaptations : ManifestAdaptations;

  /**
   * List every `Period` in that Manifest chronologically (from its start time).
   * A `Period` contains content informations about the content available for
   * a specific period in time.
   * @type {Array.<Object>}
   */
  public readonly periods : Period[];

  /**
   * If true, this Manifest describes a content still running live.
   * If false, this Manifest describes a finished content.
   * At the moment this specificity cannot change with time.
   * TODO Handle that case?
   * @type {Boolean}
   */
  public readonly isLive : boolean;

  /**
   * Every URI linking to that Manifest, used for refreshing it.
   * Listed from the most important to the least important.
   * @type {Array.<string>}
   */
  public uris : string[];

  /**
   * Suggested delay from the "live edge" the content is suggested to start
   * from.
   * This only applies for live contents.
   * @type {number|undefined}
   */
  public suggestedPresentationDelay? : number;

  /**
   * Base URL from which relative segment's URLs will be relative to.
   * @param {string}
   */
  public baseURL? : string;

  /**
   * Amount of time, in seconds, this Manifest is valid from its fetching time.
   * If not valid, you will need to refresh and update this Manifest (the latter
   * can be done through the `update` method).
   * If no lifetime is set, this Manifest does not become invalid after an
   * amount of time.
   * @type {number|undefined}
   */
  public lifetime? : number;

  /**
   * Minimum time, in seconds, at which the segment defined in the Manifest
   * begins.
   * @type {number|undefined}
   */
  public availabilityStartTime? : number;

  /**
   * Minimum time in this Manifest we can seek to, in seconds.
   * @type {number|undefined}
   */
  public minimumTime? : number;

  /**
   * Estimated difference between Date.now() and the real live edge of the
   * content.
   * Note: this is sometimes really hard to estimate.
   * @type {number|undefined}
   */
  public presentationLiveGap? : number;

  /**
   * Time - relative to the last available position - in seconds from when
   * the first segment is available.
   * Every segments before that time can be considered as unavailable.
   * This is also sometimes called the `TimeShift window`.
   * @type {number|undefined}
   */
  public timeShiftBufferDepth? : number;

  /**
   * Array containing every errors that happened when the Manifest has been
   * created, in the order they have happened.
   * @type {Array.<Error>}
   */
  public parsingErrors : Array<Error|ICustomError>;

  /**
   * Whole duration anounced in the Manifest.
   * @private
   * @type {number}
   */
  private _duration : number|undefined;

  /**
   * @constructor
   * @param {Object} args
   */
  constructor(args : IManifestArguments, options : IManifestParsingOptions) {
    const {
      supplementaryTextTracks = [],
      supplementaryImageTracks = [],
      representationFilter,
    } = options;
    this.parsingErrors = [];
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.transport = args.transportType || "";

    this.periods = args.periods.map((period) => {
      const parsedPeriod = new Period(period, representationFilter);
      this.parsingErrors.push(...parsedPeriod.parsingErrors);
      return parsedPeriod;
    });

    /**
     * @deprecated It is here to ensure compatibility with the way the
     * v3.x.x manages adaptations at the Manifest level
     */
    /* tslint:disable:deprecation */
    this.adaptations = (this.periods[0] && this.periods[0].adaptations) || {};
    /* tslint:enable:deprecation */

    this.minimumTime = args.minimumTime;
    this.isLive = args.isLive;
    this.uris = args.uris || [];

    this.lifetime = args.lifetime;
    this.suggestedPresentationDelay = args.suggestedPresentationDelay;
    this.availabilityStartTime = args.availabilityStartTime;
    this.presentationLiveGap = args.presentationLiveGap;
    this.timeShiftBufferDepth = args.timeShiftBufferDepth;
    this.baseURL = args.baseURL;

    if (args.isLive && args.duration == null) {
      log.warn("Manifest: non live content and duration is null.");
    }
    this._duration = args.duration;

    if (supplementaryImageTracks.length) {
      this.addSupplementaryImageAdaptations(supplementaryImageTracks);
    }
    if (supplementaryTextTracks.length) {
      this.addSupplementaryTextAdaptations(supplementaryTextTracks);
    }
  }

  /**
   * Returns Period encountered at the given time.
   * Returns undefined if there is no Period exactly at the given time.
   * @param {number} time
   * @returns {Period|undefined}
   */
  getPeriodForTime(time : number) : Period|undefined {
    return arrayFind(this.periods, (period) => {
      return time >= period.start &&
        (period.end == null || period.end > time);
    });
  }

  /**
   * Returns period coming just after a given period.
   * Returns undefined if not found.
   * @param {Period} period
   * @returns {Period|null}
   */
  getPeriodAfter(period : Period) : Period|null {
    const endOfPeriod = period.end;
    if (endOfPeriod == null) {
      return null;
    }
    return arrayFind(this.periods, (_period) => {
      return _period.end == null || endOfPeriod < _period.end;
    }) || null;
  }

  /**
   * Returns the duration of the whole content described by that Manifest.
   * @returns {Number}
   */
  getDuration() : number|undefined {
    return this._duration;
  }

  /**
   * Returns the most important URL from which the Manifest can be refreshed.
   * @returns {string|undefined}
   */
  getUrl() : string|undefined {
    return this.uris[0];
  }

  /**
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptations() : Adaptation[] {
    warnOnce("manifest.getAdaptations() is deprecated." +
      " Please use manifest.period[].getAdaptations() instead");
    const firstPeriod = this.periods[0];
    if (!firstPeriod) {
      return [];
    }
    const adaptationsByType = firstPeriod.adaptations;
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
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType : IAdaptationType) : Adaptation[] {
    warnOnce("manifest.getAdaptationsForType(type) is deprecated." +
      " Please use manifest.period[].getAdaptationsForType(type) instead");
    const firstPeriod = this.periods[0];
    if (!firstPeriod) {
      return [];
    }
    return firstPeriod.adaptations[adaptationType] || [];
  }

  /**
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptation(wantedId : number|string) : Adaptation|undefined {
    warnOnce("manifest.getAdaptation(id) is deprecated." +
      " Please use manifest.period[].getAdaptation(id) instead");
    /* tslint:disable:deprecation */
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    /* tslint:enable:deprecation */
  }

  /**
   * @param {number} delta
   */
  updateLiveGap(delta : number) : void {
    if (this.isLive) {
      if (this.presentationLiveGap) {
        this.presentationLiveGap += delta;
      } else {
        this.presentationLiveGap = delta;
      }
    }
  }

  /**
   * Update the current manifest properties
   * @param {Object} Manifest
   */
  update(newManifest : Manifest) : Manifest {
    this._duration = newManifest.getDuration();
    this.availabilityStartTime = newManifest.availabilityStartTime;
    this.lifetime = newManifest.lifetime;
    this.minimumTime = newManifest.minimumTime;
    this.parsingErrors = newManifest.parsingErrors;
    this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
    this.timeShiftBufferDepth = newManifest.timeShiftBufferDepth;
    this.uris = newManifest.uris;

    const oldPeriods = this.periods;
    const newPeriods = newManifest.periods;

    for (let i = 0; i < oldPeriods.length; i++) {
      const oldPeriod = oldPeriods[i];
      const newPeriod =
        arrayFind(newPeriods, a => a.id === oldPeriod.id);

      if (!newPeriod) {
        log.info(`Period ${oldPeriod.id} not found after update. Removing.`);
        oldPeriods.splice(i, 1);
        i--;
      } else {
        oldPeriod.start = newPeriod.start;
        oldPeriod.end = newPeriod.end;
        oldPeriod.duration = newPeriod.duration;

        const oldAdaptations = oldPeriod.getAdaptations();
        const newAdaptations = newPeriod.getAdaptations();

        for (let j = 0; j < oldAdaptations.length; j++) {
          const oldAdaptation = oldAdaptations[j];
          const newAdaptation =
            arrayFind(newAdaptations, a => a.id === oldAdaptation.id);

          if (!newAdaptation) {
            log.warn(
              `manifest: adaptation "${oldAdaptations[j].id}" not found when merging.`
            );
          } else {
            const oldRepresentations = oldAdaptations[j].representations;
            const newRepresentations = newAdaptation.representations;

            for (let k = 0; k < oldRepresentations.length; k++) {
              const oldRepresentation = oldRepresentations[k];
              const newRepresentation = arrayFind(newRepresentations,
                representation => representation.id === oldRepresentation.id);

              if (!newRepresentation) {
                /* tslint:disable:max-line-length */
                log.warn(
                  `manifest: representation "${oldRepresentations[k].id}" not found when merging.`
                );
                /* tslint:enable:max-line-length */
              } else {
                oldRepresentations[k].index._update(newRepresentation.index);
              }
            }
          }
        }
      }
    }

    // adding - perhaps - new Period[s]
    if (newPeriods.length > oldPeriods.length) {
      const lastOldPeriod = oldPeriods[oldPeriods.length - 1];
      if (lastOldPeriod) {
        for (let i = 0; i < newPeriods.length - 1; i++) {
          const newPeriod = newPeriods[i];
          if (newPeriod.start > lastOldPeriod.start) {
            log.info(`Adding new period ${newPeriod.id}`);
            this.periods.push(newPeriod);
          }
        }
      } else {
        for (let i = 0; i < newPeriods.length - 1; i++) {
          const newPeriod = newPeriods[i];
          log.info(`Adding new period ${newPeriod.id}`);
          this.periods.push(newPeriod);
        }
      }
    }
    return this;
  }

  /**
   * Get minimum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  public getMinimumPosition() : number {
    // we have to know both the min and the max to be sure
    const [min] = this.getCurrentPositionLimits();
    return min;
  }

  /**
   * Get maximum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  public getMaximumPosition() : number {
    if (!this.isLive) {
      const duration = this.getDuration();
      return duration == null ? Infinity : duration;
    }
    const ast = this.availabilityStartTime || 0;
    const plg = this.presentationLiveGap || 0;
    const now = Date.now() / 1000;
    return now - ast - plg;
  }

  /**
   * Get minimum AND maximum positions currently defined by the manifest, in
   * seconds.
   * @returns {Array.<number>}
   */
  public getCurrentPositionLimits() : [number, number] {
    // TODO use RTT for the manifest request? (+ 3 or something)
    const BUFFER_DEPTH_SECURITY = 5;

    const ast = this.availabilityStartTime || 0;
    const minimumTime = this.minimumTime != null ? this.minimumTime : ast;
    if (!this.isLive) {
      const duration = this.getDuration();
      const maximumTime = duration == null ? Infinity : duration;
      return [minimumTime, maximumTime];
    }

    const plg = this.presentationLiveGap || 0;
    const tsbd = this.timeShiftBufferDepth || 0;

    const now = Date.now() / 1000;
    const max = now - ast - plg;
    return [
      Math.min(
        max,
        Math.max(minimumTime, max - tsbd + BUFFER_DEPTH_SECURITY)
      ),
      max,
    ];
  }

  /**
   * Add supplementary image Adaptation(s) to the manifest.
   * @private
   * @param {Object|Array.<Object>} imageTracks
   */
  private addSupplementaryImageAdaptations(
    imageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
  ) {
    const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
    const newImageTracks = _imageTracks.map(({ mimeType, url }) => {
      const adaptationID = "gen-image-ada-" + generateNewId();
      const representationID = "gen-image-rep-" + generateNewId();
      const newAdaptation = new Adaptation({
        id: adaptationID,
        type: "image",
        manuallyAdded: true,
        representations: [{
          bitrate: 0,
          id: representationID,
          mimeType,
          index: new StaticRepresentationIndex({ media: url }),
        }],
      });
      this.parsingErrors.push(...newAdaptation.parsingErrors);
      return newAdaptation;
    });

    if (newImageTracks.length && this.periods.length) {
      const { adaptations } = this.periods[0];
      adaptations.image = adaptations.image ?
        adaptations.image.concat(newImageTracks) : newImageTracks;
    }
  }

  /**
   * Add supplementary text Adaptation(s) to the manifest.
   * @private
   * @param {Object|Array.<Object>} textTracks
   */
  private addSupplementaryTextAdaptations(
    textTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[]
  ) {
    const _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
    const newTextAdaptations = _textTracks.reduce((allSubs : Adaptation[], {
      mimeType,
      codecs,
      url,
      language,
      languages,
      closedCaption,
    }) => {
      const langsToMapOn : string[] = language ? [language] : languages || [];

      return allSubs.concat(langsToMapOn.map((_language) => {
        const adaptationID = "gen-text-ada-" + generateNewId();
        const representationID = "gen-text-rep-" + generateNewId();
        const newAdaptation = new Adaptation({
          id: adaptationID,
          type: "text",
          language: _language,
          closedCaption,
          manuallyAdded: true,
          representations: [{
            bitrate: 0,
            id: representationID,
            mimeType,
            codecs,
            index: new StaticRepresentationIndex({ media: url }),
          }],
        });
        this.parsingErrors.push(...newAdaptation.parsingErrors);
        return newAdaptation;
      }));
    }, []);

    if (newTextAdaptations.length && this.periods.length) {
      const { adaptations } = this.periods[0];
      adaptations.text = adaptations.text ?
        adaptations.text.concat(newTextAdaptations) : newTextAdaptations;
    }
  }
}

export {
  // classes
  Period,
  Adaptation,
  Representation,

  // types
  IAdaptationType,
  IManifestArguments,
  IManifestParsingOptions,
  IRepresentationFilter,
  IRepresentationIndex,
  ISegment,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
  SUPPORTED_ADAPTATIONS_TYPE,
};
