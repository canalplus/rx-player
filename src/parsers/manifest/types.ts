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

import { IRepresentationIndex } from "../../manifest";
import { IHDRInformation } from "../../public_types";

export interface IManifestStreamEvent { start: number;
                                        end?: number | undefined;
                                        id?: string | undefined;
                                        data: IParsedStreamEventData; }

export interface IParsedStreamEventData {
  type: "dash-event-stream";
  value: {
    schemeIdUri: string;
    timescale: number;
    element: Element;
  };
}

/** Describes information about an encryption Key ID of a given media. */
export interface IContentProtectionKID { keyId : Uint8Array;
                                         systemId?: string | undefined; }

/**
 * Encryption initialization data.
 * This is the data used to initialize a license request.
 */
export interface IContentProtectionInitData {
  /**
   * Initialization data type.
   * String describing the format of the initialization data sent through this
   * event.
   * https://www.w3.org/TR/eme-initdata-registry/
   */
  type: string;
  /** Every initialization data for that type.  */
  values: Array<{
    /**
     * Hex encoded system id, which identifies the key system.
     * https://dashif.org/identifiers/content_protection/
     */
    systemId: string;
    /**
     * The initialization data itself for that type and systemId.
     * For example, with ISOBMFF "cenc" initialization data, this will be the
     * whole PSSH box.
     */
     data: Uint8Array;
  }>;
}

/**
 * Describes information about the encryption initialization data of a given
 * media.
 */
/** Describes every encryption protection parsed for a given media. */
export interface IContentProtections {
  /**
   * The different encryption key IDs associated with that content.
   *
   * `undefined` if the key id(s) associated with that content may exist but are
   * not known.
   */
  keyIds : IContentProtectionKID[] | undefined;
  /** The different encryption initialization data associated with that content. */
  initData : IContentProtectionInitData[];
}

/** Represents metadata of a CDN which can serve resources. */
export interface ICdnMetadata {
  /**
   * The base URL on which resources can be requested though this CDN.
   * In most transports, you will want to add the wanted media resource's URL
   * to that one to request it.
   */
  baseUrl : string;

  /**
   * Identifier that might be re-used in other documents, for example a
   * Content Steering Manifest, to identify this CDN.
   */
  id? : string | undefined;
}

/** Representation of a "quality" available in an Adaptation. */
export interface IParsedRepresentation {
  /** Maximum bitrate the Representation is available in, in bits per seconds. */
  bitrate : number;
  /**
   * Information on the CDN(s) on which requests should be done to request this
   * Representation's initialization and media segments.
   *
   * `null` if there's no CDN involved here (e.g. resources are not
   * requested through the network).
   *
   * An empty array means that no CDN are left to request the resource. As such,
   * no resource can be loaded in that situation.
   */
  cdnMetadata : ICdnMetadata[] | null;
  /**
   * Interface to get information about segments associated with this
   * Representation,
   */
  index : IRepresentationIndex;
  /**
   * Unique ID that should not change between Manifest updates for this
   * Representation but which should be different than any other Representation
   * in the same Adaptation.
   */
  id: string;

  /** Codec(s) associated with this Representation. */
  codecs?: string | undefined;
  /**
   * Information about the encryption associated with this Representation.
   * Not set if unknown or if the content is not encrypted.
   */
  contentProtections? : IContentProtections | undefined;
  /**
   * Frame rate (images per seconds) associated with this Representation.
   * Not set if unknown or if it makes no sense (e.g. for subtitles).
   */
  frameRate?: string | undefined;
  /**
   * Height (top to bottom) in pixels this Representation has.
   * Not set if unknown or if it makes no sense (e.g. for audio).
   */
  height?: number | undefined;
  /**
   * Defines the mime-type of the content.
   * This allows to deduce the media container but most of the time, the
   * `codecs` will also be needed to know how to decode that media.
   */
  mimeType?: string | undefined;
  /**
   * Width (left to right) in pixels this Representation has.
   * Not set if unknown or if it makes no sense (e.g. for audio).
   */
  width?: number | undefined;
  /**
   * Information about the HDR characteristic of a content.
   */
  hdrInfo?: IHDRInformation | undefined;
}

/** Every possible types an Adaptation can have. */
export type IParsedAdaptationType = "audio" |
                                    "video" |
                                    "text" |
                                    "image";

/**
 * Collection of multiple `Adaptation`, regrouped by type, as used by a
 * `Period`.
 */
export type IParsedAdaptations =
  Partial<Record<IParsedAdaptationType, IParsedAdaptation[]>>;

/** Representation of a "track" available in any Period. */
export interface IParsedAdaptation {
  /**
   * Unique ID that should not change between Manifest updates for this
   * Adaptation but which should be different than any other Adaptation
   * in the same Period.
   */
  id: string;
  /** Describes every qualities this Adaptation is in. */
  representations: IParsedRepresentation[];
  /** The type of track (e.g. "video", "audio" or "text"). */
  type: IParsedAdaptationType;
  /**
   * Whether this Adaptation is an audio-track for the visually impaired.
   * Not set if unknown or if it makes no sense for the current track (e.g. for
   * a video track).
   */
  audioDescription? : boolean | undefined;
  /**
   * Whether this Adaptation are closed captions for the hard of hearing.
   * Not set if unknown or if it makes no sense for the current track (e.g. for
   * a video track).
   */
  closedCaption? : boolean | undefined;
  /**
   * If true this Adaptation is in a dub: it was recorded in another language
   * than the original(s) one(s).
   */
  isDub? : boolean | undefined;
  /**
   * If true this Adaptation is in a sign interpreted: which is a variant of the
   * video with sign language.
   */
  isSignInterpreted? : boolean | undefined;
  /** Tells if the track is a trick mode track. */
  isTrickModeTrack? : boolean | undefined;
  /**
   * Language the `Adaptation` is in.
   * Not set if unknown or if it makes no sense for the current track.
   */
  language?: string | undefined;
  /**
   * Label of the `Adaptation` if it exists.
   */
  label?: string;
  /**
   * TrickMode tracks attached to the adaptation.
   */
  trickModeTracks?: IParsedAdaptation[] | undefined;
}

/** Information on a given period of time in the Manifest */
export interface IParsedPeriod {
  /**
   * Unique ID that should not change between Manifest updates for this
   * Period but which should be different than any other Period in this
   * Manifest.
   */
  id : string;
  /**
   * Start time at which the Period begins.
   * For static contents, the start of the first Period should
   * corresponds to the time of the first available segment
   */
  start : number;
  /** Available tracks for this Period.  */
  adaptations : IParsedAdaptations;
  /**
   * Duration of the Period (from the start to the end), in seconds.
   * `undefined` if the Period is the last one and is still being updated.
   */
  duration? : number | undefined;
  /**
   * Time at which the Period ends, in seconds.
   * `undefined` if the Period is the last one and is still
   * being updated.
   */
  end? : number | undefined;
  /**
   * Array containing every stream event from period in manifest.
   * `undefined` if no parsed stream event in manifest.
   */
  streamEvents?: IManifestStreamEvent[] | undefined;
}

/** Information on the whole content */
export interface IParsedManifest {
  /** If true, this Manifest can be updated. */
  isDynamic : boolean;
  /**
   * If true, this Manifest describes a "live" content we shall play close to
   * its "live edge".
   */
  isLive : boolean;
  /**
   * If `true`, no more periods will be added after the current last manifest's
   * Period.
   * `false` if we know that more Period is coming or if we don't know.
   */
  isLastPeriodKnown : boolean;
  /** Periods contained in this manifest. */
  periods: IParsedPeriod[];
  /**
   * The wall-clock time when the manifest was generated and published at the
   * origin server
   */
  publishTime? : number | undefined;
  /** Underlying transport protocol: "smooth", "dash", "metaplaylist" etc. */
  transportType: string;
  /** Base time from which the segments are generated. */
  availabilityStartTime? : number | undefined;
  /**
   * Offset, in milliseconds, the client's clock (in terms of `performance.now`)
   * has relatively to the server's
   */
  clockOffset? : number | undefined;
  /** If set, the Manifest needs to be updated when that Promise resolves. */
  expired? : Promise<void> | undefined;
  /**
   * Duration of the validity of this Manifest from its download time.
   * After that time has elapsed, the Manifest should be refreshed.
   */
  lifetime? : number | undefined;
  /**
   * Data allowing to calculate the minimum and maximum seekable positions at
   * any given time.
   */
  timeBounds : {
    /**
     * This is the theoretical minimum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     * `undefined` if unknown.
     *
     * More technically, the `minimumSafePosition` is the maximum between all
     * the minimum positions reachable in any of the audio and video Adaptation.
     */
    minimumSafePosition? : number | undefined;
    /**
     * Some dynamic contents have the concept of a "window depth" (or "buffer
     * depth") which allows to set a minimum position for all reachable
     * segments, in function of the maximum reachable position.
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
      /**
       * Current position representing live content.
       * Only makes sense for un-ended live contents.
       *
       * `undefined` if unknown or if it doesn't make sense in the current context.
       */
      livePosition : number | undefined;
      /**
       * Whether the maximum positions should evolve linearly over time.
       *
       * If set to `true`, the maximum seekable position continuously increase at
       * the same rate than the time since `time` does.
       *
       * For example, a `maximumSafePosition` of 50000 (50 seconds) will
       * indicate a maximum time of 51 seconds after 1 second have passed, of 56
       * seconds after 6 seconds have passed (we know how many seconds have
       * passed since the initial calculation of the maximum position by
       * checking the `time` property) etc.
       */
      isLinear: boolean;
      /**
       * This is the theoretical maximum playable position on the content,
       * regardless of the current Adaptation chosen, as estimated at parsing
       * time.
       *
       * More technically, the `maximumSafePosition` is the minimum between all
       * attributes indicating the duration of the content in the Manifest.
       *
       * That is the minimum between:
       *   - The Manifest original attributes relative to its duration
       *   - The minimum between all known maximum audio positions
       *   - The minimum between all known maximum video positions
       *
       * This can for example be understood as the safe maximum playable
       * position through all possible tacks.
       */
      maximumSafePosition : number;
      /**
       * `Performance.now()` output at the time both `maximumSafePosition` and
       * `maximumPositionWithMediaData` were calculated.
       * This can be used to retrieve a new maximum position from them when they
       * linearly evolves over time (see `isLinear` property).
       */
      time : number;
    };
  };
  /**
   * Only used for live contents.
   * Suggested delay from the last position the player should start from by
   * default.
   */
  suggestedPresentationDelay? : number | undefined;
  /** URIs where the manifest can be refreshed by order of importance. */
  uris? : string[] | undefined;

  contentSteering : IContentSteeringMetadata | null;
}

export interface IContentSteeringMetadata {
  url : string;
  defaultId : string | undefined;
  queryBeforeStart : boolean;
  proxyUrl : string | undefined;
}
