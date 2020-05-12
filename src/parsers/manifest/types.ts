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

/**
 *
 */
export interface IStreamEvent {
  presentationTime?: number;
  duration?: number;
  id?: string;
  element: Node | Element;
}

/** Describes information about an encryption Key ID of a given media. */
export interface IContentProtectionKID { keyId : Uint8Array;
                                         systemId?: string; }

/**
 * Describes information about the encryption initialization data of a given
 * media.
 */
export interface IContentProtectionInitData { systemId : string;
                                              data : Uint8Array; }

/** Describes every encryption protection parsed for a given media. */
export interface IContentProtections {
  /** The different encryption key IDs associated with that content. */
  keyIds : IContentProtectionKID[];
  /** The different encryption initialization data associated with that content. */
  initData : Partial<Record<string, IContentProtectionInitData[]>>;
}

/** Representation of a "quality" available in an Adaptation. */
export interface IParsedRepresentation {
  /** Average bitrate the Representation is available in, in bits per seconds. */
  bitrate : number;
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
  codecs?: string;
  /**
   * Information about the encryption associated with this Representation.
   * Not set if unknown or if the content is not encrypted.
   */
  contentProtections? : IContentProtections;
  /**
   * Frame rate (images per seconds) associated with this Representation.
   * Not set if unknown or if it makes no sense (e.g. for subtitles).
   */
  frameRate?: string;
  /**
   * Height (top to bottom) in pixels this Representation has.
   * Not set if unknown or if it makes no sense (e.g. for audio).
   */
  height?: number;
  /**
   * Defines the mime-type of the content.
   * This allows to deduce the media container but most of the time, the
   * `codecs` will also be needed to know how to decode that media.
   */
  mimeType?: string;
  /**
   * Width (left to right) in pixels this Representation has.
   * Not set if unknown or if it makes no sense (e.g. for audio).
   */
  width?: number;
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
  audioDescription? : boolean;
  /**
   * Whether this Adaptation are closed captions for the hard of hearing.
   * Not set if unknown or if it makes no sense for the current track (e.g. for
   * a video track).
   */
  closedCaption? : boolean;
  /**
   * If true this Adaptation is in a dub: it was recorded in another language
   * than the original(s) one(s).
   */
  isDub? : boolean;
  /**
   * If true this Adaptation is in a sign interpreted: which is a variant of the
   * video with sign language.
   */
  isSignInterpreted? : boolean;
  /**
   * Language the `Adaptation` is in.
   * Not set if unknown or if it makes no sense for the current track.
   */
  language?: string;
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
  duration? : number;
  /**
   * Time at which the Period ends, in seconds.
   * `undefined` if the Period is the last one and is still
   * being updated.
   */
  end? : number;
  /**
   *
   */
  streamEvents?: IStreamEvent[];
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
  /** Periods contained in this manifest. */
  periods: IParsedPeriod[];
  /** Underlying transport protocol: "smooth", "dash", "metaplaylist" etc. */
  transportType: string;
  /** Base time from which the segments are generated. */
  availabilityStartTime? : number;
  /**
   * Offset, in milliseconds, the client's clock (in terms of `performance.now`)
   * has relatively to the server's
   */
  clockOffset?: number;
  /** If set, the Manifest needs to be updated when that Promise resolves. */
  expired? : Promise<void>;
  /**
   * Duration of the validity of this Manifest from its download time.
   * After that time has elapsed, the Manifest should be refreshed.
   */
  lifetime?: number;
  /** Information on the maximum seekable position or on how to calculate it. */
  maximumTime? : {
    /** Whether this value linearly evolves over time. */
    isContinuous : boolean;
    /** Maximum seekable time in seconds calculated at `time`. */
    value : number;
    /** `Performance.now()` output at the time `value` was calculated. */
    time : number;
  };
  /** Information on the minimum seekable position or on how to calculate it. */
  minimumTime? : { // Information on the minimum seekable position.
    /** Whether this value linearly evolves over time. */
    isContinuous : boolean;
    /** Minimum seekable time in seconds calculated at `time`. */
    value : number;
    /** `Performance.now()` output at the time `value` was calculated. */
    time : number;
  };
  /**
   * Only used for live contents.
   * Suggested delay from the last position the player should start from by
   * default.
   */
  suggestedPresentationDelay? : number;
  /** URIs where the manifest can be refreshed by order of importance. */
  uris?: string[];
}
