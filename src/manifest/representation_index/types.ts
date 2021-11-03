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

import { ICustomError } from "../../errors";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import { IEMSG } from "../../parsers/containers/isobmff";
import {
  ILocalIndexSegment,
  ILocalManifestInitSegmentLoader,
  ILocalManifestSegmentLoader,
} from "../../parsers/manifest/local";

/**
 * Supplementary information specific to Smooth Initialization segments.
 * Contains every information needed to generate an initialization segment.
 */
export interface ISmoothInitSegmentPrivateInfos {
  /**
   * Timescale the segments are in, in the Manifest.
   * Needed because Smooth segment are created in JS based on timing information
   * as found in the Manifest.
   */
  timescale : number;
  codecPrivateData? : string;
  bitsPerSample? : number;
  channels? : number;
  packetSize? : number;
  samplingRate? : number;
  protection? : { keyId : Uint8Array };
}

/**
 * Supplementary information specific to Smooth media segments (that is, every
 * segments but the initialization segment).
 */
export interface ISmoothSegmentPrivateInfos {
  /**
   * Start time of the segment as announced in the Manifest, in the same
   * timescale than the one indicated through `ISmoothInitSegmentPrivateInfos`.
   */
  time : number;
  /**
   * Duration of the segment as announced in the Manifest, in the same timescale
   * than the one indicated through `ISmoothInitSegmentPrivateInfos`.
   */
  duration : number;
}

/** Describes a given "real" Manifest for MetaPlaylist's segments. */
export interface IBaseContentInfos { manifest: Manifest;
                                     period: Period;
                                     adaptation: Adaptation;
                                     representation: Representation; }

/** Supplementary information needed for segments in the "metaplaylist" transport. */
export interface IMetaPlaylistPrivateInfos {
  /** The original transport protocol (e.g. "dash", "smooth" etc.) */
  transportType : string;
  /** The context this segment is in. */
  baseContent : IBaseContentInfos;
  /** The segment originally created by this transport's RepresentationIndex. */
  originalSegment : ISegment;
  contentStart : number;
  contentEnd? : number;
}

/**
 * Supplementary information needed for initialization segments of the "local"
 * transport.
 */
export interface ILocalManifestInitSegmentPrivateInfos {
  /** Callback used to load that segment. */
  load : ILocalManifestInitSegmentLoader;
}

/** Supplementary information needed for media segments of the "local" transport. */
export interface ILocalManifestSegmentPrivateInfos {
  /** Callback used to load that segment. */
  load : ILocalManifestSegmentLoader;

  /**
   * Exact same segment than the one given in a local manifest.
   * Stored (with at best the same reference than in it) to facilitate the job
   * of retrieving the wanted segment (this task will generally be done by the
   * content downloader tool) when the RxPlayer asks for it.
   */
  segment : ILocalIndexSegment;
}

/**
 * Supplementary information that can be added to any segment depending on the
 * tranport logic used.
 * Called "private" as it won't be read or exploited by any code in the core
 * logic of the player. That information is only here to be retrieved and
 * exploited by the corresponding transport logic.
 */
export interface IPrivateInfos {
  smoothInitSegment? : ISmoothInitSegmentPrivateInfos;
  smoothMediaSegment? : ISmoothSegmentPrivateInfos;
  metaplaylistInfos? : IMetaPlaylistPrivateInfos;
  localManifestInitSegment? : ILocalManifestInitSegmentPrivateInfos;
  localManifestSegment? : ILocalManifestSegmentPrivateInfos;
  isEMSGWhitelisted? : (evt: IEMSG) => boolean;
}

/** Represent a single Segment from a Representation. */
export interface ISegment {
  /** ID of the Segment. Should be unique for this Representation. */
  id : string;
  /**
   * If true, this segment is an initialization segment with no decodable data.
   *
   * Those types of segment contain no decodable data and are only there for
   * initialization purposes, such as giving initial infos to the decoder on
   * subsequent media segments that will be pushed.
   *
   * Note that if `isInit` is false, it only means that the segment contains
   * decodable media, it can also contain important initialization information.
   *
   * Also, a segment which would contain both all initialization data and the
   * decodable data would have `isInit` set to `false` as it is not purely an
   * initialization segment.
   *
   * Segments which are not purely an initialization segments are called "media
   * segments" in the code.
   */
  isInit : boolean;
  /** URLs where this segment is available. From the most to least prioritary. */
  mediaURLs : string[]|null;
  /**
   * If set, the corresponding byte-range in the downloaded segment will
   * contain an index describing other Segments
   * TODO put in privateInfos?
   */
  indexRange? : [number, number];
  /**
   * Optional number of the Segment
   * TODO put in privateInfos?
   */
  number? : number;
  /**
   * Allows to store supplementary information on a segment that can be later
   * exploited by the transport logic.
   */
  privateInfos? : IPrivateInfos;
  /** Optional byte range to retrieve the Segment from its URL(s) */
  range? : [number, number];
  /**
   * Estimated time, in seconds, at which the concerned segment should be
   * offseted when decoded.
   */
  timestampOffset? : number;
  /**
   * Estimated start time for the segment, in seconds.
   * Note that some rounding errors and some differences between what the
   * Manifest says and what the content really is might make that time not
   * exact.
   *
   * `0` for initialization segments.
   */
  time : number;
  /**
   * Estimated end time for the segment, in seconds.
   * Note that some rounding errors and some differences between what the
   * Manifest says and what the content really is might make that time not
   * exact.
   *
   * `0` for initialization segments.
   */
  end : number;
  /**
   * Estimated duration for the segment, in seconds.
   *
   * Note that this may not reflect the exact segment duration:
   *
   *   1. In some very specific cases, segments might be generated and served
   *      progressively. In this case, the full duration of a segment might not
   *      be yet known and thus this property only reflect the currently known
   *      `duration` of the segment, which may be inferior to its final duration.
   *
   *      You can know if we're in that case when the `complete` property of
   *      this same segment is set to `false`.
   *
   *   2. some rounding errors and some differences between what the
   *      Manifest says and what the content really is might make that time not
   *      exact.
   *
   * `0` for initialization segments.
   */
  duration : number;
  /**
   * Always set to 1 for API compatibility with v3.X.X.
   * This was intended for conversion of the `time` and `duration` properties
   * into seconds.
   *
   * As both are always in seconds now, this property became unneeded.
   */
  timescale : 1;

  /**
   * If `false`, this segment's `duration` property may not be the duration of
   * the full segment as it could still be in the process of being generated
   * on the server-side (when this `ISegment` had been constructed).
   *
   * Note that if the `duration` is sure to be the final one, `complete`
   * should be set to `true` even if the segment is still being
   * generated.
   */
  complete : boolean;
}

/** Interface that should be implemented by any Representation's `index` value. */
export interface IRepresentationIndex {
  /**
   * Returns Segment object for the initialization segment, allowing to do the
   * Init Segment request.
   *
   * `null` if there's no initialization segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment|null;

  /**
   * Returns an array of Segments needed for the amount of time given.
   * @param {number} up - The first wanted position, in seconds.
   * @param {number} duration - The amount of time in seconds you want from the
   * starting position given in `up`.
   * @returns {Array.<Object>} - The list of segments corresponding to your
   * wanted range.
   */
  getSegments(up : number, duration : number) : ISegment[];

  /**
   * Returns `true` if, from the given situation, the manifest has to be
   * refreshed.
   * @param {number} up - Beginning time in seconds of the range that is
   * currently wanted.
   * @param {number} to - Ending time in seconds of the range that is
   * currently wanted.
   * @returns {Boolean}
   */
  shouldRefresh(up : number, to : number) : boolean;

  /**
   * Returns the starting time, in seconds, of the earliest segment currently
   * available in this index.
   * Returns `null` if nothing is in the index
   * Returns `undefined` if we cannot know this value.
   * @returns {Number|null}
   */
  getFirstPosition() : number | null | undefined;

  /**
   * Returns the ending time, in seconds, of the last segment currently
   * available in this index.
   * Returns `null` if nothing is in the index
   * Returns `undefined` if we cannot know this value.
   * @returns {Number|null|undefined}
   */
  getLastPosition() : number | null | undefined;

  /**
   * Returns `true` if a Segment returned by this index is still considered
   * available.
   * Returns `false` if it is not available anymore.
   * Returns `undefined` if we cannot know whether it is still available or not.
   * @param {Object} segment
   * @returns {Boolean|undefined}
   */
  isSegmentStillAvailable(segment : ISegment) : boolean | undefined;

  /**
   * Returns true if the `error` given following the request of `segment` can
   * indicate that the index became "de-synchronized" with the server.
   *
   * Reasons for de-synchronizations includes for example Manifest parsing
   * optimizations where a newer version will not be totally parsed. In those
   * conditions, we could be left with doing a segment request for a segment
   * that does not really exists.
   *
   * Note: This API assumes that the user first checked that the segment is
   * still available through `isSegmentStillAvailable`.
   * @param {Error} error
   * @param {Object} segment
   * @returns {Boolean}
   */
  canBeOutOfSyncError(error : ICustomError, segment : ISegment) : boolean;

  /**
   * Checks if the given time - in seconds - is in a discontinuity.
   * That is a "hole" in the stream with no segment defined.
   * If that's the case, return the next available position where a segment
   * should be available.
   * If that's not the case, return `null`.
   * @param {number} time - The time to check if it's in a discontinuity, in
   * seconds.
   * @returns {number | null} - If `null`, no discontinuity is encountered at
   * `time`. If this is a number instead, there is one and that number is the
   * position for which a segment is available in seconds.
   */
  checkDiscontinuity(time : number) : number | null;

  /**
   * Most RepresentationIndex are linked to segments which are generated in
   * chronological order: from an initial position (obtainable with
   * `getFirstPosition`) to the last position of the corresponding Period
   * (obtainable with `getLastPosition`).
   *
   * However, some RepresentationIndex could announce segments in a more random
   * order.
   * Examples of such RepresentationIndex are ones for contents which are being
   * downloaded locally. Here a seek close to the end could schedule the
   * download of the last segments immediately, which might thus be announced
   * in this index before segments in the middle are.
   *
   * Knowing this value serves for example to check if a discontinuity
   * encountered in the content can be skipped over, or if it's possible that
   * this discontinuity is due to a segment not yet being generated.
   *
   * You should return `true` only if there is a chance that segments are not
   * chronologically generated (even if they all have since been generated, this
   * function is only to know if it's possible, not if it's the case now).
   *
   * In other most likely cases, you should return `false`.
   *
   * TODO find a better way with the "local" RepresentationIndex, like
   * explicitely declaring which segments have not been downloaded yet.
   * @returns {boolean}
   */
  areSegmentsChronologicallyGenerated() : boolean;

  /**
   * Returns `true` if the last segments in this index have already been
   * generated so that we can freely go to the next period.
   * Returns `false` if the index is still waiting on future segments to be
   * generated.
   * @returns {boolean}
   */
  isFinished() : boolean;

  /**
   * Returns `true` if this index has all the data it needs to give the list
   * of available segments.
   * Returns `false` if you first should load its initialization segment (or
   * the initialization segment's associated index file) to get the list of
   * available segments.
   *
   * Most index don't rely on the initialization segment to give an index and
   * as such, this method should return `true` directly.
   * However in some index, the segment lists might only be known after the
   * initialization has been loaded. In those case, it should return `false`
   * until the corresponding segment list is known, at which point it can return
   * `true`.
   *
   * You can use any ad-hoc mean you want to "initialize" an index.
   * This is usually done by adding supplementary methods (like one named
   * `initialize`) to that `RepresentationIndex` and calling it directly in the
   * segment parsing code.
   * @returns {boolean}
   */
  isInitialized() : boolean;

  /**
   * Replace the index with another one, such as after a Manifest update.
   * @param {Object} newIndex
   */
  _replace(newIndex : IRepresentationIndex) : void;

  /**
   * Update the current index with a new, partial, version.
   * Unlike `replace`, this method do not completely overwrite the information
   * about this index's segments, it should mainly add new information about new
   * announced segments.
   * @param {Object} newIndex
   */
  _update(newIndex : IRepresentationIndex) : void;
}
