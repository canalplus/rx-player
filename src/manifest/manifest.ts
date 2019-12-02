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
import { IParsedManifest } from "../parsers/manifest";
import arrayFind from "../utils/array_find";
import EventEmitter from "../utils/event_emitter";
import idGenerator from "../utils/id_generator";
import warnOnce from "../utils/warn_once";
import Adaptation, {
  IAdaptationType,
  IRepresentationFilter,
} from "./adaptation";
import Period from "./period";
import { StaticRepresentationIndex } from "./representation_index";
import updatePeriods from "./update_periods";

const generateNewId = idGenerator();

type ManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;

interface ISupplementaryImageTrack {
  mimeType : string; // mimeType identifying the type of container for the track
  url : string; // url to the thumbnails file
}

interface ISupplementaryTextTrack {
  mimeType : string; // mimeType identifying the type of container for the track
  codecs? : string; // codecs in the container (mimeType can be enough)
  url : string; // url to the text track file
  language? : string; // ISO639-{1,2,3} code for the language of the track
  languages? : string[]; // TODO remove
  closedCaption : boolean; // if true, the track are closed captions
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
 * Details the current content being played:
 *   - the duration of the content
 *   - the available tracks
 *   - the available qualities
 *   - the segments defined in those qualities
 *   - ...
 * while staying agnostic of the transport protocol used (Smooth or DASH).
 *
 * The Manifest and its contained information can evolve over time (like when
 * updating a live manifest of when right management forbid some tracks from
 * being played).
 * To perform actions on those changes, any module using this Manifest can
 * listen to its sent events and react accordingly.
 * @class Manifest
 */
export default class Manifest extends EventEmitter<IManifestEvents> {
  // ID uniquely identifying this Manifest.
  public id : string;

  // Type of transport used by this Manifest (e.g. `"dash"` or `"smooth"`.
  public transport : string;

  // Every `Adaptations` for the first `Period` of the Manifest.
  // Deprecated. Please use manifest.periods[0].adaptations instead.
  // @deprecated
  public adaptations : ManifestAdaptations;

  // List every `Period` in that Manifest chronologically (from its start time).
  // A `Period` contains content information about the content available for
  // a specific period in time.
  public readonly periods : Period[];

  // If true, this Manifest describes a content still running live.
  // If false, this Manifest describes a finished content.
  // At the moment this specificity cannot change with time.
  // TODO Handle that case?
  public isLive : boolean;

  // Every URI linking to that Manifest, used for refreshing it.
  // Listed from the most important to the least important.
  public uris : string[];

  // Suggested delay from the "live edge" the content is suggested to start
  // from.
  // This only applies to live contents.
  public suggestedPresentationDelay? : number;

  // Base URL from which relative segment's URLs will be relative to.
  // @param {string}
  public baseURL? : string;

  // Amount of time, in seconds, this Manifest is valid from its fetching time.
  // If not valid, you will need to refresh and update this Manifest (the latter
  // can be done through the `update` method).
  // If no lifetime is set, this Manifest does not become invalid after an
  // amount of time.
  public lifetime? : number;

  // Minimum time, in seconds, at which the segment defined in the Manifest
  // begins.
  public availabilityStartTime? : number;

  // Information about the first seekable position.
  public minimumTime? : {
    isContinuous : boolean; // Whether this value continuously evolve over time
    value : number; // Minimum seekable time in milliseconds calculated at `time`.
    time : number; // `Performance.now()` output at the time `value` was calculated
  };

  // Information about the last seekable position.
  public maximumTime? : {
    isContinuous : boolean; // Whether this value continuously evolve over time
    value : number; // Maximum seekable time in milliseconds calculated at `time`.
    time : number; // `Performance.now()` output at the time `value` was calculated
  };

  // Array containing every errors that happened when the Manifest has been
  // created, in the order they have happened.
  public parsingErrors : ICustomError[];

  // Whole duration anounced in the Manifest.
  private _duration : number|undefined;

  // Difference between the server's clock in ms and the return of the JS
  // function `performance.now`.
  // This property allows to calculate the server time at any moment.
  // `undefined` if we did not obtain the server's time
  private _clockOffset : number|undefined;

  /**
   * @param {Object} args
   */
  constructor(args : IParsedManifest, options : IManifestParsingOptions) {
    super();
    const { supplementaryTextTracks = [],
            supplementaryImageTracks = [],
            representationFilter } = options;
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
    this.adaptations = this.periods[0] == null ? {} :
                       this.periods[0].adaptations == null ? {} :
                       this.periods[0].adaptations;
    /* tslint:enable:deprecation */

    this.minimumTime = args.minimumTime;
    this.isLive = args.isLive;
    this.uris = args.uris === undefined ? [] :
                                          args.uris;

    this.lifetime = args.lifetime;
    this.suggestedPresentationDelay = args.suggestedPresentationDelay;
    this.availabilityStartTime = args.availabilityStartTime;
    this.maximumTime = args.maximumTime;
    this.baseURL = args.baseURL;

    if (!args.isLive && args.duration == null) {
      log.warn("Manifest: non live content and duration is null.");
    }
    this._duration = args.duration;

    if (supplementaryImageTracks.length > 0) {
      this.addSupplementaryImageAdaptations(supplementaryImageTracks);
    }
    if (supplementaryTextTracks.length > 0) {
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
  getPeriodAfter(period : Period) : Period | null {
    const endOfPeriod = period.end;
    if (endOfPeriod == null) {
      return null;
    }
    const nextPeriod = arrayFind(this.periods, (_period) => {
      return _period.end == null || endOfPeriod < _period.end;
    });
    return nextPeriod === undefined ? null :
                                      nextPeriod;
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
    if (firstPeriod == null) {
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
    if (firstPeriod == null) {
      return [];
    }
    const adaptationsForType = firstPeriod.adaptations[adaptationType];
    return adaptationsForType == null ? [] :
                                        adaptationsForType;
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
    this.maximumTime = newManifest.maximumTime;
    this.minimumTime = newManifest.minimumTime;
    this.parsingErrors = newManifest.parsingErrors;
    this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
    this.transport = newManifest.transport;
    this.uris = newManifest.uris;

    updatePeriods(this.periods, newManifest.periods);

    this.trigger("manifestUpdate", null);
  }

  /**
   * Get minimum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  public getMinimumPosition() : number {
    const { minimumTime } = this;
    if (minimumTime == null) {
      return 0;
    }
    if (!minimumTime.isContinuous) {
      return minimumTime.value;
    }
    const timeDiff = performance.now() - minimumTime.time;
    return minimumTime.value + timeDiff / 1000;
  }

  /**
   * Get maximum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  public getMaximumPosition() : number {
    const { maximumTime } = this;
    if (maximumTime === undefined) {
      if (this.isLive) {
        const ast = this.availabilityStartTime !== undefined ?
          this.availabilityStartTime :
          0;
        if (this._clockOffset == null) {
          // server's time not known, rely on user's clock
          return (Date.now() / 1000) - ast;
       }
        const serverTime = performance.now() + this._clockOffset;
        return (serverTime / 1000) - ast;
      }
      const duration = this.getDuration();
      return this.getMinimumPosition() + (duration ?? Infinity);
    }
    if (!maximumTime.isContinuous) {
      return maximumTime.value;
    }
    const timeDiff = performance.now() - maximumTime.time;
    return maximumTime.value + timeDiff / 1000;
  }

  /**
   * If true, this Manifest is currently synchronized with the server's clock.
   * @returns {Boolean}
   */
  public getClockOffset() : number | undefined {
    return this._clockOffset;
  }

  /**
   * Add supplementary image Adaptation(s) to the manifest.
   * @private
   * @param {Object|Array.<Object>} imageTracks
   */
  private addSupplementaryImageAdaptations(
    imageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
  ) : void {
    const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
    const newImageTracks = _imageTracks.map(({ mimeType, url }) => {
      const adaptationID = "gen-image-ada-" + generateNewId();
      const representationID = "gen-image-rep-" + generateNewId();
      const newAdaptation = new Adaptation({
        id: adaptationID,
        type: "image",
        representations: [{
          bitrate: 0,
          id: representationID,
          mimeType,
          index: new StaticRepresentationIndex({ media: url }),
        }],
      }, { isManuallyAdded: true });
      this.parsingErrors.push(...newAdaptation.parsingErrors);
      return newAdaptation;
    });

    if (newImageTracks.length > 0 && this.periods.length > 0) {
      const { adaptations } = this.periods[0];
      adaptations.image =
        adaptations.image != null ? adaptations.image.concat(newImageTracks) :
                                    newImageTracks;
    }
  }

  /**
   * Add supplementary text Adaptation(s) to the manifest.
   * @private
   * @param {Object|Array.<Object>} textTracks
   */
  private addSupplementaryTextAdaptations(
    textTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[]
  ) : void {
    const _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
    const newTextAdaptations = _textTracks.reduce((allSubs : Adaptation[], {
      mimeType,
      codecs,
      url,
      language,
      languages,
      closedCaption,
    }) => {
      const langsToMapOn : string[] = language != null ? [language] :
                                      languages != null ? languages :
                                                          [];

      return allSubs.concat(langsToMapOn.map((_language) => {
        const adaptationID = "gen-text-ada-" + generateNewId();
        const representationID = "gen-text-rep-" + generateNewId();
        const newAdaptation = new Adaptation({
          id: adaptationID,
          type: "text",
          language: _language,
          closedCaption,
          representations: [{
            bitrate: 0,
            id: representationID,
            mimeType,
            codecs,
            index: new StaticRepresentationIndex({ media: url }),
          }],
        }, { isManuallyAdded: true });
        this.parsingErrors.push(...newAdaptation.parsingErrors);
        return newAdaptation;
      }));
    }, []);

    if (newTextAdaptations.length > 0 && this.periods.length > 0) {
      const { adaptations } = this.periods[0];
      adaptations.text =
        adaptations.text != null ? adaptations.text.concat(newTextAdaptations) :
                                   newTextAdaptations;
    }
  }
}

export {
  IManifestParsingOptions,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
};
