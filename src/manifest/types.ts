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

import {
  type IContentProtection,
  type IInitializationDataInfo,
} from "../core/eme";
import {
  type IContentProtections,
  type IManifestStreamEvent,
} from "../parsers/manifest";
import { type IEventEmitter } from "../utils/event_emitter";
import { type IRepresentationIndex } from "./representation_index";

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
 */
export interface IManifest extends IEventEmitter<IManifestEvents> {
  /**
   * ID uniquely identifying this Manifest.
   * No two Manifests should have this ID.
   * This ID is automatically calculated each time a `Manifest` instance is
   * created.
   */
  id : string;
  /**
   * Type of transport used by this Manifest (e.g. `"dash"` or `"smooth"`).
   *
   * TODO This should never be needed as this structure is transport-agnostic.
   * But it is specified in the Manifest API. Deprecate?
   */
  transport : string;
  /**
   * List every Period in that Manifest chronologically (from start to end).
   * A Period contains information about the content available for a specific
   * period of time.
   */
  periods : IPeriod[];
  /**
   * When that promise resolves, the whole Manifest needs to be requested again
   * so it can be refreshed.
   */
  expired : Promise<void> | null;
  /**
   * Deprecated. Equivalent to `manifest.periods[0].adaptations`.
   * It is here to ensure compatibility with the way the v3.x.x manages
   * adaptations at the Manifest level
   * @deprecated
   */
  adaptations : IManifestAdaptations;
  /**
   * If true, the Manifest can evolve over time:
   * New segments can become available in the future, properties of the manifest
   * can change...
   */
  isDynamic : boolean;
  /**
   * If true, this Manifest describes a live content.
   * A live content is a specific kind of content where you want to play very
   * close to the maximum position (here called the "live edge").
   * E.g., a TV channel is a live content.
   */
  isLive : boolean;
  /**
   * If `true`, no more periods will be added after the current last manifest's
   * Period.
   * `false` if we know that more Period is coming or if we don't know.
   */
  isLastPeriodKnown : boolean;
  /*
   * Every URI linking to that Manifest.
   * They can be used for refreshing the Manifest.
   * Listed from the most important to the least important.
   */
  uris : string[];
  /** Optional URL that points to a shorter version of the Manifest used
   * for updates only. */
  updateUrl : string | undefined;
  /**
   * Suggested delay from the "live edge" (i.e. the position corresponding to
   * the current broadcast for a live content) the content is suggested to start
   * from.
   * This only applies to live contents.
   */
  suggestedPresentationDelay : number | undefined;
  /**
   * Amount of time, in seconds, this Manifest is valid from the time when it
   * has been fetched.
   * If no lifetime is set, this Manifest does not become invalid after an
   * amount of time.
   */
  lifetime : number | undefined;
  /**
   * Minimum time, in seconds, at which a segment defined in the Manifest
   * can begin.
   * This is also used as an offset for live content to apply to a segment's
   * time.
   */
  availabilityStartTime : number | undefined;
  /**
   * It specifies the wall-clock time when the manifest was generated and published
   * at the origin server. It is present in order to identify different versions
   * of manifest instances.
   */
  publishTime: number | undefined;
  /*
   * Difference between the server's clock in milliseconds and the return of the
   * JS function `performance.now`.
   * This property allows to calculate the server time at any moment.
   * `undefined` if we did not obtain the server's time
   */
  clockOffset : number | undefined;
  /**
   * Data allowing to calculate the minimum and maximum seekable positions at
   * any given time.
   * Instead of using it directly, you might prefer using the
   * `getMinimumPosition` and `getMaximumPosition` methods instead.
   */
  timeBounds : {
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
    absoluteMinimumTime? : number | undefined;
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
   * Returns the Period corresponding to the given `id`.
   * Returns `undefined` if there is none.
   * @param {string} id
   * @returns {Object|undefined}
   */
  getPeriod(id : string) : IPeriod | undefined;
  /**
   * Returns the Period encountered at the given time.
   * Returns `undefined` if there is no Period exactly at the given time.
   * @param {number} time
   * @returns {Object|undefined}
   */
  getPeriodForTime(time : number) : IPeriod | undefined;
  /**
   * Returns the first Period starting strictly after the given time.
   * Returns `undefined` if there is no Period starting after that time.
   * @param {number} time
   * @returns {Object|undefined}
   */
  getNextPeriod(time : number) : IPeriod | undefined;
  /**
   * Returns the Period coming chronologically just after another given Period.
   * Returns `undefined` if not found.
   * @param {Object} period
   * @returns {Object|null}
   */
  getPeriodAfter(period : IPeriod) : IPeriod | null;
  /**
   * Returns the most important URL from which the Manifest can be refreshed.
   * `undefined` if no URL is found.
   * @returns {string|undefined}
   */
  getUrl() : string|undefined;
  /**
   * Update the current Manifest properties by giving a new updated version.
   * This instance will be updated with the new information coming from it.
   * @param {Object} newManifest
   */
  replace(newManifest : IManifest) : void;
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
  update(newManifest : IManifest) : void;
  /**
   * Get the minimum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  getMinimumPosition() : number;
  /**
   * Get the maximum position currently defined by the Manifest, in seconds.
   * @returns {number}
   */
  getMaximumPosition() : number;
  /**
   * Look in the Manifest for Representations linked to the given key ID,
   * and mark them as being impossible to decrypt.
   * Then trigger a "decipherabilityUpdate" event to notify everyone of the
   * changes performed.
   * @param {Object} keyUpdates
   */
  updateDeciperabilitiesBasedOnKeyIds(
    { whitelistedKeyIds,
      blacklistedKeyIDs } : { whitelistedKeyIds : Uint8Array[];
                              blacklistedKeyIDs : Uint8Array[]; }
  ) : void;
  /**
   * Look in the Manifest for Representations linked to the given content
   * protection initialization data and mark them as being impossible to
   * decrypt.
   * Then trigger a "decipherabilityUpdate" event to notify everyone of the
   * changes performed.
   * @param {Object} initData
   */
  addUndecipherableProtectionData(initData : IInitializationDataInfo) : void;

  /**
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptations() : IAdaptation[];

  /**
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType : IAdaptationType) : IAdaptation[];

  /**
   * @deprecated only returns adaptations for the first period
   * @returns {Array.<Object>}
   */
  getAdaptation(wantedId : number|string) : IAdaptation|undefined;
}

/**
 * Object representing the tracks and qualities available from a given time
 * period in the the Manifest.
 */
export interface IPeriod {
  /** ID uniquely identifying the Period in the Manifest. */
  id : string;
  /** Every 'Adaptation' in that Period, per type of Adaptation. */
  adaptations : IManifestAdaptations;
  /** Absolute start time of the Period, in seconds. */
  start : number;
  /**
   * Duration of this Period, in seconds.
   * `undefined` for still-running Periods.
   */
  duration : number | undefined;
  /**
   * Absolute end time of the Period, in seconds.
   * `undefined` for still-running Periods.
   */
  end : number | undefined;
  /** Array containing every stream event happening on the period */
  streamEvents : IManifestStreamEvent[];
  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
   * Array.
   * @returns {Array.<Object>}
   */
  getAdaptations() : IAdaptation[];
  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period for a
   * given type.
   * @param {string} adaptationType
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType : IAdaptationType) : IAdaptation[];
  /**
   * Returns the Adaptation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getAdaptation(wantedId : string) : IAdaptation|undefined;
  /**
   * Returns Adaptations that contain Representations in supported codecs.
   * @param {string|undefined} type - If set filter on a specific Adaptation's
   * type. Will return for all types if `undefined`.
   * @returns {Array.<Adaptation>}
   */
  getSupportedAdaptations(type? : IAdaptationType) : IAdaptation[];
}

/**
 * Normalized Adaptation structure.
 * An Adaptation describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 */
export interface IAdaptation {
  /** ID uniquely identifying the Adaptation in the Period. */
  id : string;
  /**
   * Different `Representations` (e.g. qualities) this Adaptation is available
   * in.
   */
  representations : IRepresentation[];
  /** Type of this Adaptation. */
  type : IAdaptationType;
  /** Whether at least one Representation should be decodable. */
  hasSupport : boolean;
  /** Whether this track contains an audio description for the visually impaired. */
  isAudioDescription? : boolean;
  /** Whether this Adaptation contains closed captions for the hard-of-hearing. */
  isClosedCaption? : boolean;
  /** If true this Adaptation contains sign interpretation. */
  isSignInterpreted? : boolean;
  /**
   * If `true`, this Adaptation is a "dub", meaning it was recorded in another
   * language than the original one.
   */
  isDub? : boolean;
  /** Language this Adaptation is in, as announced in the original Manifest. */
  language? : string;
  /** Language this Adaptation is in, when translated into an ISO639-3 code. */
  normalizedLanguage? : string;
  /**
   * `true` if this Adaptation was not present in the original Manifest, but was
   * manually added after through the corresponding APIs.
   */
  manuallyAdded? : boolean;
  /** Tells if the track is a trick mode track. */
  isTrickModeTrack? : boolean;
  trickModeTracks? : IAdaptation[];
  /**
   * Returns unique bitrate for every Representation in this Adaptation.
   * @returns {Array.<Number>}
   */
  getAvailableBitrates() : number[];
  /**
   * Returns all Representation in this Adaptation that can be played (that is:
   * not undecipherable and with a supported codec).
   * @returns {Array.<Representation>}
   */
  getPlayableRepresentations() : IRepresentation[];
  /**
   * Returns the Representation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getRepresentation(wantedId : number|string) : IRepresentation|undefined;
}

/**
 * Normalized Representation structure.
 * Represents a media quality in a specific track.
 */
export interface IRepresentation {
  /** ID uniquely identifying the Representation in the Adaptation. */
  id : string;
  /**
   * Interface allowing to get information about segments available for this
   * Representation.
   */
  index : IRepresentationIndex;
  /** Bitrate this Representation is in, in bits per seconds. */
  bitrate : number;
  /**
   * Frame-rate, when it can be applied, of this Representation, in any textual
   * indication possible (often under a ratio form).
   */
  frameRate? : string;
  /**
   * A string describing the codec used for this Representation.
   * undefined if we do not know.
   */
  codec : string | undefined;
  /**
   * A string describing the mime-type for this Representation.
   * Examples: audio/mp4, video/webm, application/mp4, text/plain
   * undefined if we do not know.
   */
  mimeType? : string;
  /**
   * If this Representation is linked to video content, this value is the width
   * in pixel of the corresponding video data.
   */
  width? : number;
  /**
   * If this Representation is linked to video content, this value is the height
   * in pixel of the corresponding video data.
   */
  height? : number;
  /** Encryption information for this Representation. */
  contentProtections? : IContentProtections;
  /**
   * If the track is HDR, give the characteristics of the content
   */
  hdrInfo?: IHDRInformation;
  /**
   * Whether we are able to decrypt this Representation / unable to decrypt it or
   * if we don't know yet:
   *   - if `true`, it means that we know we were able to decrypt this
   *     Representation in the current content.
   *   - if `false`, it means that we know we were unable to decrypt this
   *     Representation
   *   - if `undefined` there is no certainty on this matter
   */
  decipherable? : boolean  | undefined;
  /** `true` if the Representation is in a supported codec, false otherwise. */
  isCodecSupported : boolean;
  /**
   * If `true` the main characteristics (resolution, framerate, bitrate ...) of
   * this Representation have been checked and there's a high chance of this
   * Representation to be decodable by the browser.
   * If `false` one of the characteristics make this Representation not
   * decodable.
   * If `undefined`, we could not determine this.
   */
  isSupported : boolean | undefined;
  /**
   * Returns "mime-type string" which includes both the mime-type and the codec,
   * which is often needed when interacting with the browser's APIs.
   * @returns {string}
   */
  getMimeTypeString() : string;
  /**
   * Returns encryption initialization data linked to the given DRM's system ID.
   * This data may be useful to decrypt encrypted media segments.
   *
   * Returns an empty array if there is no data found for that system ID at the
   * moment.
   *
   * When you know that all encryption data has been added to this
   * Representation, you can also call the `getAllEncryptionData` method.
   * This second function will return all encryption initialization data
   * regardless of the DRM system, and might thus be used in all cases.
   *
   * /!\ Note that encryption initialization data may be progressively added to
   * this Representation after `_addProtectionData` calls or Manifest updates.
   * Because of this, the return value of this function might change after those
   * events.
   *
   * @param {string} drmSystemId - The hexa-encoded DRM system ID
   * @returns {Array.<Object>}
   */
  getEncryptionData(drmSystemId : string) : IContentProtection[];
  /**
   * Returns all currently-known encryption initialization data linked to this
   * Representation.
   * Encryption initialization data is generally required to be able to decrypt
   * those Representation's media segments.
   *
   * Unlike `getEncryptionData`, this method will return all available
   * encryption data.
   * It might as such might be used when either the current drm's system id is
   * not known or when no encryption data specific to it was found. In that
   * case, providing every encryption data linked to this Representation might
   * still allow decryption.
   *
   * Returns an empty array in two cases:
   *   - the content is not encrypted.
   *   - We don't have any decryption data yet.
   *
   * /!\ Note that new encryption initialization data can be added progressively
   * through the `_addProtectionData` method or through Manifest updates.
   * It is thus highly advised to only rely on this method once every protection
   * data related to this Representation has been known to be added.
   *
   * The main situation where new encryption initialization data is added is
   * after parsing this Representation's initialization segment, if one exists.
   * @returns {Array.<Object>}
   */
  getAllEncryptionData() : IContentProtection[];
  /**
   * Add new encryption initialization data to this Representation if it was not
   * already included.
   *
   * Returns `true` if new encryption initialization data has been added.
   * Returns `false` if none has been added (e.g. because it was already known).
   *
   * /!\ Mutates the current Representation
   *
   * TODO better handle use cases like key rotation by not always grouping
   * every protection data together? To check.
   * @param {string} initDataArr
   * @param {string} systemId
   * @param {Uint8Array} data
   * @returns {boolean}
   */
  _addProtectionData(
    initDataType : string,
    data : Array<{
      systemId : string;
      data : Uint8Array;
    }>
  ) : boolean;
}


/** Structure listing every `Adaptation` in a Period. */
export type IManifestAdaptations = Partial<Record<IAdaptationType, IAdaptation[]>>;

/** Events emitted by a `Manifest` instance */
export interface IManifestEvents {
  /** The Manifest has been updated */
  manifestUpdate : null;
  /** Some Representation's decipherability status has been updated */
  decipherabilityUpdate : IDecipherabilityUpdateElement[];
}

/** Representation affected by a `decipherabilityUpdate` event. */
export interface IDecipherabilityUpdateElement { manifest : IManifest;
                                                 period : IPeriod;
                                                 adaptation : IAdaptation;
                                                 representation : IRepresentation; }

/**
 * Interface a manually-added supplementary image track should respect.
 * @deprecated
 */
export interface ISupplementaryImageTrack {
  /** mime-type identifying the type of container for the track. */
  mimeType : string;
  /** URL to the thumbnails file */
  url : string;
}

/**
 * Interface a manually-added supplementary text track should respect.
 * @deprecated
 */
export interface ISupplementaryTextTrack {
  /** mime-type identifying the type of container for the track. */
  mimeType : string;
  /** codecs in the container (mimeType can be enough) */
  codecs? : string;
  /** URL to the text track file */
  url : string;
  /** ISO639-{1,2,3} code for the language of the track */
  language? : string;
  /**
   * Same as `language`, but in an Array.
   * Kept for compatibility with old API.
   * @deprecated
   */
  languages? : string[];
  /** If true, the track are closed captions. */
  closedCaption : boolean;
}
/** Enumerate the different ways a Manifest update can be done. */
export enum MANIFEST_UPDATE_TYPE {
  /**
   * Manifest is updated entirely thanks to a re-downloaded version of
   * the original manifest document.
   */
  Full,
  /**
   * Manifest is updated partially thanks to a shortened version
   * of the manifest document. The latter's URL might be different
   * from the original one.
   */
  Partial,
}

/** Every possible value for the Adaptation's `type` property. */
export type IAdaptationType = "video" | "audio" | "text" | "image";

export interface IHDRInformation {
  /**
   * It is the bit depth used for encoding color for a pixel.
   *
   * It is used to ask to the user agent if the color depth is supported by the
   * output device.
   */
  colorDepth? : number | undefined;
  /**
   * It is the HDR eotf. It is the transfer function having the video signal as
   * input and converting it into the linear light output of the display. The
   * conversion is done within the display device.
   *
   * It may be used here to ask the MediaSource if it supported.
   */
  eotf? : string | undefined;
  /**
   * It is the video color space used for encoding. An HDR content may not have
   * a wide color gamut.
   *
   * It may be used to ask about output device color space support.
   */
  colorSpace? : string | undefined;
}

/** Manifest, as documented in the API documentation. */
export interface IExposedManifest {
  periods : IExposedPeriod[];
  /**
   * @deprecated
   */
  adaptations : { audio? : IExposedAdaptation[];
                  video? : IExposedAdaptation[];
                  text? : IExposedAdaptation[];
                  image? : IExposedAdaptation[]; };
  isLive : boolean;
  transport : string;
}

/** Period, as documented in the API documentation. */
export interface IExposedPeriod {
  id : string;
  start : number;
  end? : number | undefined;
  adaptations : { audio? : IExposedAdaptation[];
                  video? : IExposedAdaptation[];
                  text? : IExposedAdaptation[];
                  image? : IExposedAdaptation[]; };
}

/** Adaptation (represents a track), as documented in the API documentation. */
export interface IExposedAdaptation {
  /** String identifying the Adaptation, unique per Period. */
  id : string;
  type : "video" | "audio" | "text" | "image";
  language? : string | undefined;
  normalizedLanguage? : string | undefined;
  isAudioDescription? : boolean | undefined;
  isClosedCaption? : boolean | undefined;
  isTrickModeTrack? : boolean | undefined;
  representations : IExposedRepresentation[];

  getAvailableBitrates() : number[];
}

/** Representation (represents a quality), as documented in the API documentation. */
export interface IExposedRepresentation {
  /** String identifying the Representation, unique per Adaptation. */
  id : string;
  bitrate : number;
  /** Codec used by the segment in that Representation. */
  codec? : string | undefined;
  /**
   * Whether we are able to decrypt this Representation / unable to decrypt it or
   * if we don't know yet:
   *   - if `true`, it means that we know we were able to decrypt this
   *     Representation in the current content.
   *   - if `false`, it means that we know we were unable to decrypt this
   *     Representation
   *   - if `undefined` there is no certainty on this matter
   */
  decipherable? : boolean | undefined;
  /**
   * This property makes the most sense for video Representations.
   * It defines the height of the video, in pixels.
   */
  height? : number | undefined;
  /**
   * This property makes the most sense for video Representations.
   * It defines the height of the video, in pixels.
   */
  width? : number | undefined;
  /**
   * The represesentation frame rate for this Representation. It defines either
   * the number of frames per second as an integer (24), or as a ratio
   * (24000 / 1000).
   */
  frameRate? : string | undefined;
  /** If the track is HDR, gives the HDR characteristics of the content */
  hdrInfo? : IHDRInformation;
  index : IExposedRepresentationIndex;
}

interface IExposedRepresentationIndex {
  getSegments(up : number, duration : number) : IExposedSegment[];
}

/** Segment, as documented in the API documentation. */
export interface IExposedSegment {
  id : string;
  timescale : number;
  duration? : number | undefined;
  time : number;
  isInit? : boolean | undefined;
  range? : number[] | null | undefined;
  indexRange? : number[] | null | undefined;
  number? : number | undefined;
}
