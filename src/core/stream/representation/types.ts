import type { IContentProtection } from "../../../main_thread/types";
import type {
  IManifest,
  IAdaptation,
  ISegment,
  IPeriod,
  IRepresentation,
} from "../../../manifest";
import type { IEMSG } from "../../../parsers/containers/isobmff";
import type {
  ObservationPosition,
  IReadOnlyPlaybackObserver,
} from "../../../playback_observer";
import type {
  IAudioRepresentationsSwitchingMode,
  IPlayerError,
  IVideoRepresentationsSwitchingMode,
} from "../../../public_types";
import type { IRange } from "../../../utils/ranges";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import type { SegmentQueue } from "../../fetchers";
import type { IBufferType, SegmentSink } from "../../segment_sinks";

/** Callbacks called by the `RepresentationStream` on various events. */
export interface IRepresentationStreamCallbacks {
  /**
   * Called to announce the current status regarding the buffer for its
   * associated Period and type (e.g. "audio", "video", "text" etc.).
   *
   * Each new `IStreamStatusPayload` event replace the precedent one for the
   * same Period and type.
   */
  streamStatusUpdate(payload: IStreamStatusPayload): void;
  /** Called after a new segment has been succesfully added to the SegmentSink */
  addedSegment(payload: IStreamEventAddedSegmentPayload): void;
  /** Called when a segment with protection information has been encountered. */
  encryptionDataEncountered(payload: IContentProtection[]): void;
  /**
   * Called when the Manifest is possibly out-of-sync and needs to be refreshed
   * completely.
   *
   * The Stream made that guess because a segment that should have been available
   * is not and because it suspects this is due to a synchronization problem.
   */
  manifestMightBeOufOfSync(): void;
  /**
   * Callback called when a `RepresentationStream` is being terminated:
   *
   *   - it has finished all its segment requests and won't do new ones.
   *
   *   - it has stopped regularly checking for its current status.
   *
   *   - it only waits until all the segments it has loaded have been pushed to the
   *     SegmentSink before actually stopping everything it does.
   *
   * You can use this call as a hint that a new `RepresentationStream` can be
   * created for the same `Period` and type (e.g. to switch quality).
   */
  terminating(): void;
  /**
   * Called when the Manifest needs to be refreshed.
   * Note that segment might still be loaded and pushed even after calling
   * this callback.
   */
  needsManifestRefresh(): void;
  /**
   * Called when an "inband" event, as found in a media segment, has been
   * encountered.
   */
  inbandEvent(payload: IInbandEvent[]): void;
  /**
   * Called when a minor error has been encountered, that does not interrupt
   * the segment loading and pushing operations.
   */
  warning(payload: IPlayerError): void;
  /**
   * Called when a fatal error has been encountered.
   * Such errors have led to all the Stream's operations to be stopped.
   */
  error(payload: unknown): void;
}

/** Payload for the `streamStatusUpdate` callback. */
export interface IStreamStatusPayload {
  /** Period concerned. */
  period: IPeriod;
  /** Buffer type concerned. */
  bufferType: IBufferType;
  /**
   * Present or future "hole" in the SegmentSink's buffer that will not be
   * filled by a segment, despite being part of the time period indicated by
   * the associated Period.
   *
   * This value is set to the most imminent of such "discontinuity", which
   * can be either:
   *
   *   - current (no segment available at `position` but future segments are
   *     available), in which case this discontinuity's true beginning might
   *     be unknown.
   *
   *   - a future hole between two segments in that Period.
   *
   *   - missing media data at the end of the time period associated to that
   *     Period.
   *
   * The presence or absence of a discontinuity can evolve during playback
   * (because new tracks or qualities might not have the same ones).
   * As such, it is advised to only consider the last discontinuity sent
   * through a `"stream-status"` event.
   */
  imminentDiscontinuity: IBufferDiscontinuity | null;
  /**
   * If `true`, no segment are left to be loaded to be able to play until the
   * end of the Period.
   */
  hasFinishedLoading: boolean;
  /**
   * If `true`, this stream is a placeholder stream which will never load any
   * segment.
   */
  isEmptyStream: boolean;
  /**
   * Segments that will be scheduled for download to fill the buffer until
   * the buffer goal (first element of that list might already be loading).
   */
  neededSegments: IQueuedSegment[];
  /** Position in the content in seconds from which this status was done.  */
  position: number;
}

/** Payload for the `addedSegment` callback. */
export interface IStreamEventAddedSegmentPayload {
  /** Context about the content that has been added. */
  content: {
    period: IPeriod;
    adaptation: IAdaptation;
    representation: IRepresentation;
  };
  /** The concerned Segment. */
  segment: ISegment;
  /** Ranges of the concerned SegmentSink after the segment was pushed. */
  buffered: IRange[];
}

/** Structure describing an "inband" event, as found in a media segment. */
export interface IInbandEvent {
  /** Type when the event was foud inside a "emsg` ISOBMFF box */
  type: "emsg";
  /** Value when the event was foud inside a "emsg` ISOBMFF box */
  value: IEMSG;
}

/** Information about a Segment waiting to be loaded by the Stream. */
export interface IQueuedSegment {
  /** Priority of the segment request (lower number = higher priority). */
  priority: number;
  /** Segment wanted. */
  segment: ISegment;
}

/** Describe an encountered hole in the buffer, called a "discontinuity". */
export interface IBufferDiscontinuity {
  /**
   * Start time, in seconds, at which the discontinuity starts.
   *
   * if set to `undefined`, its true start time is unknown but the current
   * position is part of it.  It is thus a discontinuity that is currently
   * encountered.
   */
  start: number | undefined;
  /**
   * End time, in seconds at which the discontinuity ends (and thus where
   * new segments are encountered).
   *
   * If `null`, no new media segment is available for that Period and
   * buffer type until the end of the Period.
   */
  end: number | null;
}

/** Object that should be emitted by the given `IReadOnlyPlaybackObserver`. */
export interface IRepresentationStreamPlaybackObservation {
  /**
   * Information on the current media position in seconds at the time of a
   * Playback Observation.
   */
  position: ObservationPosition;
  /**
   * Information on whether the media element was paused at the time of the
   * Observation.
   */
  paused: IPausedPlaybackObservation;
  /** Last "playback rate" asked by the user. */
  speed: number;
  /**
   * Indicates whether the user agent believes it has enough buffered data to ensure
   * uninterrupted playback for a meaningful period or needs more data.
   * It also reflects whether the user agent can retrieve and buffer data in an
   * energy-efficient manner while maintaining the desired memory usage.
   * `true` indicates that the buffer is low, and more data should be buffered.
   * `false` indicates that there is enough buffered data, and no additional data needs
   *  to be buffered at this time.
   */
  canStream: boolean;
}

/** Pause-related information linked to an emitted Playback observation. */
export interface IPausedPlaybackObservation {
  /**
   * Known paused state at the time the Observation was emitted.
   *
   * `true` indicating that the HTMLMediaElement was in a paused state.
   *
   * Note that it might have changed since. If you want truly precize
   * information, you should recuperate it from the HTMLMediaElement directly
   * through another mean.
   */
  last: boolean;
  /**
   * Actually wanted paused state not yet reached.
   * This might for example be set to `false` when the content is currently
   * loading (and thus paused) but with autoPlay enabled.
   */
  pending: boolean | undefined;
}

/** Position-related information linked to an emitted Playback observation. */
export interface IPositionPlaybackObservation {
  /**
   * Known position at the time the Observation was emitted, in seconds.
   *
   * Note that it might have changed since. If you want truly precize
   * information, you should recuperate it from the HTMLMediaElement directly
   * through another mean.
   */
  last: number;
  /**
   * Actually wanted position in seconds that is not yet reached.
   *
   * This might for example be set to the initial position when the content is
   * loading (and thus potentially at a `0` position) but which will be seeked
   * to a given position once possible.
   */
  pending: number | undefined;
}

/** Item emitted by the `terminate` reference given to a RepresentationStream. */
export interface ITerminationOrder {
  /*
   * If `true`, the RepresentationStream should interrupt immediately every long
   * pending operations such as segment downloads.
   * If it is set to `false`, it can continue until those operations are
   * finished.
   */
  urgent: boolean;
}

/** Arguments to give to the RepresentationStream. */
export interface IRepresentationStreamArguments<TSegmentDataType> {
  /** The context of the Representation you want to load. */
  content: {
    adaptation: IAdaptation;
    manifest: IManifest;
    period: IPeriod;
    representation: IRepresentation;
  };
  /** The `SegmentSink` on which segments will be pushed. */
  segmentSink: SegmentSink;
  /** Interface used to load new segments. */
  segmentQueue: SegmentQueue<TSegmentDataType>;
  /**
   * Reference emitting when the RepresentationStream should "terminate".
   *
   * When this Reference emits an object, the RepresentationStream will begin a
   * "termination process": it will, depending on the type of termination
   * wanted, either stop immediately pending segment requests or wait until they
   * are finished before fully terminating (calling the `terminating` callback
   * and stopping all `RepresentationStream` current tasks).
   */
  terminate: IReadOnlySharedReference<null | ITerminationOrder>;
  /** Periodically emits the current playback conditions. */
  playbackObserver: IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>;
  /** Supplementary arguments which configure the RepresentationStream's behavior. */
  options: IRepresentationStreamOptions;
}

/**
 * Various specific stream "options" which tweak the behavior of the
 * RepresentationStream.
 */
export interface IRepresentationStreamOptions {
  /**
   * The buffer size we have to reach in seconds (compared to the current
   * position. When that size is reached, no segments will be loaded until it
   * goes below that size again.
   */
  bufferGoal: IReadOnlySharedReference<number>;

  /**
   *  The buffer size limit in memory that we can reach.
   *  Once reached, no segments will be loaded until it
   *  goes below that size again
   */
  maxBufferSize: IReadOnlySharedReference<number>;

  /**
   * Hex-encoded DRM "system ID" as found in:
   * https://dashif.org/identifiers/content_protection/
   *
   * Allows to identify which DRM system is currently used, to allow potential
   * optimizations.
   *
   * Set to `undefined` in two cases:
   *   - no DRM system is used (e.g. the content is unencrypted).
   *   - We don't know which DRM system is currently used.
   */
  drmSystemId: string | undefined;
  /**
   * Bitrate threshold from which no "fast-switching" should occur on a segment.
   *
   * Fast-switching is an optimization allowing to replace segments from a
   * low-bitrate Representation by segments from a higher-bitrate
   * Representation. This allows the user to see/hear an improvement in quality
   * faster, hence "fast-switching".
   *
   * This Reference allows to limit this behavior to only allow the replacement
   * of segments with a bitrate lower than a specific value - the number emitted
   * by that Reference.
   *
   * If set to `undefined`, no threshold is active and any segment can be
   * replaced by higher quality segment(s).
   *
   * `0` can be emitted to disable any kind of fast-switching.
   */
  fastSwitchThreshold: IReadOnlySharedReference<undefined | number>;
}

/** Object indicating a choice of allowed Representations made by the user. */
export interface IRepresentationsChoice {
  /** `Representation`s wanted by the user. */
  representationIds: string[];
  /**
   * How the Streams should react if another, not currently authorized,
   * Representation was previously playing.
   */
  switchingMode: IVideoRepresentationsSwitchingMode | IAudioRepresentationsSwitchingMode;
}
