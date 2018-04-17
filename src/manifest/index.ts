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

import arrayFind = require("array-find");
import assert from "../utils/assert";
import generateNewId from "../utils/id";
import { normalize as normalizeLang } from "../utils/languages";
import log from "../utils/log";
import Adaptation, {
  AdaptationType,
} from "./adaptation";
import Period, {
  IPeriodArguments,
} from "./period";
import Representation from "./representation";
import IRepresentationIndex, {
  ISegment,
  StaticRepresentationIndex,
} from "./representation_index";

type ManifestAdaptations = Partial<Record<AdaptationType, Adaptation[]>>;

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
  availabilityStartTime? : number;
  duration : number;
  minimumTime? : number;
  id : string;
  periods : IPeriodArguments[];
  presentationLiveGap? : number;
  suggestedPresentationDelay? : number;
  timeShiftBufferDepth? : number;
  transportType : string;
  type? : string;
  uris : string[];
}

/**
 * Normalized Manifest structure.
 * @class Manifest
 */
export default class Manifest {
  public readonly id : string;
  public readonly transport : string;
  public readonly adaptations : ManifestAdaptations;
  public readonly periods : Period[];
  public readonly isLive : boolean;
  public uris : string[];
  public suggestedPresentationDelay? : number;
  public availabilityStartTime? : number;
  public minimumTime? : number;
  public presentationLiveGap? : number;
  public timeShiftBufferDepth? : number;

  private _duration : number;

  /**
   * @constructor
   * @param {Object} args
   */
  constructor(args : IManifestArguments) {
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.transport = args.transportType || "";

    // TODO Real period management
    this.periods = args.periods.map((period) => {
      return new Period(period);
    });

    /**
     * @deprecated TODO It is here to ensure compatibility with the way the
     * v3.x.x manages adaptations at the Manifest level
     */
    this.adaptations = (this.periods[0] && this.periods[0].adaptations) || [];

    this.minimumTime = args.minimumTime;
    this.isLive = args.type === "dynamic";
    this.uris = args.uris;

    this.suggestedPresentationDelay = args.suggestedPresentationDelay;
    this.availabilityStartTime = args.availabilityStartTime;
    this.presentationLiveGap = args.presentationLiveGap;
    this.timeShiftBufferDepth = args.timeShiftBufferDepth;

    // --------- private data
    this._duration = args.duration;

    if (__DEV__ && this.isLive) {
      assert(this.suggestedPresentationDelay != null);
      assert(this.availabilityStartTime != null);
      assert(this.presentationLiveGap != null);
      assert(this.timeShiftBufferDepth != null);
    }
  }

  /**
   * Add supplementary image Adaptation(s) to the manifest.
   * @param {Object|Array.<Object>} imageTracks
   */
  addSupplementaryImageAdaptations(
    imageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
  ) {
    const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
    const newImageTracks = _imageTracks.map(({ mimeType, url }) => {
      const adaptationID = "gen-image-ada-" + generateNewId();
      const representationID = "gen-image-rep-" + generateNewId();
      return new Adaptation({
        id: adaptationID,
        type: "image",
        manuallyAdded: true,
        representations: [{
          bitrate: 0,
          id: representationID,
          mimeType,
          index: new StaticRepresentationIndex({
            media: url,
            startTime: this.periods[0].start,
            endTime: this.periods[0].end || Number.MAX_VALUE,
          }),
        }],
      });
    });

    if (newImageTracks.length) {
      this.adaptations.image = this.adaptations.image ?
        this.adaptations.image.concat(newImageTracks) : newImageTracks;
    }
  }

  /**
   * Add supplementary text Adaptation(s) to the manifest.
   * @param {Object|Array.<Object>} textTracks
   */
  addSupplementaryTextAdaptations(
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
        return new Adaptation({
          id: adaptationID,
          type: "text",
          language: _language,
          normalizedLanguage: normalizeLang(_language),
          closedCaption,
          manuallyAdded: true,
          representations: [{
            bitrate: 0,
            id: representationID,
            mimeType,
            codecs,
            index: new StaticRepresentationIndex({
              media: url,
              startTime: this.periods[0].start,
              endTime: this.periods[0].end || Number.MAX_VALUE,
            }),
          }],
        });
      }));
    }, []);

    if (newTextAdaptations.length) {
      this.adaptations.text = this.adaptations.text ?
        this.adaptations.text.concat(newTextAdaptations) : newTextAdaptations;
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
   * @returns {Number}
   */
  getDuration() : number {
    return this._duration;
  }

  /**
   * @returns {string|undefined}
   */
  getUrl() : string|undefined {
    return this.uris[0];
  }

  /**
   * TODO log deprecation
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptations() : Adaptation[] {
    const firstPeriod = this.periods[0];
    if (!firstPeriod) {
      return [];
    }
    const adaptationsByType = firstPeriod.adaptations;
    const adaptationsList : Adaptation[] = [];
    for (const adaptationType in adaptationsByType) {
      if (adaptationsByType.hasOwnProperty(adaptationType)) {
        const adaptations =
          adaptationsByType[adaptationType as AdaptationType] as Adaptation[];
        adaptationsList.push(...adaptations);
      }
    }
    return adaptationsList;
  }

  /**
   * TODO log deprecation
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType : AdaptationType) : Adaptation[] {
    const firstPeriod = this.periods[0];
    if (!firstPeriod) {
      return [];
    }
    return firstPeriod.adaptations[adaptationType] || [];
  }

  /**
   * TODO log deprecation
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptation(wantedId : number|string) : Adaptation|undefined {
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
  update(newManifest : Manifest) {
    this._duration = newManifest.getDuration();
    this.timeShiftBufferDepth = newManifest.timeShiftBufferDepth;
    this.availabilityStartTime = newManifest.availabilityStartTime;
    this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
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
              const newRepresentation =
                arrayFind(newRepresentations, r => r.id === oldRepresentation.id);

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
  }
}

export {
  // classes
  Period,
  Adaptation,
  Representation,

  // types
  IManifestArguments,
  IRepresentationIndex,
  ISegment,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
};
