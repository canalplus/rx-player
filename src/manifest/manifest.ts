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

import { ICustomError } from "../errors";
import log from "../log";
import arrayFind from "../utils/array_find";
import EventEmitter from "../utils/event_emitter";
import idGenerator from "../utils/id_generator";
import warnOnce from "../utils/warn_once";
import Adaptation, {
  IAdaptationType,
  IRepresentationFilter,
} from "./adaptation";
import Period, {
  IPeriodArguments,
} from "./period";
import { StaticRepresentationIndex } from "./representation_index";
import updatePeriodInPlace from "./update_period";

const generateNewId = idGenerator();

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
  clockOffset?: number;
}

interface IManifestParsingOptions {
  supplementaryTextTracks? : ISupplementaryTextTrack[];
  supplementaryImageTracks? : ISupplementaryImageTrack[];
  representationFilter? : IRepresentationFilter;
}

export interface IManifestEvents {
  manifestUpdate : null;
}

/**
 * Normalized Manifest structure.
 * @class Manifest
 */
export default class Manifest extends EventEmitter<IManifestEvents> {
  /**
   * ID uniquely identifying this Manifest.
   * @type {string}
   */
  public id : string;

  /**
   * Type of transport used by this Manifest (e.g. `"dash"` or `"smooth"`.
   * @type {string}
   */
  public transport : string;

  /**
   * Every `Adaptations` for the first `Period` of the Manifest.
   * Deprecated. Please use manifest.periods[0].adaptations instead.
   * @deprecated
   * @type {Object}
   */
  public adaptations : ManifestAdaptations;

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
  public isLive : boolean;

  /**
   * Every URI linking to that Manifest, used for refreshing it.
   * Listed from the most important to the least important.
   * @type {Array.<string>}
   */
  public uris : string[];

  /**
   * Suggested delay from the "live edge" the content is suggested to start
   * from.
   * This only applies to live contents.
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

  private _clockOffset : number|undefined;

  /**
   * @constructor
   * @param {Object} args
   */
  constructor(args : IManifestArguments, options : IManifestParsingOptions) {
    super();
    const {
      supplementaryTextTracks = [],
      supplementaryImageTracks = [],
      representationFilter,
    } = options;
    this.parsingErrors = [];
    this.id = args.id;
    this.transport = args.transportType;
    this._clockOffset = args.clockOffset;

    this.periods = args.periods.map((period) => {
      const parsedPeriod = new Period(period, representationFilter);
      this.parsingErrors.push(...parsedPeriod.parsingErrors);
      return parsedPeriod;
    }).sort((a, b) => a.start - b.start);

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

    if (!args.isLive && args.duration == null) {
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
   * Update the current manifest properties
   * @param {Object} Manifest
   */
  update(newManifest : Manifest) : void {
    this._duration = newManifest.getDuration();

    /* tslint:disable:deprecation */
    this.adaptations = newManifest.adaptations;
    /* tslint:enable:deprecation */

    this.availabilityStartTime = newManifest.availabilityStartTime;
    this.baseURL = newManifest.baseURL;
    this.id = newManifest.id;
    this.isLive = newManifest.isLive;
    this.lifetime = newManifest.lifetime;
    this.minimumTime = newManifest.minimumTime;
    this.parsingErrors = newManifest.parsingErrors;
    this.presentationLiveGap = newManifest.presentationLiveGap;
    this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
    this.timeShiftBufferDepth = newManifest.timeShiftBufferDepth;
    this.transport = newManifest.transport;
    this.uris = newManifest.uris;

    const oldPeriods = this.periods;
    const newPeriods = newManifest.periods;

    let oldPeriodCounter = 0;
    let newPeriodCounter = 0;

    // 2 - Update Periods in both Manifests
    while (oldPeriodCounter < oldPeriods.length) {
      const newPeriod = newPeriods[newPeriodCounter];
      const oldPeriod = oldPeriods[oldPeriodCounter];

      if (newPeriod == null) {
        log.info(`Manifest: Period ${oldPeriod.id} not found after update. Removing.`);
        oldPeriods.splice(oldPeriodCounter, 1);
        oldPeriodCounter--;
      } else if (newPeriod.id === oldPeriod.id) {
        updatePeriodInPlace(oldPeriod, newPeriod);
      } else {
        log.info(`Manifest: Adding new Period ${newPeriod.id} after update.`);
        this.periods.splice(oldPeriodCounter, 0, newPeriod);
      }
      oldPeriodCounter++;
      newPeriodCounter++;
    }

    // adding - perhaps - new Period[s]
    if (newPeriodCounter < newPeriods.length) {
      log.info("Manifest: Adding new periods after update.");
      this.periods.push(...newPeriods.slice(newPeriodCounter));
    }
    this.trigger("manifestUpdate", null);
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
    const now = this.getTime() / 1000;
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

    const minimumTime = this.minimumTime != null ? this.minimumTime : 0;
    if (!this.isLive) {
      const duration = this.getDuration();
      const maximumTime = duration == null ? Infinity : duration;
      return [minimumTime, maximumTime];
    }

    const ast = this.availabilityStartTime || 0;
    const plg = this.presentationLiveGap || 0;
    const tsbd = this.timeShiftBufferDepth || 0;

    const now = this.getTime() / 1000;
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
   * If true, this Manifest is currently synchronized with the server's clock.
   * @returns {Boolean}
   */
  public hasClockSynchronization() : boolean {
    return this._clockOffset != null;
  }

  private getTime() {
    return Date.now() - (this._clockOffset || 0);
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
  IManifestArguments,
  IManifestParsingOptions,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
};
