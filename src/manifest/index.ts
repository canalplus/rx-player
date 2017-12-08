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

type ManifestAdaptations = Partial<Record<AdaptationType, Adaptation[]>>;

export interface ISupplementaryImageTrack {
  mimeType : string;
  url : string;
}

export interface ISupplementaryTextTrack {
  mimeType : string;
  codecs? : string;
  url : string;
  language? : string;
  languages? : string[];
  closedCaption : boolean;
}

export interface IManifestArguments {
  availabilityStartTime? : number;
  duration : number;
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
class Manifest {
  public id : string;
  public transport : string;
  public adaptations : ManifestAdaptations;
  public periods : Period[];
  public isLive : boolean;
  public uris : string[];
  public suggestedPresentationDelay? : number;
  public availabilityStartTime? : number;
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
    this.adaptations = this.periods[0].adaptations;

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
      return new Adaptation({
        id: "gen-image-ada-" + generateNewId(),
        type: "image", // TODO enum
        manuallyAdded: true,
        representations: [{
          baseURL: url,
          bitrate: 0,
          id: "gen-image-rep-" + generateNewId(),
          mimeType,
          index: {
            indexType: "template", // TODO Rename "manual"?
            duration: Number.MAX_VALUE,
            timescale: 1,
            startNumber: 0,
          },
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
        return new Adaptation({
          id: "gen-text-ada-" + generateNewId(),
          type: "text", // TODO enum
          language: _language,
          normalizedLanguage: normalizeLang(_language),
          closedCaption,
          manuallyAdded: true,
          representations: [{
            baseURL: url,
            bitrate: 0,
            id: "gen-text-rep-" + generateNewId(),
            mimeType,
            codecs,
            index: {
              indexType: "template", // TODO Rename "manual"?
              duration: Number.MAX_VALUE,
              timescale: 1,
              startNumber: 0,
            },
          }],
        });
      }));
    }, []);

    if (newTextAdaptations.length) {
      this.adaptations.text = this.adaptations.text ?
        this.adaptations.text.concat(newTextAdaptations) : newTextAdaptations;
    }
  }

  getPeriodForTime(time : number) : Period|undefined {
    return this.periods.find(period => {
      if (period.start == null || period.duration == null) {
        return false;
      }
      return period.start >= time &&
        (period.start + period.duration) < time;
    });
  }

  /**
   * @returns {Number}
   */
  getDuration() : number {
    return this._duration;
  }

  getUrl() : string|undefined {
    return this.uris[0];
  }

  /**
   * @returns {Array.<Object>}
   */
  getAdaptations() : Adaptation[] {
    const adaptationsByType = this.adaptations;
    if (!adaptationsByType) {
      return [];
    }

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

  getAdaptationsForType(adaptationType : AdaptationType) : Adaptation[] {
    const adaptations = this.adaptations[adaptationType];
    return adaptations || [];
  }

  getAdaptation(wantedId : number|string) : Adaptation|undefined {
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
  }

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
   * @deprecated TODO It is here to ensure compatibility with the way the
   * v3.x.x manages adaptations at the Manifest level
   * @param {number} wantedId
   */
  _switchPeriod(period : Period) : void {
    this.adaptations = period.adaptations;
  }

  /**
   * Update the current manifest properties
   * XXX TODO Also update attributes?
   * @param {Object} Manifest
   */
  update(newManifest : Manifest) {
    const oldPeriods = this.periods;
    const newPeriods = newManifest.periods;

    for (let periodIndex = 0; periodIndex < oldPeriods.length; periodIndex++) {
      const oldAdaptations = oldPeriods[periodIndex].getAdaptations();
      const newAdaptations = newPeriods[periodIndex].getAdaptations();

      for (let i = 0; i < oldAdaptations.length; i++) {
        const newAdaptation =
          arrayFind(newAdaptations, a => a.id === oldAdaptations[i].id);

        if (!newAdaptation) {
          log.warn(
            `manifest: adaptation "${oldAdaptations[i].id}" not found when merging.`
          );
        } else {
          const oldRepresentations = oldAdaptations[i].representations;
          const newRepresentations = newAdaptation.representations;
          for (let j = 0; j < oldRepresentations.length; j++) {
            const newRepresentation =
              arrayFind(newRepresentations, r => r.id === oldRepresentations[j].id);

            if (!newRepresentation) {
              /* tslint:disable:max-line-length */
              log.warn(
                `manifest: representation "${oldRepresentations[j].id}" not found when merging.`
              );
              /* tslint:enable:max-line-length */
            } else {
              oldRepresentations[j].index.update(newRepresentation.index);
            }
          }
        }
      }
    }
  }
}

export default Manifest;
