import type { IContentProtections, IManifestStreamEvent } from "../parsers/manifest";
import type { IHDRInformation, ITrackType } from "../public_types";

/**
 * Various formats an `IManifestMetadata` object can take.
 */
export const enum ManifestMetadataFormat {
  /**
   * This is actually a `Manifest` class, with its event listeners, methods and
   * all properties.
   */
  Class,
  /**
   * This is only an object anouncing the properties required by the
   * `IManifestMetadata` interface.
   *
   * The main advantages of this smaller structure is that:
   *   - it takes less place in memory
   *   - it can be serialized and thus communicated between threads
   *     without loss of information.
   *
   * However it does not contain the full information like `Class` would.
   */
  MetadataObject,
}

/**
 * Object describing the metadata of a given content.
 *
 * An `IManifestMetadata` object has several advantages over the full `Manifest`
 * class:
 *   - it contains fewer properties and is thus much cheaper to deeply copy
 *   - it doesn't contain any method
 *   - it is fully serializable while still containing its more important
 *     metadata
 *   - A `Manifest` is compatible and thus can be automatically upcasted into an
 *     `IManifestMetadata`.
 *
 * This makes it a good candidate when a `Manifest`'s information has to be
 * shared through several threads or environments.
 *
 * As such, modules which may be running in a different environment than the
 * one creating Manifest classes should prefer to depend on an
 * `IManifestMetadata` object, rather than the full `Manifest` class.
 */
export interface IManifestMetadata {
  /**
   * Format of the current object respecting the `IManifestMetadata` interface.
   * Allowing for several type of formats allows to accomodate several
   * environments such as multi-thread scenarios without badly impacting much
   * advanced features of a mono-thread scenario.
   */
  manifestFormat: ManifestMetadataFormat;
  /**
   * ID uniquely identifying this Manifest.
   * No two Manifests should have this ID.
   * This ID is automatically calculated each time a `Manifest` instance is
   * created.
   */
  id: string;

  /**
   * List every Period in that Manifest chronologically (from start to end).
   * A Period contains information about the content available for a specific
   * period of time.
   */
  periods: IPeriodMetadata[];

  /**
   * If true, the Manifest can evolve over time:
   * New segments can become available in the future, properties of the manifest
   * can change...
   */
  isDynamic: boolean;

  /**
   * If true, this Manifest describes a live content.
   * A live content is a specific kind of content where you want to play very
   * close to the maximum position (here called the "live edge").
   * E.g., a TV channel is a live content.
   */
  isLive: boolean;

  /**
   * If `true`, no more periods will be added after the current last manifest's
   * Period.
   * `false` if we know that more Period is coming or if we don't know.
   */
  isLastPeriodKnown: boolean;

  /*
   * Every URI linking to that Manifest.
   * They can be used for refreshing the Manifest.
   * Listed from the most important to the least important.
   */
  uris: string[];

  /**
   * Minimum time, in seconds, at which a segment defined in the Manifest
   * can begin.
   * This is also used as an offset for live content to apply to a segment's
   * time.
   */
  availabilityStartTime: number | undefined;

  /**
   * Suggested delay from the "live edge" (i.e. the position corresponding to
   * the current broadcast for a live content) the content is suggested to start
   * from.
   * This only applies to live contents.
   */
  suggestedPresentationDelay?: number | undefined;

  /*
   * Difference between the server's clock in milliseconds and the
   * monotonically-raising timestamp used by the RxPlayer.
   * This property allows to calculate the server time at any moment.
   * `undefined` if we did not obtain the server's time
   */
  clockOffset?: number | undefined;

  /**
   * Data allowing to calculate the minimum and maximum seekable positions at
   * any given time.
   */
  timeBounds: {
    /**
     * This is the theoretical minimum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     * `undefined` if unknown.
     *
     * More technically, the `minimumSafePosition` is the maximum between all
     * the minimum positions reachable in any of the audio and video Adaptation.
     *
     * Together with `timeshiftDepth` and the `maximumTimeData` object, this
     * value allows to compute at any time the minimum seekable time:
     *
     *   - if `timeshiftDepth` is not set, the minimum seekable time is a
     *     constant that corresponds to this value.
     *
     *    - if `timeshiftDepth` is set, `minimumSafePosition` will act as the
     *      absolute minimum seekable time we can never seek below, even when
     *      `timeshiftDepth` indicates a possible lower position.
     *      This becomes useful for example when playing live contents which -
     *      despite having a large window depth - just begun and as such only
     *      have a few segment available for now.
     *      Here, `minimumSafePosition` would be the start time of the initial
     *      segment, and `timeshiftDepth` would be the whole depth that will
     *      become available once enough segments have been generated.
     */
    minimumSafePosition?: number | undefined;
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
    timeshiftDepth: number | null;
    /** Data allowing to calculate the maximum playable position at any given time. */
    maximumTimeData: {
      /**
       * Current position representing live content.
       * Only makes sense for un-ended live contents.
       *
       * `undefined` if unknown or if it doesn't make sense in the current context.
       */
      livePosition: number | undefined;
      /**
       * Whether the maximum positions should evolve linearly over time.
       *
       * If set to `true`, the maximum seekable position continuously increase at
       * the same rate than the time since `time` does.
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
      maximumSafePosition: number;
      /**
       * Monotonically-raising timestamp (the one commonly used by the RxPlayer)
       * at the time both `maximumSafePosition` and `livePosition` were
       * calculated.
       * This can be used to retrieve a new maximum position from them when they
       * linearly evolves over time (see `isLinear` property).
       */
      time: number;
    };
  };
}

/**
 * Object describing a "Period" in the Manifest, that is, a time-delimited
 * subset with its own tracks and qualities.
 *
 * Streaming technologies without the concept of a "Period" will just be
 * considered to have a single Period spanning the whole content.
 *
 * An `IPeriodMetadata` object has several advantages over the full `Period`
 * class:
 *   - it contains fewer properties and is thus much cheaper to deeply copy
 *   - it doesn't contain any method
 *   - it is fully serializable while still containing its more important
 *     metadata
 *   - A `Period` is compatible and thus can be automatically upcasted into an
 *     `IPeriodMetadata`.
 *
 * This makes it a good candidate when a `Period`'s information has to be
 * shared through several threads or environments.
 *
 * As such, modules which may be running in a different environment than the
 * one creating Period classes should prefer to depend on an
 * `IPeriodMetadata` object, rather than the full `Period` class.
 */
export interface IPeriodMetadata {
  /** ID uniquely identifying the IPeriodMetadata in the IManifestMetadata. */
  id: string;
  /** Absolute start time of the Period, in seconds. */
  start: number;
  /**
   * Absolute end time of the Period, in seconds.
   * `undefined` for still-running Periods.
   */
  end?: number | undefined;
  /**
   * Duration of this Period, in seconds.
   * `undefined` for still-running Periods.
   */
  duration?: number | undefined;
  /** Every 'Adaptation' in that Period, per type of Adaptation. */
  adaptations: Partial<Record<ITrackType, IAdaptationMetadata[]>>;
  /** Array containing every stream event happening on the period */
  streamEvents: IManifestStreamEvent[];
}

export interface IAdaptationMetadata {
  /** ID uniquely identifying the Adaptation in the Period. */
  id: string;
  /** Type of this Adaptation. */
  type: ITrackType;
  /** Language this Adaptation is in, as announced in the original Manifest. */
  language?: string | undefined;
  /** Whether this Adaptation contains closed captions for the hard-of-hearing. */
  isClosedCaption?: boolean | undefined;
  /** Whether this track contains an audio description for the visually impaired. */
  isAudioDescription?: boolean | undefined;
  /** If true this Adaptation contains sign interpretation. */
  isSignInterpreted?: boolean | undefined;
  /**
   * If `true` this Adaptation are subtitles Meant for display when no other text
   * Adaptation is selected. It is used to clarify dialogue, alternate
   * languages, texted graphics or location/person IDs that are not otherwise
   * covered in the dubbed/localized audio Adaptation.
   */
  isForcedSubtitles?: boolean | undefined;
  /**
   * `true` if at least one Representation is in a supported codec. `false` otherwise.
   *
   * `undefined` for when this is not yet known (we're still in the process of
   * probing for support).
   */
  isSupported?: boolean | undefined;
  /** Language this Adaptation is in, when translated into an ISO639-3 code. */
  normalizedLanguage?: string | undefined;
  /**
   * Different `Representations` (e.g. qualities) this Adaptation is available
   * in.
   */
  representations: IRepresentationMetadata[];
  /** Label of the adaptionSet */
  label?: string | undefined;
  /**
   * If `true`, this Adaptation is a "dub", meaning it was recorded in another
   * language than the original one.
   */
  isDub?: boolean | undefined;
  /** Tells if the track is a trick mode track. */
  trickModeTracks?: IAdaptationMetadata[] | undefined;
  /** Tells if the track is a trick mode track. */
  isTrickModeTrack?: boolean | undefined;
}

export interface IRepresentationMetadata {
  /**
   * ID uniquely identifying the `Representation` in its parent `Adaptation`.
   *
   * This identifier might be linked to an identifier present in the original
   * Manifest file, it is thus the identifier to use to determine if a
   * `Representation` from a refreshed `Manifest` is actually the same one than
   * one in the previously loaded Manifest (as long as the `Adaptation` and
   * `Period` are also the same).
   *
   * For a globally unique identifier regardless of the `Adaptation`, `Period`
   * or even `Manifest`, you can rely on `uniqueId` instead.
   */
  id: string;
  /**
   * Globally unique identifier for this `Representation` object.
   *
   * This identifier is guaranteed to be unique for any `Representation`s of all
   * `Manifest` objects created in the current JS Realm.
   * As such, it can be used as an identifier for the JS object itself, whereas
   * `id` is the identifier for the original Manifest's Representation in the
   * scope of its parent `Adaptation`.
   */
  uniqueId: string;
  /** Bitrate this Representation is in, in bits per seconds. */
  bitrate: number;
  /**
   * `true` if the Representation is in a supported codec, false otherwise.
   * `undefined` for when this is not yet known (we're still in the process of
   * probing for support).
   */
  isSupported?: boolean | undefined;
  /**
   * An array of strings describing codecs that Representation relies on.
   *
   * If multiple elements are in this array, each element is a codec (or groups
   * of codecs, e.g. for both audio and video) enhancing and backward compatible
   * to the next element of that array.
   *
   * For example, a Dolby Vision video Representation could be retro-compatible
   * with HDR10 decoders not handling Dolby Vision-specific metadata.
   * In that scenario, we could have an array with two elements:
   *   1. The Dolby Vision codec
   *   2. The base HDR10 codec, hopefully with higher device compatibility.
   *
   * To note that we should aim to have the shorter array possible to always
   * expose the actually relied-on codec through the API. The idea could be
   * to only have several elements in this Array _BEFORE_ testing for codec
   * support on the current device, only to then remove all non-used codecs to
   * keep the one actually relied on.
   */
  codecs?: string[];
  /**
   * A string describing the mime-type for this Representation.
   * Examples: audio/mp4, video/webm, application/mp4, text/plain
   * undefined if we do not know.
   */
  mimeType?: string | undefined;
  /**
   * If this Representation is linked to video content, this value is the width
   * in pixel of the corresponding video data.
   */
  width?: number | undefined;
  /**
   * If this Representation is linked to video content, this value is the height
   * in pixel of the corresponding video data.
   */
  height?: number | undefined;
  /**
   * Frame-rate, when it can be applied, of this Representation, in any textual
   * indication possible (often under a ratio form).
   */
  frameRate?: number | undefined;
  /**
   * `true` if this `Representation` is linked to a spatial audio technology.
   * For example, it may be set to `true` if the Representation relies on the
   * "Dolby Atmos". technology.
   *
   * `false` if it is known that this `Representation` does not contain any
   * spatial audio.
   *
   * `undefined` if we do not know whether this `Representation` contains
   * spatial audio or not.
   */
  isSpatialAudio?: boolean | undefined;
  /**
   * If the track is HDR, give the characteristics of the content
   */
  hdrInfo?: IHDRInformation | undefined;
  /**
   * Whether we are able to decrypt this Representation / unable to decrypt it or
   * if we don't know yet:
   *   - if `true`, it means that we know we were able to decrypt this
   *     Representation in the current content.
   *   - if `false`, it means that we know we were unable to decrypt this
   *     Representation
   *   - if `undefined` there is no certainty on this matter
   */
  decipherable?: boolean | undefined;
  /** Encryption information for this Representation. */
  contentProtections?: IContentProtections | undefined;
}
