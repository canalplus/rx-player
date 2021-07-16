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

import { IInitializationDataInfo } from "../core/eme";
import { ICustomError } from "../errors";
import { IParsedManifest } from "../parsers/manifest";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import arrayFind from "../utils/array_find";
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
import {
  IAdaptationType,
  MANIFEST_UPDATE_TYPE,
} from "./types";
import {
  replacePeriods,
  updatePeriods,
} from "./update_periods";

const generateNewManifestId = idGenerator();

/** Options given to the `Manifest` constructor. */
interface IManifestParsingOptions {
  /** External callback peforming an automatic filtering of wanted Representations. */
  representationFilter? : IRepresentationFilter;
  /** Optional URL that points to a shorter version of the Manifest used
   * for updates only. When using this URL for refresh, the manifest will be
   * updated with the partial update type. If this URL is undefined, then the
   * manifest will be updated fully when it needs to be refreshed, and it will
   * fetched through the original URL. */
  manifestUpdateUrl? : string;
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
  /**
   * ID uniquely identifying this Manifest.
   * No two Manifests should have this ID.
   * This ID is automatically calculated each time a `Manifest` instance is
   * created.
   */
  public readonly id : string;

  /**
   * Type of transport used by this Manifest (e.g. `"dash"` or `"smooth"`).
   *
   * TODO This should never be needed as this structure is transport-agnostic.
   * But it is specified in the Manifest API. Deprecate?
   */
  public transport : string;

  /**
   * List every Period in that Manifest chronologically (from start to end).
   * A Period contains information about the content available for a specific
   * period of time.
   */
  public readonly periods : Period[];

  /**
   * When that promise resolves, the whole Manifest needs to be requested again
   * so it can be refreshed.
   */
  public expired : Promise<void> | null;

  /**
   * Deprecated. Equivalent to `manifest.periods[0].adaptations`.
   * @deprecated
   */
  public adaptations : IManifestAdaptations;

  /**
   * If true, the Manifest can evolve over time:
   * New segments can become available in the future, properties of the manifest
   * can change...
   */
  public isDynamic : boolean;

  /**
   * If true, this Manifest describes a live content.
   * A live content is a specific kind of content where you want to play very
   * close to the maximum position (here called the "live edge").
   * E.g., a TV channel is a live content.
   */
  public isLive : boolean;

  /**
   * If `true`, no more periods will be added after the current last manifest's
   * Period.
   * `false` if we know that more Period is coming or if we don't know.
   */
  public isLastPeriodKnown : boolean;

  /*
   * Every URI linking to that Manifest.
   * They can be used for refreshing the Manifest.
   * Listed from the most important to the least important.
   */
  public uris : string[];

  /** Optional URL that points to a shorter version of the Manifest used
   * for updates only. */
  public updateUrl?: string;

  /**
   * Suggested delay from the "live edge" (i.e. the position corresponding to
   * the current broadcast for a live content) the content is suggested to start
   * from.
   * This only applies to live contents.
   */
  public suggestedPresentationDelay? : number;

  /**
   * Amount of time, in seconds, this Manifest is valid from the time when it
   * has been fetched.
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

  /**
   * It specifies the wall-clock time when the manifest was generated and published
   * at the origin server. It is present in order to identify different versions
   * of manifest instances.
   */
  public publishTime?: number;

  /**
   * Array containing every minor errors that happened when the Manifest has
   * been created, in the order they have happened.
   */
  public contentWarnings : ICustomError[];

  /*
   * Difference between the server's clock in milliseconds and the return of the
   * JS function `performance.now`.
   * This property allows to calculate the server time at any moment.
   * `undefined` if we did not obtain the server's time
   */
  public clockOffset : number | undefined;

  /**
   * Data allowing to calculate the minimum and maximum seekable positions at
   * any given time.
   */
  private _timeBounds : {
    /**
     * The minimum time, in seconds, that was available the last time the
     * Manifest was fetched.
     *
     * `undefined` if that value is unknown.
     *
     * Together with `timeshiftDepth` and the `maximumTimeData` object, this
     * value allows to compute at any time the minimum seekable time:
     *
     *   - if `timeshiftDepth` is not set, the minimum seekable time is a
     *     constant that corresponds to this value.
     *
     *    - if `timeshiftDepth` is set, `absoluteMinimumTime` will act as the
     *      absolute minimum seekable time we can never seek below, even when
     *      `timeshiftDepth` indicates a possible lower position.
     *      This becomes useful for example when playing live contents which -
     *      despite having a large window depth - just begun and as such only
     *      have a few segment available for now.
     *      Here, `absoluteMinimumTime` would be the start time of the initial
     *      segment, and `timeshiftDepth` would be the whole depth that will
     *      become available once enough segments have been generated.
     */
    absoluteMinimumTime? : number;
    /**
     * Some dynamic contents have the concept of a "window depth" (or "buffer
     * depth") which allows to set a minimum position for all reachable
     * segments, in function of the maximum reachable position.
     *
     * This is justified by the fact that a server might want to remove older
     * segments when new ones become available, to free storage size.
     *
     * If this value is set to a number, it is the amount of time in seconds
     * that needs to be substracted from the current maximum seekable position,
     * to obtain the minimum seekable position.
     * As such, this value evolves at the same rate than the maximum position
     * does (if it does at all).
     *
     * If set to `null`, this content has no concept of a "window depth".
     */
    timeshiftDepth : number | null;
    /** Data allowing to calculate the maximum position at any given time. */
    maximumTimeData : {
      /** Maximum seekable time in milliseconds calculated at `time`. */
      value : number;
      /**
       * `Performance.now()` output at the time `value` was calculated.
       * This can be used to retrieve the maximum position from `value` when it
       * linearly evolves over time (see `isLinear` property).
       */
      time : number;
      /**
       * Whether the maximum seekable position evolves linearly over time.
       *
       * If set to `false`, `value` indicates the constant maximum position.
       *
       * If set to `true`, the maximum seekable time continuously increase at
       * the same rate than the time since `time` does.
       * For example, a `value` of 50000 (50 seconds) will indicate a maximum time
       * of 51 seconds after 1 second have passed, of 56 seconds after 6 seconds
       * have passed (we know how many seconds have passed since the initial
       * calculation of value by checking the `time` property) etc.
       */
      isLinear: boolean;
    };
  };

  /**
   * Construct a Manifest instance from a parsed Manifest object (as returned by
   * Manifest parsers) and options.
   *
   * Some minor errors can arise during that construction. `this.contentWarnings`
   * will contain all such errors, in the order they have been encountered.
   * @param {Object} parsedManifest
   * @param {Object} options
   */
  constructor(parsedManifest : IParsedManifest, options : IManifestParsingOptions) {
    super();
    const { representationFilter,
            manifestUpdateUrl } = options;
    this.contentWarnings = [];
    this.id = generateNewManifestId();
    this.expired = parsedManifest.expired ?? null;
    this.transport = parsedManifest.transportType;
    this.clockOffset = parsedManifest.clockOffset;

    this.periods = parsedManifest.periods.map((parsedPeriod) => {
      const period = new Period(parsedPeriod, representationFilter);
      this.contentWarnings.push(...period.contentWarnings);
      return period;
    }).sort((a, b) => a.start - b.start);

    /**
     * @deprecated It is here to ensure compatibility with the way the
     * v3.x.x manages adaptations at the Manifest level
     */
    /* eslint-disable import/no-deprecated */
    this.adaptations = this.periods[0] === undefined ? {} :
                                                       this.periods[0].adaptations;
    /* eslint-enable import/no-deprecated */

    this._timeBounds = parsedManifest.timeBounds;
    this.isDynamic = parsedManifest.isDynamic;
    this.isLive = parsedManifest.isLive;
    this.isLastPeriodKnown = parsedManifest.isLastPeriodKnown;
    this.uris = parsedManifest.uris === undefined ? [] :
                                                    parsedManifest.uris;

    this.updateUrl = manifestUpdateUrl;
    this.lifetime = parsedManifest.lifetime;
    this.suggestedPresentationDelay = parsedManifest.suggestedPresentationDelay;
    this.availabilityStartTime = parsedManifest.availabilityStartTime;
    this.publishTime = parsedManifest.publishTime;
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
   * Returns the first Period starting strictly after the given time.
   * Returns `undefined` if there is no Period starting after that time.
   * @param {number} time
   * @returns {Object|undefined}
   */
  public getNextPeriod(time : number) : Period | undefined {
    return arrayFind(this.periods, (period) => {
      return period.start > time;
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
    const windowData = this._timeBounds;
    if (windowData.timeshiftDepth === null) {
      return windowData.absoluteMinimumTime ?? 0;
    }

    const { maximumTimeData } = windowData;
    let maximumTime : number;
    if (!windowData.maximumTimeData.isLinear) {
      maximumTime = maximumTimeData.value;
    } else {
      const timeDiff = performance.now() - maximumTimeData.time;
      maximumTime = maximumTimeData.value + timeDiff / 1000;
    }
    const theoricalMinimum = maximumTime - windowData.timeshiftDepth;
    return Math.max(windowData.absoluteMinimumTime ?? 0, theoricalMinimum);
  }

  /**
   * Get the maximum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  public getMaximumPosition() : number {
    const { maximumTimeData } = this._timeBounds;
    if (!maximumTimeData.isLinear) {
      return maximumTimeData.value;
    }
    const timeDiff = performance.now() - maximumTimeData.time;
    return maximumTimeData.value + timeDiff / 1000;
  }

  /**
   * Look in the Manifest for Representations linked to the given key ID,
   * and mark them as being impossible to decrypt.
   * Then trigger a "decipherabilityUpdate" event to notify everyone of the
   * changes performed.
   * @param {Object} keyUpdates
   */
  public updateDeciperabilitiesBasedOnKeyIds(
    { whitelistedKeyIds,
      blacklistedKeyIDs } : { whitelistedKeyIds : Uint8Array[];
                              blacklistedKeyIDs : Uint8Array[]; }
  ) : void {
    const updates = updateDeciperability(this, (representation) => {
      if (representation.decipherable === false ||
          representation.contentProtections === undefined)
      {
        return representation.decipherable;
      }
      const contentKIDs = representation.contentProtections.keyIds;
      for (let i = 0; i < contentKIDs.length; i++) {
        const elt = contentKIDs[i];
        for (let j = 0; j < blacklistedKeyIDs.length; j++) {
          if (areArraysOfNumbersEqual(blacklistedKeyIDs[j], elt.keyId)) {
            return false;
          }
        }
        for (let j = 0; j < whitelistedKeyIds.length; j++) {
          if (areArraysOfNumbersEqual(whitelistedKeyIds[j], elt.keyId)) {
            return true;
          }
        }
      }
      return representation.decipherable;
    });

    if (updates.length > 0) {
      this.trigger("decipherabilityUpdate", updates);
    }
  }

  /**
   * Look in the Manifest for Representations linked to the given content
   * protection initialization data and mark them as being impossible to
   * decrypt.
   * Then trigger a "decipherabilityUpdate" event to notify everyone of the
   * changes performed.
   * @param {Object} initData
   */
  public addUndecipherableProtectionData(initData : IInitializationDataInfo) : void {
    const updates = updateDeciperability(this, (representation) => {
      if (representation.decipherable === false) {
        return false;
      }
      const segmentProtections = representation.contentProtections?.initData ?? [];
      for (let i = 0; i < segmentProtections.length; i++) {
        if (initData.type === undefined ||
            segmentProtections[i].type === initData.type)
        {
          const containedInitData = initData.values.every(undecipherableVal => {
            return segmentProtections[i].values.some(currVal => {
              return (undecipherableVal.systemId === undefined ||
                      currVal.systemId === undecipherableVal.systemId) &&
                     areArraysOfNumbersEqual(currVal.data,
                                             undecipherableVal.data);
            });
          });
          if (containedInitData) {
            return false;
          }
        }
      }
      return representation.decipherable;
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
    /* eslint-disable import/no-deprecated */
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    /* eslint-enable import/no-deprecated */
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
    this.isLastPeriodKnown = newManifest.isLastPeriodKnown;
    this.lifetime = newManifest.lifetime;
    this.contentWarnings = newManifest.contentWarnings;
    this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
    this.transport = newManifest.transport;
    this.publishTime = newManifest.publishTime;

    if (updateType === MANIFEST_UPDATE_TYPE.Full) {
      this._timeBounds = newManifest._timeBounds;
      this.uris = newManifest.uris;
      replacePeriods(this.periods, newManifest.periods);
    } else {
      this._timeBounds.maximumTimeData = newManifest._timeBounds.maximumTimeData;
      this.updateUrl = newManifest.uris[0];
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
    /* eslint-disable import/no-deprecated */
    this.adaptations = this.periods[0] === undefined ?
                         {} :
                         this.periods[0].adaptations;
    /* eslint-enable import/no-deprecated */

    // Let's trigger events at the end, as those can trigger side-effects.
    // We do not want the current Manifest object to be incomplete when those
    // happen.
    this.trigger("manifestUpdate", null);
  }
}

/**
 * Update `decipherable` property of every `Representation` found in the
 * Manifest based on the result of a `isDecipherable` callback:
 *   - When that callback returns `true`, update `decipherable` to `true`
 *   - When that callback returns `false`, update `decipherable` to `false`
 *   - When that callback returns `undefined`, update `decipherable` to
 *     `undefined`
 * @param {Manifest} manifest
 * @param {Function} isDecipherable
 * @returns {Array.<Object>}
 */
function updateDeciperability(
  manifest : Manifest,
  isDecipherable : (rep : Representation) => boolean | undefined
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
        const result = isDecipherable(representation);
        if (result !== representation.decipherable) {
          updates.push({ manifest, period, adaptation, representation });
          representation.decipherable = result;
        }
      }
    }
  }
  return updates;
}

export { IManifestParsingOptions };
