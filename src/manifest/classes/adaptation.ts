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

import log from "../../log";
import type { IRepresentationMetadata, ITrackMetadata } from "../../manifest";
import type { IParsedTrack } from "../../parsers/manifest";
import type {
  ITrackType,
  IRepresentationFilter,
  IRepresentationFilterRepresentation,
} from "../../public_types";
import arrayFind from "../../utils/array_find";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import normalizeLanguage from "../../utils/languages";
import { objectValues } from "../../utils/object_values";
import type { ICodecSupportList } from "./representation";
import Representation from "./representation";

/**
 * Normalized track structure.
 * A `Track` describes an available media of a particular type in a content.
 * For example a specific audio track (in a given language) or a specific
 * video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Track
 */
export default class Track implements ITrackMetadata {
  /** ID uniquely identifying the track in the Period. */
  public readonly id: string;
  /**
   * `true` if this track was not present in the original Manifest, but was
   * manually added after through the corresponding APIs.
   */
  public manuallyAdded?: boolean;
  /**
   * @see ITrackMetadata
   */
  public readonly representations: Record<string, Representation>;
  /**
   * @see ITrackMetadata
   */
  public readonly trackType: ITrackType;
  /**
   * @see ITrackMetadata
   */
  public inVariantStreams: string[];
  /**
   * @see ITrackMetadata
   */
  public isAudioDescription?: boolean;
  /**
   * @see ITrackMetadata
   */
  public isClosedCaption?: boolean;
  /**
   * @see ITrackMetadata
   */
  public isForcedSubtitles?: boolean;
  /**
   * @see ITrackMetadata
   */
  public isSignInterpreted?: boolean;
  /**
   * @see ITrackMetadata
   */
  public isDub?: boolean;
  /**
   * @see ITrackMetadata
   */
  public language?: string;
  /**
   * @see ITrackMetadata
   */
  public normalizedLanguage?: string;
  /**
   * @see ITrackMetadata
   */
  public isSupported: boolean | undefined;
  /**
   * @see ITrackMetadata
   */
  public isTrickModeTrack?: boolean;
  /**
   * @see ITrackMetadata
   */
  public label?: string;
  /**
   * @see ITrackMetadata
   */
  public readonly trickModeTracks?: Track[];

  /**
   * @constructor
   * @param {Object} parsedTrack
   * @param {Object|undefined} [options]
   */
  constructor(
    parsedTrack: IParsedTrack,
    options: {
      representationFilter?: IRepresentationFilter | undefined;
      isManuallyAdded?: boolean | undefined;
    } = {},
  ) {
    const { trickModeTracks } = parsedTrack;
    const { representationFilter, isManuallyAdded } = options;
    this.id = parsedTrack.id;
    this.trackType = parsedTrack.trackType;

    // XXX TODO
    this.inVariantStreams = [];
    if (parsedTrack.isTrickModeTrack !== undefined) {
      this.isTrickModeTrack = parsedTrack.isTrickModeTrack;
    }

    if (parsedTrack.language !== undefined) {
      this.language = parsedTrack.language;
      this.normalizedLanguage = normalizeLanguage(parsedTrack.language);
    }

    if (parsedTrack.isClosedCaption !== undefined) {
      this.isClosedCaption = parsedTrack.isClosedCaption;
    }
    if (parsedTrack.isAudioDescription !== undefined) {
      this.isAudioDescription = parsedTrack.isAudioDescription;
    }
    if (parsedTrack.isDub !== undefined) {
      this.isDub = parsedTrack.isDub;
    }
    if (parsedTrack.isForcedSubtitles !== undefined) {
      this.isForcedSubtitles = parsedTrack.isForcedSubtitles;
    }
    if (parsedTrack.isSignInterpreted !== undefined) {
      this.isSignInterpreted = parsedTrack.isSignInterpreted;
    }
    if (parsedTrack.label !== undefined) {
      this.label = parsedTrack.label;
    }

    if (trickModeTracks !== undefined && trickModeTracks.length > 0) {
      this.trickModeTracks = trickModeTracks.map((track) => new Track(track));
    }

    const argsRepresentations = parsedTrack.representations;
    const representations: Record<string, Representation> = {};
    let isSupported: boolean | undefined;
    for (let i = 0; i < argsRepresentations.length; i++) {
      const representation = new Representation(argsRepresentations[i], this.trackType);
      let shouldAdd = true;
      if (!isNullOrUndefined(representationFilter)) {
        const reprObject: IRepresentationFilterRepresentation = {
          id: representation.id,
          bitrate: representation.bitrate,
          codecs: representation.codecs,
          height: representation.height,
          width: representation.width,
          frameRate: representation.frameRate,
          hdrInfo: representation.hdrInfo,
        };
        if (representation.contentProtections !== undefined) {
          reprObject.contentProtections = {};
          if (representation.contentProtections.keyIds !== undefined) {
            const keyIds = representation.contentProtections.keyIds.map(
              ({ keyId }) => keyId,
            );
            reprObject.contentProtections.keyIds = keyIds;
          }
        }
        shouldAdd = representationFilter(reprObject, {
          trackType: this.trackType,
          language: this.language,
          normalizedLanguage: this.normalizedLanguage,
          isClosedCaption: this.isClosedCaption,
          isDub: this.isDub,
          isAudioDescription: this.isAudioDescription,
          isSignInterpreted: this.isSignInterpreted,
        });
      }
      if (shouldAdd) {
        representations[representation.id] = representation;
        if (isSupported === undefined) {
          if (representation.isSupported === true) {
            isSupported = true;
          } else if (representation.isSupported === false) {
            isSupported = false;
          }
        }
      } else {
        log.debug(
          "Filtering Representation due to representationFilter",
          this.trackType,
          `track: ${this.id}`,
          `Representation: ${representation.id}`,
          `(${representation.bitrate})`,
        );
      }
    }
    this.representations = representations;

    this.isSupported = isSupported;

    // for manuallyAdded adaptations (not in the manifest)
    this.manuallyAdded = isManuallyAdded === true;
  }

  /**
   * Some environments (e.g. in a WebWorker) may not have the capability to know
   * if a mimetype+codec combination is supported on the current platform.
   *
   * Calling `refreshCodecSupport` manually with a clear list of codecs supported
   * once it has been requested on a compatible environment (e.g. in the main
   * thread) allows to work-around this issue.
   *
   * If the right mimetype+codec combination is found in the provided object,
   * this `Track`'s `isSupported` property will be updated accordingly as
   * well as all of its inner `Representation`'s `isSupported` attributes.
   *
   * @param {Array.<Object>} supportList
   */
  refreshCodecSupport(supportList: ICodecSupportList): void {
    for (const representation of objectValues(this.representations)) {
      if (representation.isSupported === undefined) {
        representation.refreshCodecSupport(supportList);
        if (this.isSupported !== true && representation.isSupported === true) {
          this.isSupported = true;
        } else if (
          this.isSupported === undefined &&
          representation.isSupported === false
        ) {
          this.isSupported = false;
        }
      }
    }
  }

  /**
   * Returns the Representation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getRepresentation(wantedId: number | string): Representation | undefined {
    return arrayFind(objectValues(this.representations), ({ id }) => wantedId === id);
  }

  /**
   * Format the current `Track`'s properties into a
   * `ITrackMetadata` format which can better be communicated through
   * another thread.
   *
   * Please bear in mind however that the returned object will not be updated
   * when the current `Track` instance is updated, it is only a
   * snapshot at the current time.
   *
   * If you want to keep that data up-to-date with the current `Track`
   * instance, you will have to do it yourself.
   *
   * @returns {Object}
   */
  getMetadataSnapshot(): ITrackMetadata {
    const representations: Record<string, IRepresentationMetadata> = {};
    for (const representation of objectValues(this.representations)) {
      representations[representation.id] = representation.getMetadataSnapshot();
    }
    return {
      id: this.id,
      trackType: this.trackType,
      inVariantStreams: this.inVariantStreams,
      isSupported: this.isSupported,
      language: this.language,
      isForcedSubtitles: this.isForcedSubtitles,
      isClosedCaption: this.isClosedCaption,
      isAudioDescription: this.isAudioDescription,
      isSignInterpreted: this.isSignInterpreted,
      normalizedLanguage: this.normalizedLanguage,
      representations,
      label: this.label,
      isDub: this.isDub,
    };
  }
}
