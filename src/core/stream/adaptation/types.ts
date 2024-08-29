import type { IManifest, IPeriod, ITrack, IRepresentation } from "../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../playback_observer";
import type {
  IAudioTrackSwitchingMode,
  IVideoTrackSwitchingMode,
} from "../../../public_types";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import type { IRepresentationEstimator } from "../../adaptive";
import type { SegmentFetcherCreator } from "../../fetchers";
import type { IBufferType, SegmentSink } from "../../segment_sinks";
import type {
  IRepresentationsChoice,
  IRepresentationStreamCallbacks,
  IRepresentationStreamPlaybackObservation,
} from "../representation";

/** Callbacks called by the `AdaptationStream` on various events. */
export interface IAdaptationStreamCallbacks
  extends Omit<IRepresentationStreamCallbacks, "terminating" | "addedSegment"> {
  /** Called as new bitrate estimates are done. */
  bitrateEstimateChange(payload: IBitrateEstimateChangePayload): void;
  /**
   * Called when a new `RepresentationStream` is created to load segments from a
   * `Representation`.
   */
  representationChange(payload: IRepresentationChangePayload): void;
  /**
   * Callback called when a stream cannot go forward loading segments because it
   * needs the `MediaSource` to be reloaded first.
   *
   * The MediaSource will only be reloaded once the communicated Period is the
   * current one.
   */
  waitingMediaSourceReload(payload: IWaitingMediaSourceReloadPayload): void;
  /**
   * Some situations might require the browser's buffers to be refreshed.
   * This callback is called when such situation arised.
   *
   * Generally flushing/refreshing low-level buffers can be performed simply by
   * performing a very small seek.
   */
  needsBufferFlush(payload?: INeedsBufferFlushPayload): void;
}

/** Payload for the `bitrateEstimateChange` callback. */
export interface IBitrateEstimateChangePayload {
  /** The type of buffer for which the estimation is done. */
  type: IBufferType;
  /**
   * The bitrate estimate, in bits per seconds. `undefined` when no bitrate
   * estimate is currently available.
   */
  bitrate: number | undefined;
}

/** Payload for the `representationChange` callback. */
export interface IRepresentationChangePayload {
  /** The type of buffer linked to that `RepresentationStream`. */
  type: IBufferType;
  /** The `Period` linked to the `RepresentationStream` we're creating. */
  period: IPeriod;
  /** The track linked to the `RepresentationStream` we're creating. */
  track: ITrack;
  /**
   * The `Representation` linked to the `RepresentationStream` we're creating.
   * `null` when we're choosing no Representation at all.
   */
  representation: IRepresentation | null;
}

/** Payload for the `waitingMediaSourceReload` callback. */
export interface IWaitingMediaSourceReloadPayload {
  /**
   * Period asking for the reload.
   *
   * The MediaSource will only be reloaded if that Period becomes the current
   * one.
   */
  period: IPeriod;
  /** Buffer type concerned. */
  bufferType: IBufferType;
  /**
   * Relative position, compared to the current position, at which we should
   * restart playback after reloading. For example `-2` will reload 2 seconds
   * before the current position.
   */
  timeOffset: number;
  /**
   * If `true`, we will control that the position we reload at, after applying
   * `timeOffset`, is still part of the Period `period`.
   *
   * If it isn't we will re-calculate that reloaded position to be:
   *   - either the Period's start if the calculated position is before the
   *     Period's start.
   *   - either the Period'end start if the calculated position is after the
   *     Period's end.
   */
  stayInPeriod: boolean;
}

export interface INeedsBufferFlushPayload {
  /** Relative resuming position after a track change */
  relativeResumingPosition: number;
  /** `false` if the user manually set relativeResumingPosition value.
   *  `true` if the API assigned a default value to relativeResumingPosition.
   *  This setting allows to respect exactly the specified relativeResumingPosition
   *  that has been set by the user, while still providing the flexibility to modify it
   *  for slight adjustments when needed if it was defaulted by the API."
   */
  relativePosHasBeenDefaulted: boolean;
}

/** Regular playback information needed by the AdaptationStream. */
export interface IAdaptationStreamPlaybackObservation
  extends IRepresentationStreamPlaybackObservation {
  /**
   * For the current SegmentSink, difference in seconds between the next position
   * where no segment data is available and the current position.
   */
  bufferGap: number;
  /** `duration` property of the HTMLMediaElement on which the content plays. */
  duration: number;
  /** Theoretical maximum position on the content that can currently be played. */
  maximumPosition: number;
}

/** Arguments given when creating a new `AdaptationStream`. */
export interface IAdaptationStreamArguments {
  /** Regularly emit playback conditions. */
  playbackObserver: IReadOnlyPlaybackObserver<IAdaptationStreamPlaybackObservation>;
  /** Content you want to create this Stream for. */
  content: {
    manifest: IManifest;
    period: IPeriod;
    track: ITrack;
    representationsChoice: IReadOnlySharedReference<IRepresentationsChoice>;
  };
  options: IAdaptationStreamOptions;
  /** Estimate the right Representation to play. */
  representationEstimator: IRepresentationEstimator;
  /** SourceBuffer wrapper - needed to push media segments. */
  segmentSink: SegmentSink;
  /** Module used to fetch the wanted media segments. */
  segmentFetcherCreator: SegmentFetcherCreator;
  /**
   * "Buffer goal" wanted, or the ideal amount of time ahead of the current
   * position in the current SegmentSink. When this amount has been reached
   * this AdaptationStream won't try to download new segments.
   */
  wantedBufferAhead: IReadOnlySharedReference<number>;
  /**
   *  The buffer size limit in memory that we can reach for the video buffer.
   *
   *  Once reached, no segments will be loaded until it goes below that size
   *  again
   */
  maxVideoBufferSize: IReadOnlySharedReference<number>;
}

/**
 * Various specific stream "options" which tweak the behavior of the
 * AdaptationStream.
 */
export interface IAdaptationStreamOptions {
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
   * If `true`, the AdaptationStream might replace segments of a lower-quality
   * (with a lower bitrate) with segments of a higher quality (with a higher
   * bitrate). This allows to have a fast transition when network conditions
   * improve.
   * If `false`, this strategy will be disabled: segments of a lower-quality
   * will not be replaced.
   *
   * Some targeted devices support poorly segment replacement in a
   * SourceBuffer.
   * As such, this option can be used to disable that unnecessary behavior on
   * those devices.
   */
  enableFastSwitching: boolean;
}

/** Object indicating a choice of track made by the user. */
export interface ITrackChoice {
  /** The track choosen. */
  trackId: string;

  /** "Switching mode" in which the track switch should happen. */
  switchingMode: ITrackSwitchingMode;

  /** Relative resuming position after a track change */
  relativeResumingPosition: number | undefined;
  /**
   * Shared reference allowing to indicate which Representations from
   * that track are allowed.
   */
  representations: IReadOnlySharedReference<IRepresentationsChoice>;
}

export type ITrackSwitchingMode = IAudioTrackSwitchingMode | IVideoTrackSwitchingMode;
