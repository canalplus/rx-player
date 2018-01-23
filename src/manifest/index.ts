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

import Adaptation, {
  AdaptationType,
  IAdaptationArguments,
} from "./adaptation";

type ManifestAdaptations = Partial<Record<AdaptationType, Adaptation[]>>;

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

  private _presentationTimelineDuration: number;
  private _duration: number;

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
    this.updatePresentationTimelineDuration();

    if (__DEV__ && this.isLive) {
      assert(this.suggestedPresentationDelay != null);
      assert(this.availabilityStartTime != null);
      assert(this.presentationLiveGap != null);
      assert(this.timeShiftBufferDepth != null);
    }
  }

  /**
   * @returns {Number}
   */
  getDuration() : number {
    return this._duration;
  }

  /**
   * Update presentation timeline duration
   */
  updatePresentationTimelineDuration() {
    const minimumAdaptationsDuration: IDictionary<number> = {};

    // Browse adaptations to find minimum duration
    ["audio","video"].forEach((type) => {
      const adaptations = (this.adaptations as any)[type];
      if (adaptations) {
        adaptations.forEach((adaptation: Adaptation) => {
          const representations = adaptation.representations;
          representations.forEach((representation) => {
            const lastPosition = representation.index.getLastPosition();
            if(lastPosition && minimumAdaptationsDuration[type] == null) {
              minimumAdaptationsDuration[type] = lastPosition;
            } else if(lastPosition && minimumAdaptationsDuration[type] !== lastPosition) {
              throw new Error(
                "Unauthorized manifest. Representations should have the same duration."
              );
            }
          });
        });
      }
    });

    this._presentationTimelineDuration = Math.min(
      this._duration,
      minimumAdaptationsDuration.video || Infinity,
      minimumAdaptationsDuration.audio|| Infinity
    );
  }

  /**
   * Get current presentation timeline duration.
   * @returns {number}
   */
  getPresentationTimelineDuration(): number {
    return this._presentationTimelineDuration;
  }

  getUrl(): string {
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
