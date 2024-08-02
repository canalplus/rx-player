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
import { MediaError } from "../../errors";
import type { IManifestStreamEvent, IParsedPeriod } from "../../parsers/manifest";
import type { ITrackType, IRepresentationFilter } from "../../public_types";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { objectValues } from "../../utils/object_values";
import type { IPeriodMetadata, ITrackMetadata } from "../types";
import { getTrackList, getTrackListForType, periodContainsTime } from "../utils";
import Track from "./adaptation";
import type { ICodecSupportList } from "./representation";

/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
export default class Period implements IPeriodMetadata {
  /** ID uniquely identifying the Period in the Manifest. */
  public readonly id: string;

  /** Absolute start time of the Period, in seconds. */
  public start: number;

  /**
   * Duration of this Period, in seconds.
   * `undefined` for still-running Periods.
   */
  public duration: number | undefined;

  /**
   * Absolute end time of the Period, in seconds.
   * `undefined` for still-running Periods.
   */
  public end: number | undefined;

  /** Array containing every stream event happening on the period */
  public streamEvents: IManifestStreamEvent[];

  public variantStreams: Array<{
    id: string;
    bandwidth: number | undefined;
    media: Record<
      ITrackType,
      Array<{
        id: string;
        /**
         * Id of the "track" to which that audio media is a part of.
         *
         * A given audio "track" might for example provide an audio media to various
         * variant streams.
         */
        linkedTrack: string;
        /**
         * Different `Representations` (e.g. qualities) this media is available
         * in.
         */
        representations: string[];
      }>
    >;
  }>;

  public tracksMetadata: Record<ITrackType, Record<string, Track>>;

  /**
   * @constructor
   * @param {Object} args
   * @param {Array.<Object>} unsupportedTracks - Array on which
   * `track`s objects which have no supported `Representation` will be
   * pushed.
   * This array might be useful for minor error reporting.
   * @param {function|undefined} [representationFilter]
   */
  constructor(
    args: IParsedPeriod,
    unsupportedTracks: ITrackMetadata[],
    representationFilter?: IRepresentationFilter | undefined,
  ) {
    this.id = args.id;

    this.variantStreams = [];
    this.tracksMetadata = {
      audio: {},
      video: {},
      text: {},
    };

    this.duration = args.duration;
    this.start = args.start;

    if (!isNullOrUndefined(this.duration) && !isNullOrUndefined(this.start)) {
      this.end = this.start + this.duration;
    }
    this.streamEvents = args.streamEvents === undefined ? [] : args.streamEvents;

    this.variantStreams = args.variantStreams;
    this.tracksMetadata = {
      audio: {},
      video: {},
      text: {},
    };
    for (const tType of ["audio", "video", "text"] as const) {
      const tracks: Record<string, Track> = {};
      let hasSupportedTrack = false;
      for (const trackMetadata of args.tracksMetadata[tType]) {
        const newTrack = new Track(trackMetadata, {
          representationFilter,
        });
        const representationsNb = objectValues(newTrack.representations).length;
        if (representationsNb > 0 && newTrack.isSupported === false) {
          unsupportedTracks.push(newTrack);
        }

        if (representationsNb > 0) {
          tracks[newTrack.id] = newTrack;
          if (newTrack.isSupported !== false) {
            hasSupportedTrack = true;
          }
        }
      }

      if (
        !hasSupportedTrack &&
        args.tracksMetadata[tType].length > 0 &&
        (tType === "video" || tType === "audio")
      ) {
        throw new MediaError(
          "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
          "No supported " + tType + " adaptations",
          { tracks: undefined },
        );
      }

      this.tracksMetadata[tType] = tracks;
    }
    if (
      objectValues(this.tracksMetadata.video).length === 0 &&
      objectValues(this.tracksMetadata.audio).length === 0
    ) {
      throw new MediaError(
        "MANIFEST_PARSE_ERROR",
        "No supported audio and video tracks.",
      );
    }
  }

  /**
   * Some environments (e.g. in a WebWorker) may not have the capability to know
   * if a mimetype+codec combination is supported on the current platform.
   *
   * Calling `refreshCodecSupport` manually with a clear list of codecs supported
   * once it has been requested on a compatible environment (e.g. in the main
   * thread) allows to work-around this issue.
   *
   * @param {Array.<Object>} supportList
   * @param {Array.<Object>} unsupportedTracks - Array on which track objects which
   * are now known to have no supported
   * `Representation` will be pushed.
   * This array might be useful for minor error reporting.
   */
  refreshCodecSupport(
    supportList: ICodecSupportList,
    unsupportedTracks: ITrackMetadata[],
  ) {
    (Object.keys(this.tracksMetadata) as ITrackType[]).forEach((ttype) => {
      const tracksForType = getTrackListForType(this, ttype);
      if (tracksForType === undefined) {
        return;
      }
      let hasSupportedTracks: boolean | undefined = false;
      for (const track of tracksForType) {
        const wasSupported = track.isSupported;
        track.refreshCodecSupport(supportList);
        if (wasSupported !== false && track.isSupported === false) {
          unsupportedTracks.push(track);
        }
        if (hasSupportedTracks === false) {
          hasSupportedTracks = track.isSupported;
        } else if (hasSupportedTracks === undefined && track.isSupported === true) {
          hasSupportedTracks = true;
        }
      }
      if ((ttype === "video" || ttype === "audio") && hasSupportedTracks === false) {
        throw new MediaError(
          "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
          "No supported " + ttype + " tracks",
          { tracks: undefined },
        );
      }
    }, {});
  }

  /**
   * Returns a track associated with this Period by giving its id.
   * Returns `null` if the track is not found.
   * @param {string} id
   * @returns {Object|null}
   */
  getTrack(id: string): Track | null {
    return (
      this.tracksMetadata.audio[id] ??
      this.tracksMetadata.video[id] ??
      this.tracksMetadata.text[id] ??
      null
    );
  }

  /**
   * Returns every tracks linked to that Period, in an
   * Array.
   * @returns {Array.<Object>}
   */
  getTrackList(): Track[] {
    return getTrackList(this);
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period for a
   * given type.
   * @param {string} trackType
   * @returns {Array.<Object>}
   */
  getTrackListForType(trackType: ITrackType): Track[] {
    return getTrackListForType(this, trackType);
  }

  // /**
  //  * Returns Adaptations that contain Representations in supported codecs.
  //  * @param {string|undefined} type - If set filter on a specific Adaptation's
  //  * type. Will return for all types if `undefined`.
  //  * @returns {Array.<Adaptation>}
  //  */
  // getSupportedAdaptations(type?: ITrackType | undefined): Adaptation[] {
  //   return getSupportedAdaptations(this, type);
  // }

  /**
   * Returns true if the give time is in the time boundaries of this `Period`.
   * @param {number} time
   * @param {object|null} nextPeriod - Period coming chronologically just
   * after in the same Manifest. `null` if this instance is the last `Period`.
   * @returns {boolean}
   */
  containsTime(time: number, nextPeriod: Period | null): boolean {
    return periodContainsTime(this, time, nextPeriod);
  }

  /**
   * Format the current `Period`'s properties into a
   * `IPeriodMetadata` format which can better be communicated through
   * another thread.
   *
   * Please bear in mind however that the returned object will not be updated
   * when the current `Period` instance is updated, it is only a
   * snapshot at the current time.
   *
   * If you want to keep that data up-to-date with the current `Period`
   * instance, you will have to do it yourself.
   *
   * @returns {Object}
   */
  public getMetadataSnapshot(): IPeriodMetadata {
    return {
      start: this.start,
      end: this.end,
      id: this.id,
      duration: this.duration,
      streamEvents: this.streamEvents,
      variantStreams: this.variantStreams,
      tracksMetadata: this.tracksMetadata,
    };
  }
}
