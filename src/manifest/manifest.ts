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
import { IParsedManifest } from "../parsers/manifest";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import arrayFind from "../utils/array_find";
import { isABEqualBytes } from "../utils/byte_parsing";
import EventEmitter from "../utils/event_emitter";
import idGenerator from "../utils/id_generator";
import warnOnce from "../utils/warn_once";
import Adaptation, {
  IRepresentationFilter,
} from "./adaptation";
import Period, {
  IManifestAdaptations,
} from "./period";
import Representation from "./representation";
import { StaticRepresentationIndex } from "./representation_index";
import {
  IAdaptationType,
  MANIFEST_UPDATE_TYPE,
} from "./types";
import {
  replacePeriods,
  updatePeriods,
} from "./update_periods";

const generateSupplementaryTrackID = idGenerator();
const generateNewManifestId = idGenerator();

/**
 * Interface a manually-added supplementary image track should respect.
 * @deprecated
 */
interface ISupplementaryImageTrack {
  /** mime-type identifying the type of container for the track. */
  mimeType : string;
  /** URL to the thumbnails file */
  url : string;
}

/**
 * Interface a manually-added supplementary text track should respect.
 * @deprecated
 */
interface ISupplementaryTextTrack {
  /** mime-type identifying the type of container for the track. */
  mimeType : string;
  /** codecs in the container (mimeType can be enough) */
  codecs? : string;
  /** URL to the text track file */
  url : string;
  /** ISO639-{1,2,3} code for the language of the track */
  language? : string;
  /**
   * Same as `language`, but in an Array.
   * Kept for compatibility with old API.
   * @deprecated
   */
  languages? : string[];
  /** If true, the track are closed captions. */
  closedCaption : boolean;
}

/** Options given to the `Manifest` constructor. */
interface IManifestParsingOptions {
  /* tslint:disable deprecation */
  /** Text tracks to add manually to the Manifest instance. */
  supplementaryTextTracks? : ISupplementaryTextTrack[];
  /** Image tracks to add manually to the Manifest instance. */
  supplementaryImageTracks? : ISupplementaryImageTrack[];
  /* tslint:enable deprecation */
  /** External callback peforming an automatic filtering of wanted Representations. */
  representationFilter? : IRepresentationFilter;
}

/** Representation affected by a `decipherabilityUpdate` event. */
export interface IDecipherabilityUpdateElement { manifest : Manifest;
                                                 period : Period;
                                                 adaptation : Adaptation;
                                                 representation : Representation; }

/** Events emitted by a `Manifest` instance */
export interface IManifestEvents {
  /** The Manifest has been updated */
  manifestUpdate : null;
  /** Some Representation's decipherability status has been updated */
  decipherabilityUpdate : IDecipherabilityUpdateElement[];
}

/**
 * Normalized Manifest structure.
 *
 * Details the current content being played:
 *   - the duration of the content
 *   - the available tracks
 *   - the available qualities
 *   - the segments defined in those qualities
 *   - ...
 * while staying agnostic of the transport protocol used (Smooth, DASH etc.).
 *
 * The Manifest and its contained information can evolve over time (like when
 * updating a dynamic manifest or when right management forbid some tracks from
 * being played).
 * To perform actions on those changes, any module using this Manifest can
 * listen to its sent events and react accordingly.
 *
 * @class Manifest
 */
export default class Manifest extends EventEmitter<IManifestEvents> {
  /** ID uniquely identifying this Manifest. */
  public readonly id : string;

  /** Type of transport used by this Manifest (e.g. `"dash"` or `"smooth"`). */
  public transport : string;

  /**
   * List every Period in that Manifest chronologically (from start to end).
   * A Period contains information about the content available for a specific
   * period of time.
   */
  public readonly periods : Period[];

  /** When that promise resolves, the whole Manifest needs to be updated */
  public expired : Promise<void> | null;

  /**
   * Deprecated. Equivalent to manifest.periods[0].adaptations.
   * @deprecated
   */
  public adaptations : IManifestAdaptations;

  /**
   * If true, the Manifest can evolve over time. New content can be downloaded,
   * properties of the manifest can be changed.
   */
  public isDynamic : boolean;

  /**
   * If true, this Manifest describes a live content.
   * A live content is a specific kind of dynamic content where you want to play
   * as close as possible to the maximum position.
   * E.g., a TV channel is a live content.
   */
  public isLive : boolean;

  /*
   * Every URI linking to that Manifest.
   * They can be used for refreshing the Manifest.
   * Listed from the most important to the least important.
   */
  public uris : string[];

  /**
   * Suggested delay from the "live edge" the content is suggested to start
   * from.
   * This only applies to live contents.
   */
  public suggestedPresentationDelay? : number;

  /**
   * Amount of time, in seconds, this Manifest is valid from its fetching time.
   * If not valid, you will need to refresh and update this Manifest (the latter
   * can be done through the `update` method).
   * If no lifetime is set, this Manifest does not become invalid after an
   * amount of time.
   */
  public lifetime? : number;

  /**
   * Minimum time, in seconds, at which a segment defined in the Manifest
   * can begin.
   * This is also used as an offset for live content to apply to a segment's
   * time.
   */
  public availabilityStartTime? : number;

  /** Information about the first seekable position. */
  public minimumTime? : {
    isContinuous : boolean; // Whether this value continuously evolve over time
    value : number; // Minimum seekable time in milliseconds calculated at `time`.
    time : number; // `Performance.now()` output at the time `value` was calculated
  };

  /** Information about the last seekable position. */
  public maximumTime? : {
    isContinuous : boolean; // Whether this value continuously evolve over time
    value : number; // Maximum seekable time in milliseconds calculated at `time`.
    time : number; // `Performance.now()` output at the time `value` was calculated
  };

  /**
   * Array containing every minor errors that happened when the Manifest has
   * been created, in the order they have happened.
   */
  public parsingErrors : ICustomError[];

  /*
   * Difference between the server's clock in milliseconds and the return of the
   * JS function `performance.now`.
   * This property allows to calculate the server time at any moment.
   * `undefined` if we did not obtain the server's time
   */
  public clockOffset : number | undefined;

  /**
   * Construct a Manifest instance from a parsed Manifest object (as returned by
   * Manifest parsers) and options.
   *
   * Some minor errors can arise during that construction. `this.parsingErrors`
   * will contain all such errors, in the order they have been encountered.
   * @param {Object} parsedManifest
   * @param {Object} options
   */
  constructor(parsedManifest : IParsedManifest, options : IManifestParsingOptions) {
    super();
    const { supplementaryTextTracks = [],
            supplementaryImageTracks = [],
            representationFilter } = options;
    this.parsingErrors = [];
    this.id = generateNewManifestId();
    this.expired = parsedManifest.expired ?? null;
    this.transport = parsedManifest.transportType;
    this.clockOffset = parsedManifest.clockOffset;

    this.periods = parsedManifest.periods.map((parsedPeriod) => {
      const period = new Period(parsedPeriod, representationFilter);
      this.parsingErrors.push(...period.parsingErrors);
      return period;
    }).sort((a, b) => a.start - b.start);

    /**
     * @deprecated It is here to ensure compatibility with the way the
     * v3.x.x manages adaptations at the Manifest level
     */
    /* tslint:disable:deprecation */
    this.adaptations = this.periods[0] === undefined ? {} :
                                                       this.periods[0].adaptations;
    /* tslint:enable:deprecation */

    this.minimumTime = parsedManifest.minimumTime;
    this.isDynamic = parsedManifest.isDynamic;
    this.isLive = parsedManifest.isLive;
    this.uris = parsedManifest.uris === undefined ? [] :
                                                    parsedManifest.uris;

    this.lifetime = parsedManifest.lifetime;
    this.suggestedPresentationDelay = parsedManifest.suggestedPresentationDelay;
    this.availabilityStartTime = parsedManifest.availabilityStartTime;
    this.maximumTime = parsedManifest.maximumTime;

    if (supplementaryImageTracks.length > 0) {
      this.addSupplementaryImageAdaptations(supplementaryImageTracks);
    }
    if (supplementaryTextTracks.length > 0) {
      this.addSupplementaryTextAdaptations(supplementaryTextTracks);
    }
  }

  /**
   * Returns the Period corresponding to the given `id`.
   * Returns `undefined` if there is none.
   * @param {string} id
   * @returns {Object|undefined}
   */
  public getPeriod(id : string) : Period | undefined {
    return arrayFind(this.periods, (period) => {
      return id === period.id;
    });
  }

  /**
   * Returns the Period encountered at the given time.
   * Returns `undefined` if there is no Period exactly at the given time.
   * @param {number} time
   * @returns {Object|undefined}
   */
  public getPeriodForTime(time : number) : Period | undefined {
    return arrayFind(this.periods, (period) => {
      return time >= period.start &&
             (period.end === undefined || period.end > time);
    });
  }

  /**
   * Returns the Period coming chronologically just after another given Period.
   * Returns `undefined` if not found.
   * @param {Object} period
   * @returns {Object|null}
   */
  public getPeriodAfter(
    period : Period
  ) : Period | null {
    const endOfPeriod = period.end;
    if (endOfPeriod === undefined) {
      return null;
    }
    const nextPeriod = arrayFind(this.periods, (_period) => {
      return _period.end === undefined || endOfPeriod < _period.end;
    });
    return nextPeriod === undefined ? null :
                                      nextPeriod;
  }

  /**
   * Returns the most important URL from which the Manifest can be refreshed.
   * `undefined` if no URL is found.
   * @returns {string|undefined}
   */
  public getUrl() : string|undefined {
    return this.uris[0];
  }

  /**
   * Update the current Manifest properties by giving a new updated version.
   * This instance will be updated with the new information coming from it.
   * @param {Object} newManifest
   */
  public replace(newManifest : Manifest) : void {
    this._performUpdate(newManifest, MANIFEST_UPDATE_TYPE.Full);
  }

  /**
   * Update the current Manifest properties by giving a new but shorter version
   * of it.
   * This instance will add the new information coming from it and will
   * automatically clean old Periods that shouldn't be available anymore.
   *
   * /!\ Throws if the given Manifest cannot be used or is not sufficient to
   * update the Manifest.
   * @param {Object} newManifest
   */
  public update(newManifest : Manifest) : void {
    this._performUpdate(newManifest, MANIFEST_UPDATE_TYPE.Partial);
  }

  /**
   * Get the minimum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  public getMinimumPosition() : number {
    const { minimumTime } = this;
    if (minimumTime === undefined) {
      return 0;
    }
    if (!minimumTime.isContinuous) {
      return minimumTime.value;
    }
    const timeDiff = performance.now() - minimumTime.time;
    return minimumTime.value + timeDiff / 1000;
  }

  /**
   * Get the maximum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  public getMaximumPosition() : number {
    const { maximumTime } = this;
    if (maximumTime === undefined) {
      if (this.isLive) {
        const ast = this.availabilityStartTime !== undefined ?
          this.availabilityStartTime :
          0;
        if (this.clockOffset === undefined) {
          // server's time not known, rely on user's clock
          return (Date.now() / 1000) - ast;
       }
        const serverTime = performance.now() + this.clockOffset;
        return (serverTime / 1000) - ast;
      }
      return Infinity;
    }
    if (!maximumTime.isContinuous) {
      return maximumTime.value;
    }
    const timeDiff = performance.now() - maximumTime.time;
    return maximumTime.value + timeDiff / 1000;
  }

  /**
   * Look in the Manifest for Representations linked to the given key ID,
   * and mark them as being impossible to decrypt.
   * Then trigger a "blacklist-update" event to notify everyone of the changes
   * performed.
   * @param {Array.<ArrayBuffer>} keyIDs
   */
  public addUndecipherableKIDs(keyIDs : ArrayBuffer[]) : void {
    const updates = updateDeciperability(this, (representation) => {
      if (representation.decipherable === false ||
          representation.contentProtections === undefined)
      {
        return true;
      }
      const contentKIDs = representation.contentProtections.keyIds;
      for (let i = 0; i < contentKIDs.length; i++) {
        const elt = contentKIDs[i];
        for (let j = 0; j < keyIDs.length; j++) {
           if (isABEqualBytes(keyIDs[j], elt.keyId)) {
             return false;
           }
        }
      }
      return true;
    });

    if (updates.length > 0) {
      this.trigger("decipherabilityUpdate", updates);
    }
  }

  /**
   * Look in the Manifest for Representations linked to the given content
   * protection initialization data and mark them as being impossible to
   * decrypt.
   * Then trigger a "blacklist-update" event to notify everyone of the changes
   * performed.
   * @param {Array.<ArrayBuffer>} keyIDs
   */
  public addUndecipherableProtectionData(
    initDataType : string,
    initData : Uint8Array
  ) : void {
    const updates = updateDeciperability(this, (representation) => {
      if (representation.decipherable === false) {
        return true;
      }
      const segmentProtections = representation.getProtectionsInitializationData();
      for (let i = 0; i < segmentProtections.length; i++) {
        if (segmentProtections[i].type === initDataType) {
          if (areArraysOfNumbersEqual(initData, segmentProtections[i].data)) {
            return false;
          }
        }
      }
      return true;
    });

    if (updates.length > 0) {
      this.trigger("decipherabilityUpdate", updates);
    }
  }

  /**
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  public getAdaptations() : Adaptation[] {
    warnOnce("manifest.getAdaptations() is deprecated." +
             " Please use manifest.period[].getAdaptations() instead");
    const firstPeriod = this.periods[0];
    if (firstPeriod === undefined) {
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
  public getAdaptationsForType(adaptationType : IAdaptationType) : Adaptation[] {
    warnOnce("manifest.getAdaptationsForType(type) is deprecated." +
             " Please use manifest.period[].getAdaptationsForType(type) instead");
    const firstPeriod = this.periods[0];
    if (firstPeriod === undefined) {
      return [];
    }
    const adaptationsForType = firstPeriod.adaptations[adaptationType];
    return adaptationsForType === undefined ? [] :
                                              adaptationsForType;
  }

  /**
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  public getAdaptation(wantedId : number|string) : Adaptation|undefined {
    warnOnce("manifest.getAdaptation(id) is deprecated." +
             " Please use manifest.period[].getAdaptation(id) instead");
    /* tslint:disable:deprecation */
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    /* tslint:enable:deprecation */
  }

  /**
   * Add supplementary image Adaptation(s) to the manifest.
   * @private
   * @param {Object|Array.<Object>} imageTracks
   */
  private addSupplementaryImageAdaptations(
    /* tslint:disable deprecation */
    imageTracks : ISupplementaryImageTrack | ISupplementaryImageTrack[]
    /* tslint:enable deprecated */
  ) : void {
    const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
    const newImageTracks = _imageTracks.map(({ mimeType, url }) => {
      const adaptationID = "gen-image-ada-" + generateSupplementaryTrackID();
      const representationID = "gen-image-rep-" + generateSupplementaryTrackID();
      const newAdaptation = new Adaptation({ id: adaptationID,
                                             type: "image",
                                             representations: [{
                                               bitrate: 0,
                                               id: representationID,
                                               mimeType,
                                               index: new StaticRepresentationIndex({
                                                 media: url,
                                               }),
                                             }], },
                                             { isManuallyAdded: true });
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
    /* tslint:disable deprecation */
    textTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[]
    /* tslint:enable deprecation */
  ) : void {
    const _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
    const newTextAdaptations = _textTracks.reduce((allSubs : Adaptation[], {
      mimeType,
      codecs,
      url,
      language,
      /* tslint:disable deprecation */
      languages,
      /* tslint:enable deprecation */
      closedCaption,
    }) => {
      const langsToMapOn : string[] = language != null ? [language] :
                                      languages != null ? languages :
                                                          [];

      return allSubs.concat(langsToMapOn.map((_language) => {
        const adaptationID = "gen-text-ada-" + generateSupplementaryTrackID();
        const representationID = "gen-text-rep-" + generateSupplementaryTrackID();
        const newAdaptation = new Adaptation({ id: adaptationID,
                                               type: "text",
                                               language: _language,
                                               closedCaption,
                                               representations: [{
                                                 bitrate: 0,
                                                 id: representationID,
                                                 mimeType,
                                                 codecs,
                                                 index: new StaticRepresentationIndex({
                                                   media: url,
                                                 }),
                                               }], },
                                               { isManuallyAdded: true });
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

  /**
   * @param {Object} newManifest
   * @param {number} type
   */
  private _performUpdate(
    newManifest : Manifest,
    updateType : MANIFEST_UPDATE_TYPE
  ) : void {
    this.availabilityStartTime = newManifest.availabilityStartTime;
    this.expired = newManifest.expired;
    this.isDynamic = newManifest.isDynamic;
    this.isLive = newManifest.isLive;
    this.lifetime = newManifest.lifetime;
    this.maximumTime = newManifest.maximumTime;
    this.parsingErrors = newManifest.parsingErrors;
    this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
    this.transport = newManifest.transport;

    if (updateType === MANIFEST_UPDATE_TYPE.Full) {
      this.minimumTime = newManifest.minimumTime;
      this.uris = newManifest.uris;
      replacePeriods(this.periods, newManifest.periods);
    } else {
      updatePeriods(this.periods, newManifest.periods);

      // Partial updates do not remove old Periods.
      // This can become a memory problem when playing a content long enough.
      // Let's clean manually Periods behind the minimum possible position.
      const min = this.getMinimumPosition();
      while (this.periods.length > 0) {
        const period = this.periods[0];
        if (period.end === undefined || period.end > min) {
          break;
        }
        this.periods.shift();
      }
    }

    // Re-set this.adaptations for retro-compatibility in v3.x.x
    /* tslint:disable:deprecation */
    this.adaptations = this.periods[0] === undefined ?
                         {} :
                         this.periods[0].adaptations;
    /* tslint:enable:deprecation */

    // Let's trigger events at the end, as those can trigger side-effects.
    // We do not want the current Manifest object to be incomplete when those
    // happen.
    this.trigger("manifestUpdate", null);
  }
}

/**
 * Update decipherability based on a predicate given.
 * Do nothing for a Representation when the predicate returns false, mark as
 * undecipherable when the predicate returns false. Returns every updates in
 * an array.
 * @param {Manifest} manifest
 * @param {Function} predicate
 * @returns {Array.<Object>}
 */
function updateDeciperability(
  manifest : Manifest,
  predicate : (rep : Representation) => boolean
) : IDecipherabilityUpdateElement[] {
  const updates : IDecipherabilityUpdateElement[] = [];
  for (let i = 0; i < manifest.periods.length; i++) {
    const period = manifest.periods[i];
    const adaptations = period.getAdaptations();
    for (let j = 0; j < adaptations.length; j++) {
      const adaptation = adaptations[j];
      const representations = adaptation.representations;
      for (let k = 0; k < representations.length; k++) {
        const representation = representations[k];
        if (!predicate(representation)) {
          updates.push({ manifest, period, adaptation, representation });
          representation.decipherable = false;
        }
      }
    }
  }
  return updates;
}

export {
  IManifestParsingOptions,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
};
