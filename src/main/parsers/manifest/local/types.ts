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

/**
 * Callback allowing to retrieve an initialization segment. Each
 * `ILocalManifestInitSegmentLoader` will be associated to a single
 * `ILocalRepresentation`, so to only one possible initialization segment
 * (or to the absence of one).
 *
 * It will be called when the RxPlayer wants to download the corresponding
 * `ILocalRepresentation`'s initialization segment.
 * When called, it will have a single argument containing two properties:
 *   - `resolve`: function to call when the data has been loaded, with the
 *                data itself.
 *                If the corresponding `ILocalRepresentation` has no
 *                initialization segment, this data can be set to `null`.
 *   - `reject`: function to call when an error happened which made the
 *               retrieval of the data impossible. The error should be given
 *               to this function.
 *
 * Optionally, this callack can return a function. This function will be called
 * in the case where the RxPlayer wants to cancel this request.
 * You can thus abort every steps taken to retrieve the segment in that callback.
 * Calls to `resolve` and to `reject` won't be considered after the returned
 * callback is called.
 */
export type ILocalManifestInitSegmentLoader = (
  callbacks : { resolve : (args: { data : ArrayBuffer | null }) => void;

                reject : (err? : Error) => void; }
) => (() => void) | void;

/**
 * Callback allowing to retrieve a media segment. Each `ILocalManifestSegmentLoader`
 * will be associated to a single `ILocalRepresentation`.
 *
 * It will be called when the RxPlayer wants to download a specific media
 * segment for that `ILocalRepresentation` with two arguments.
 *
 * The first of those arguments is the segment the player wants to fetch.
 * This coresponds to the same object than the one defined in the corresponding
 * `ILocalIndex`.
 *
 * The second argument is an object containing two callbacks, that you can call
 * either when the segment has been loaded or when an error happened while doing
 * so:
 *   - `resolve`: function to call when the data has been loaded, with the
 *                data itself.
 *   - `reject`: function to call when an error happened which made the
 *               retrieval of the data impossible. The error should be given
 *               to this function.
 *
 * Optionally, this callack can return a function. This function will be called
 * in the case where the RxPlayer wants to cancel this request.
 * You can thus abort every steps taken to retrieve the segment in that callback.
 * Calls to `resolve` and to `reject` won't be considered after the returned
 * callback is called.
 */
export type ILocalManifestSegmentLoader = (
  segment : ILocalIndexSegment, // Same than the segment from `segments`
  callbacks : { resolve : (args: { data : ArrayBuffer }) => void;

                reject : (err? : Error) => void; }
) => (() => void) | void;

/**
 * DRM information describing a "keyId" identifying a key with which a given
 * `ILocalRepresentation` is encrypted.
 */
export interface IContentProtectionKID {
  /** The corresponding "keyId", encoded as an array of bytes. */
  keyId : Uint8Array;
  /**
   * Optional "systemId" (identifying a given key system) to which the keyId
   * apply.
   * This systemId should be defined as an hexadecimal string, with optional
   * dashes in between. An example of possible systemId can be found here:
   * https://dashif.org/identifiers/content_protection/
   */
  systemId?: string;
}

/**
 * DRM information describing initialization data necessary to initialize a
 * given CDM's instance.
 * For the moment, this is limited to PSSH information.
 */
export interface IContentProtectionInitData {
  /**
   * The initialization data itself. For data coming from a pssh ISOBMFF box,
   * this includes the size and name of the box.
   */
  data : Uint8Array;
  /**
   * Id defining what key system the initialization data applies to.
   *
   * This systemId should be defined as an hexadecimal string, with optional
   * dashes in between. An example of possible systemId can be found here:
   * https://dashif.org/identifiers/content_protection/
   */
  systemId : string;
}

/**
 * Object describing DRM information for a given `ILocalRepresentation`.
 * Note that any information here is optional. A content can be encrypted
 * without these being properly defined.
 * Those information are only used for supplementary features and optimizations
 * in the RxPlayer.
 */
export interface IContentProtections {
  /** All "keyId" that applies to the `ILocalRepresentation`. */
  keyIds : IContentProtectionKID[];
  /**
   * DRM information describing initialization data necessary to initialize a
   * given CDM's instance.
   * This is an Object grouping such initialization data by "types" of data.
   * Examples of possible initialization data type can be found here:
   * https://www.w3.org/TR/eme-initdata-registry/
   */
  initData : Partial<Record<string, IContentProtectionInitData[]>>;
}

/** Object defining a single available media segment in a `ILocalIndex`. */
export interface ILocalIndexSegment {
  /** Earliest presentation time available for this segment, in seconds. */
  time : number;
  /**
   * Time difference between the maximum available presentation time in this
   * segment and the first (defined by `time`), in seconds.
   */
  duration : number;
  /**
   * If set, this is the amount of time in seconds we have to add to the
   * segment once loaded so it can be decoded at the time indicated by the
   * `time` property.
   */
  timestampOffset? : number;
}

/** "Index" of a `ILocalRepresentation`. Allow to declare available segments. */
export interface ILocalIndex {
  /** Callback used to retrieve the initialization segment of a `ILocalRepresentation`. */
  loadInitSegment : ILocalManifestInitSegmentLoader;
  /** Callback used to retrieve a media segment of a `ILocalRepresentation`. */
  loadSegment : ILocalManifestSegmentLoader;
  /**
   * List of available media segments, in chronological order.
   * Doesn't include the initialization segment.
   */
  segments : ILocalIndexSegment[];
}

/** A quality for a given "local" Manifest track (`ILocalAdaptation`). */
export interface ILocalRepresentation {
  /** Maximum number of bytes per second for the segments contained in this quality. */
  bitrate : number;
  /** DRM information. */
  contentProtections? : IContentProtections;
  /** Mime-type of the corresponding quality's segment. */
  mimeType : string;
  /** Codec(s) necessary to decode this quality's segment. */
  codecs : string;
  /**
   * Width in pixels for this quality.
   * This should only be set if the corresponding "track" contains video.
   */
  width? : number;
  /**
   * Height in pixels for this quality.
   * This should only be set if the corresponding "track" contains video.
   */
  height? : number;
  /** Interface allowing to retrieve media segments for this quality. */
  index : ILocalIndex;
}

/** A "track"" of a "local" Manifest. */
export interface ILocalAdaptation {
  /** The "type" of that track ("text" == subtitles, closed captions...). */
  type : "audio" | "video" | "text";
  /**
   * If `true`, this track contains an audio description of what is happening
   * visually on the screen.
   */
  audioDescription? : boolean;
  /** If `true`, this track contains closed captions. */
  closedCaption? : boolean;
  /** The ISO 639-3, ISO 639-2 or ISO 639-1 language code for that track. */
  language? : string;
  /** The different qualities this track is available in. */
  representations: ILocalRepresentation[];
}

/** Sub-part of a "local" Manifest, with specific tracks and qualities.  */
export interface ILocalPeriod {
  /** Start time at which the Period begins, in seconds. */
  start: number;
  /** End time at which the Period ends, in seconds. */
  end: number;
  /** The different "tracks" available for this Period. */
  adaptations: ILocalAdaptation[];
}

/**
 * Format of a "local" Manifest, which allows to play locally-stored contents.
 *
 * Special properties also allow to play content that are still being
 * downloaded.
 */
export interface ILocalManifest {
  /** Required. Confirms that the current object is a "local" Manifest */
  type : "local";
  /**
   * Version of the object, under a `MAJOR.MINOR` format.
   * MAJOR: A parser compatible to a different major version should not try to
   *        parse it
   * MINOR: Retro-compatible format change.
   *
   * The exception is the `0` MAJOR version (i.e. experimental versions).
   * A parser for a version in that major (let's say `0.1`) might be unable to
   * parse local Manifests of another version (e.g. `0.2`).
   *
   * There are two versions defined for now and we are compatible to both:
   *
   *   - "0.1": initial version
   *
   *   - "0.2": `minimumPosition` and `maximumPosition` are now defined.
   *            `duration` has been removed.
   *
   *            `start` and `duration` from a ILocalPeriod and `time` and
   *            `duration` from a `ILocalIndexSegment` are now in seconds
   *            instead of milliseconds.
   */
  version : string;
  /**
   * Minimum position reachable in this content once fully downloaded, in
   * seconds.
   *
   * Set to `0` by default.
   */
  minimumPosition? : number;
  /**
   * Maximum position reachable in this content once fully downloaded, in
   * seconds.
   */
  maximumPosition : number;
  /**
   * Optional Promise used to trigger a Manifest refresh.
   *
   * When this Promise resolves, it means that the Local Manifest needs to be
   * updated.
   */
  expired? : Promise<void>;
  /** Sub-parts of the content, each with specific tracks and qualities.  */
  periods : ILocalPeriod[];
  /**
   * Whether the "local" Manifest generation is finished.
   * `true` if it is already fully-loaded.
   * `false` if it is still being downloaded.
   */
  isFinished : boolean;
}
