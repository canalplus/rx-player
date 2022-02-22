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
import {
  ICustomError,
  MediaError,
} from "../errors";
import { IParsedManifest } from "../parsers/manifest";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import arrayFind from "../utils/array_find";
import EventEmitter from "../utils/event_emitter";
import idGenerator from "../utils/id_generator";
import PPromise from "../utils/promise";
import warnOnce from "../utils/warn_once";
import {
  createAdaptationObject,
  IRepresentationFilter,
} from "./adaptation";
import { createPeriodObject } from "./period";
import { StaticRepresentationIndex } from "./representation_index";
import {
  IAdaptation,
  IAdaptationType,
  IDecipherabilityUpdateElement,
  IManifest,
  IManifestEvents,
  IPeriod,
  IRepresentation,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
  MANIFEST_UPDATE_TYPE,
} from "./types";
import {
  replacePeriods,
  updatePeriods,
} from "./update_periods";

const generateSupplementaryTrackID = idGenerator();
const generateNewManifestId = idGenerator();

/**
 * Create an `IManifest`-compatible object, which will list all characteristics
 * about a media content, regardless of the streaming protocol.
 * @param {Object} parsedAdaptation
 * @param {Object} options
 * @returns {Array.<Object>} Tuple of two values:
 *   1. The parsed Manifest as an object
 *   2. Array containing every minor errors that happened when the Manifest has
 *      been created, in the order they have happened..
 */
export async function createManifestObject(
  parsedManifest : IParsedManifest,
  options : IManifestParsingOptions
) : Promise<[IManifest, ICustomError[]]> {
  const eventEmitter = new EventEmitter<IManifestEvents>();
  const { supplementaryTextTracks = [],
          supplementaryImageTracks = [],
          representationFilter } = options;

  const warnings : ICustomError[] = [];

  const _periodProms : Array<Promise<[IPeriod, ICustomError[]]>> = [];
  for (const parsedPeriod of parsedManifest.periods) {
    _periodProms.push(createPeriodObject(parsedPeriod,
                                         representationFilter));
  }

  const _periods : IPeriod[] = [];
  for (const [period, pWarnings] of await PPromise.all(_periodProms)) {
    warnings.push(...pWarnings);
    _periods.push(period);
  }
  _periods.sort((a, b) => a.start - b.start);

  const manifestObject : IManifest = {
    id: generateNewManifestId(),
    expired: parsedManifest.expired ?? null,
    transport: parsedManifest.transportType,
    clockOffset: parsedManifest.clockOffset,
    periods: _periods,
    /* eslint-disable-next-line import/no-deprecated */
    adaptations: _periods[0]?.adaptations ?? {},
    isDynamic: parsedManifest.isDynamic,
    isLive: parsedManifest.isLive,
    isLastPeriodKnown: parsedManifest.isLastPeriodKnown,
    uris: parsedManifest.uris ?? [],
    updateUrl: options.manifestUpdateUrl,
    lifetime: parsedManifest.lifetime,
    suggestedPresentationDelay: parsedManifest.suggestedPresentationDelay,
    availabilityStartTime: parsedManifest.availabilityStartTime,
    publishTime: parsedManifest.publishTime,
    timeBounds: parsedManifest.timeBounds,
    getPeriod,
    getPeriodForTime,
    getPeriodAfter,
    getNextPeriod,
    getUrl,
    replace,
    update,
    getMinimumPosition,
    getMaximumPosition,
    updateDeciperabilitiesBasedOnKeyIds,
    addUndecipherableProtectionData,
    getAdaptations,
    getAdaptationsForType,
    getAdaptation,
    addEventListener: eventEmitter.addEventListener.bind(eventEmitter),
    removeEventListener: eventEmitter.removeEventListener.bind(eventEmitter),
  };

  if (supplementaryImageTracks.length > 0) {
    await _addSupplementaryImageAdaptations(supplementaryImageTracks);
  }
  if (supplementaryTextTracks.length > 0) {
    await _addSupplementaryTextAdaptations(supplementaryTextTracks);
  }

  return [manifestObject, warnings];

  /** @link IManifest */
  function getPeriod(periodId : string) : IPeriod | undefined {
    return arrayFind(manifestObject.periods, (period) => {
      return periodId === period.id;
    });
  }

  /** @link IManifest */
  function getPeriodForTime(time : number) : IPeriod | undefined {
    return arrayFind(manifestObject.periods, (period) => {
      return time >= period.start &&
             (period.end === undefined || period.end > time);
    });
  }

  /** @link IManifest */
  function getNextPeriod(time : number) : IPeriod | undefined {
    return arrayFind(manifestObject.periods, (period) => {
      return period.start > time;
    });
  }

  /** @link IManifest */
  function getPeriodAfter(
    period : IPeriod
  ) : IPeriod | null {
    const endOfPeriod = period.end;
    if (endOfPeriod === undefined) {
      return null;
    }
    const nextPeriod = arrayFind(manifestObject.periods, (_period) => {
      return _period.end === undefined || endOfPeriod < _period.end;
    });
    return nextPeriod === undefined ? null :
                                      nextPeriod;
  }

  /** @link IManifest */
  function getUrl() : string|undefined {
    return manifestObject.uris[0];
  }

  /** @link IManifest */
  function replace(newManifest : IManifest) : void {
    _performUpdate(newManifest, MANIFEST_UPDATE_TYPE.Full);
  }

  /** @link IManifest */
  function update(newManifest : IManifest) : void {
    _performUpdate(newManifest, MANIFEST_UPDATE_TYPE.Partial);
  }

  /** @link IManifest */
  function getMinimumPosition() : number {
    const windowData = manifestObject.timeBounds;
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

  /** @link IManifest */
  function getMaximumPosition() : number {
    const { maximumTimeData } = manifestObject.timeBounds;
    if (!maximumTimeData.isLinear) {
      return maximumTimeData.value;
    }
    const timeDiff = performance.now() - maximumTimeData.time;
    return maximumTimeData.value + timeDiff / 1000;
  }

  /** @link IManifest */
  function updateDeciperabilitiesBasedOnKeyIds(
    { whitelistedKeyIds,
      blacklistedKeyIDs } : { whitelistedKeyIds : Uint8Array[];
                              blacklistedKeyIDs : Uint8Array[]; }
  ) : void {
    const updates = updateDeciperability(manifestObject, (representation) => {
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
      eventEmitter.trigger("decipherabilityUpdate", updates);
    }
  }

  /** @link IManifest */
  function addUndecipherableProtectionData(initData : IInitializationDataInfo) : void {
    const updates = updateDeciperability(manifestObject, (representation) => {
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
      eventEmitter.trigger("decipherabilityUpdate", updates);
    }
  }

  /** @link IManifest */
  function getAdaptations() : IAdaptation[] {
    warnOnce("manifest.getAdaptations() is deprecated." +
             " Please use manifest.period[].getAdaptations() instead");
    const firstPeriod = manifestObject.periods[0];
    if (firstPeriod === undefined) {
      return [];
    }
    const adaptationsByType = firstPeriod.adaptations;
    const adaptationsList : IAdaptation[] = [];
    for (const adaptationType in adaptationsByType) {
      if (adaptationsByType.hasOwnProperty(adaptationType)) {
        const _adap =
          adaptationsByType[adaptationType as IAdaptationType] as IAdaptation[];
        adaptationsList.push(..._adap);
      }
    }
    return adaptationsList;
  }

  /** @link IManifest */
  function getAdaptationsForType(adaptationType : IAdaptationType) : IAdaptation[] {
    warnOnce("manifest.getAdaptationsForType(type) is deprecated." +
             " Please use manifest.period[].getAdaptationsForType(type) instead");
    const firstPeriod = manifestObject.periods[0];
    if (firstPeriod === undefined) {
      return [];
    }
    const adaptationsForType = firstPeriod.adaptations[adaptationType];
    return adaptationsForType === undefined ? [] :
                                              adaptationsForType;
  }

  /** @link IManifest */
  function getAdaptation(wantedId : number|string) : IAdaptation|undefined {
    warnOnce("manifest.getAdaptation(id) is deprecated." +
             " Please use manifest.period[].getAdaptation(id) instead");
    /* eslint-disable-next-line import/no-deprecated */
    return arrayFind(getAdaptations(), ({ id }) => wantedId === id);
  }

  /**
   * Add supplementary image Adaptation(s) to the manifest.
   * @param {Object|Array.<Object>} imageTracks
   */
  async function _addSupplementaryImageAdaptations(
    /* eslint-disable-next-line import/no-deprecated */
    imageTracks : ISupplementaryImageTrack | ISupplementaryImageTrack[]
  ) : Promise<void> {
    const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
    const newImageTracks : IAdaptation[] = [];
    for (const { mimeType, url } of _imageTracks) {
      const adaptationID = "gen-image-ada-" + generateSupplementaryTrackID();
      const representationID = "gen-image-rep-" + generateSupplementaryTrackID();
      const newAdaptation = await createAdaptationObject({
        id: adaptationID,
        type: "image",
        representations: [{
          bitrate: 0,
          id: representationID,
          mimeType,
          index: new StaticRepresentationIndex({ media: url }),
        }],
      }, { isManuallyAdded: true });
      if (newAdaptation.representations.length > 0 &&
          newAdaptation.hasSupport)
      {
        const error =
          new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR",
                         "An Adaptation contains only incompatible codecs.");
        warnings.push(error);
      }
      newImageTracks.push(newAdaptation);
    }

    if (newImageTracks.length > 0 && manifestObject.periods.length > 0) {
      const { adaptations } = manifestObject.periods[0];
      adaptations.image =
        adaptations.image != null ? adaptations.image.concat(newImageTracks) :
                                    newImageTracks;
    }
  }

  /**
   * Add supplementary text Adaptation(s) to the manifest.
   * @param {Object|Array.<Object>} textTracks
   */
  async function _addSupplementaryTextAdaptations(
    /* eslint-disable-next-line import/no-deprecated */
    textTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[]
  ) : Promise<void> {
    const _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
    const newTextAdaptations : IAdaptation[] = [];
    for (const textTrack of _textTracks) {
      const { mimeType,
              codecs,
              url,
              language,
              /* eslint-disable-next-line import/no-deprecated */
              languages,
              closedCaption } = textTrack;
      const langsToMapOn : string[] = language != null ? [language] :
                                      languages != null ? languages :
                                                          [];

      for (const _language of langsToMapOn) {
        const adaptationID = "gen-text-ada-" + generateSupplementaryTrackID();
        const representationID = "gen-text-rep-" + generateSupplementaryTrackID();
        const newAdaptation = await createAdaptationObject({
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

        if (newAdaptation.representations.length > 0 &&
            !newAdaptation.hasSupport)
        {
          const error =
            new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR",
                           "An Adaptation contains only incompatible codecs.");
          warnings.push(error);
        }
        newTextAdaptations.push(newAdaptation);
      }
    }

    if (newTextAdaptations.length > 0 && manifestObject.periods.length > 0) {
      const { adaptations } = manifestObject.periods[0];
      adaptations.text =
        adaptations.text != null ? adaptations.text.concat(newTextAdaptations) :
                                   newTextAdaptations;
    }
  }

  /**
   * @param {Object} newManifest
   * @param {number} type
   */
  function _performUpdate(
    newManifest : IManifest,
    updateType : MANIFEST_UPDATE_TYPE
  ) : void {
    manifestObject.availabilityStartTime = newManifest.availabilityStartTime;
    manifestObject.expired = newManifest.expired;
    manifestObject.isDynamic = newManifest.isDynamic;
    manifestObject.isLive = newManifest.isLive;
    manifestObject.isLastPeriodKnown = newManifest.isLastPeriodKnown;
    manifestObject.lifetime = newManifest.lifetime;
    manifestObject.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
    manifestObject.transport = newManifest.transport;
    manifestObject.publishTime = newManifest.publishTime;

    if (updateType === MANIFEST_UPDATE_TYPE.Full) {
      manifestObject.timeBounds = newManifest.timeBounds;
      manifestObject.uris = newManifest.uris;
      replacePeriods(manifestObject.periods, newManifest.periods);
    } else {
      manifestObject.timeBounds.maximumTimeData = newManifest.timeBounds.maximumTimeData;
      manifestObject.updateUrl = newManifest.uris[0];
      updatePeriods(manifestObject.periods, newManifest.periods);

      // Partial updates do not remove old Periods.
      // This can become a memory problem when playing a content long enough.
      // Let's clean manually Periods behind the minimum possible position.
      const min = manifestObject.getMinimumPosition();
      while (manifestObject.periods.length > 0) {
        const period = manifestObject.periods[0];
        if (period.end === undefined || period.end > min) {
          break;
        }
        manifestObject.periods.shift();
      }
    }

    // Re-set this.adaptations for retro-compatibility in v3.x.x
    /* eslint-disable import/no-deprecated */
    manifestObject.adaptations = manifestObject.periods[0] === undefined ?
                                   {} :
                                   manifestObject.periods[0].adaptations;
    /* eslint-enable import/no-deprecated */

    // Let's trigger events at the end, as those can trigger side-effects.
    // We do not want the current Manifest object to be incomplete when those
    // happen.
    eventEmitter.trigger("manifestUpdate", null);
  }
}

/** Options given to the `Manifest` constructor. */
interface IManifestParsingOptions {
  /* eslint-disable import/no-deprecated */
  /** Text tracks to add manually to the Manifest instance. */
  supplementaryTextTracks? : ISupplementaryTextTrack[] | undefined;
  /** Image tracks to add manually to the Manifest instance. */
  supplementaryImageTracks? : ISupplementaryImageTrack[] | undefined;
  /* eslint-enable import/no-deprecated */
  /** External callback peforming an automatic filtering of wanted Representations. */
  representationFilter? : IRepresentationFilter | undefined;
  /** Optional URL that points to a shorter version of the Manifest used
   * for updates only. When using this URL for refresh, the manifest will be
   * updated with the partial update type. If this URL is undefined, then the
   * manifest will be updated fully when it needs to be refreshed, and it will
   * fetched through the original URL. */
  manifestUpdateUrl? : string | undefined;
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
  manifest : IManifest,
  isDecipherable : (rep : IRepresentation) => boolean | undefined
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
