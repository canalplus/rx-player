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

import Adaptation, {
  AdaptationType,
  IAdaptationArguments,
} from "./adaptation";

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
  id : number|string;
  transportType : string;
  duration : number;
  adaptations : Partial<Record<AdaptationType, IAdaptationArguments[]>>;
  type? : string;
  locations : string[];
  suggestedPresentationDelay? : number;
  availabilityStartTime? : number;
  presentationLiveGap? : number;
  timeShiftBufferDepth? : number;
}

/**
 * Normalized Manifest structure.
 *
 * API Public Properties:
 *   - id {string|Number}
 *   - adaptations {Object}:
 *       adaptations.video {[]Adaptation|undefined}
 *       adaptations.audio {[]Adaptation|undefined}
 *       adaptations.text {[]Adaptation|undefined}
 *       adaptations.image {[]Adaptation|undefined}
 *   - periods {[]Object} TODO
 *   - isLive {Boolean}
 *   - uris {[]string}
 *   - transport {string}
 *
 * API Public Methods:
 *   - getDuration () => {Number} - Returns duration of the entire content, in s
 */
class Manifest {
  public id : string|number;
  public transport : string;
  public adaptations : ManifestAdaptations;
  public periods : Array<{ adaptations : ManifestAdaptations }>;
  public isLive : boolean;
  public uris : string[];
  public suggestedPresentationDelay? : number;
  public availabilityStartTime? : number;
  public presentationLiveGap? : number;
  public timeShiftBufferDepth? : number;

  private _duration : number;

  /**
   * @constructor
   * @param {Object} [args={}]
   * @param {string|Number} [args.id]
   * @param {string} args.transportType
   * @param {Array.<Object>} args.adaptations
   * @param {string} args.type
   * @param {Array.<string>} args.locations
   * @param {Number} args.duration
   */
  constructor(args : IManifestArguments) {
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.transport = args.transportType || "";
    this.adaptations =
      (Object.keys(args.adaptations) as AdaptationType[]).reduce<ManifestAdaptations>((
        acc : ManifestAdaptations,
        val : AdaptationType
      ) => {
        acc[val] = (args.adaptations[val] || [])
          .map((a) => new Adaptation(a));
        return acc;
      }, {}) || [];

    // TODO Real period management
    this.periods = [
      {
        adaptations: this.adaptations,
      },
    ];

    this.isLive = args.type === "dynamic";
    this.uris = args.locations || [];

    // --------- private data
    this._duration = args.duration;

    // Will be needed here
    this.suggestedPresentationDelay = args.suggestedPresentationDelay;
    this.availabilityStartTime = args.availabilityStartTime;
    this.presentationLiveGap = args.presentationLiveGap;
    this.timeShiftBufferDepth = args.timeShiftBufferDepth;

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
          bitrate: 0, // TODO remove bitrate when moved to Manifest
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
      // sort representations by bitrates
      // XXX TODO Do it in Adaptation instead
      newImageTracks.map((adaptation) => {
        adaptation.representations = adaptation.representations.sort((a, b) =>
          a.bitrate - b.bitrate // bitrate ascending
        );
      });

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
            bitrate: 0, // TODO remove bitrate when moved to Manifest
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
      // sort representations by bitrates
      // XXX TODO Do it in Adaptation instead
      newTextAdaptations.map((adaptation) => {
        adaptation.representations = adaptation.representations.sort((a, b) =>
          a.bitrate - b.bitrate // bitrate ascending
        );
      });

      this.adaptations.text = this.adaptations.text ?
        this.adaptations.text.concat(newTextAdaptations) : newTextAdaptations;
    }
  }

  /**
   * @returns {Number}
   */
  getDuration() : number {
    return this._duration;
  }

  getUrl() : string {
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
}

export default Manifest;
