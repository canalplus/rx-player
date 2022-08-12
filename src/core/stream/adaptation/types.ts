import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../../manifest";
import {
  IAudioTrackSwitchingMode,
  IVideoTrackSwitchingMode,
} from "../../../public_types";
import { IReadOnlySharedReference } from "../../../utils/reference";
import { IRepresentationEstimator } from "../../adaptive";
import { IReadOnlyPlaybackObserver } from "../../api";
import { SegmentFetcherCreator } from "../../fetchers";
import {
  IBufferType,
  SegmentBuffer,
} from "../../segment_buffers";
import {
  IRepresentationsChoice,
  IRepresentationStreamCallbacks,
  IRepresentationStreamPlaybackObservation,
} from "../representation";

/** Callbacks called by the `AdaptationStream` on various events. */
export interface IAdaptationStreamCallbacks<T>
  extends Omit<IRepresentationStreamCallbacks<T>, "terminating">
{
  /** Called as new bitrate estimates are done. */
  bitrateEstimateChange(payload : IBitrateEstimateChangePayload) : void;
  /**
   * Called when a new `RepresentationStream` is created to load segments from a
   * `Representation`.
   */
  representationChange(payload : IRepresentationChangePayload) : void;
  /**
   * Callback called when a stream cannot go forward loading segments because it
   * needs the `MediaSource` to be reloaded first.
   */
  waitingMediaSourceReload(payload : IWaitingMediaSourceReloadPayload) : void;
  /**
   * Some situations might require the browser's buffers to be refreshed.
   * This callback is called when such situation arised.
   *
   * Generally flushing/refreshing low-level buffers can be performed simply by
   * performing a very small seek.
   */
  needsBufferFlush() : void;
}

/** Payload for the `bitrateEstimateChange` callback. */
export interface IBitrateEstimateChangePayload {
  /** The type of buffer for which the estimation is done. */
  type : IBufferType;
  /**
   * The bitrate estimate, in bits per seconds. `undefined` when no bitrate
   * estimate is currently available.
   */
  bitrate : number|undefined;
}

/** Payload for the `representationChange` callback. */
export interface IRepresentationChangePayload {
  /** The type of buffer linked to that `RepresentationStream`. */
  type : IBufferType;
  /** The `Period` linked to the `RepresentationStream` we're creating. */
  period : Period;
  /**
   * The `Representation` linked to the `RepresentationStream` we're creating.
   * `null` when we're choosing no Representation at all.
   */
  representation : Representation |
                   null;
}

/** Payload for the `waitingMediaSourceReload` callback. */
export interface IWaitingMediaSourceReloadPayload {
  /** Period concerned. */
  period : Period;
  /** Buffer type concerned. */
  bufferType : IBufferType;
  /**
   * The position in seconds and the time at which the MediaSource should be
   * reset once it has been reloaded.
   */
  position : number;
  /**
   * If `true`, we want the HTMLMediaElement to play right after the reload is
   * done.
   * If `false`, we want to stay in a paused state at that point.
   */
  autoPlay : boolean;
}

/** Regular playback information needed by the AdaptationStream. */
export interface IAdaptationStreamPlaybackObservation extends
  IRepresentationStreamPlaybackObservation {
    /**
     * For the current SegmentBuffer, difference in seconds between the next position
     * where no segment data is available and the current position.
     */
    bufferGap : number;
    /** `duration` property of the HTMLMediaElement on which the content plays. */
    duration : number;
    /**
     * Information on whether the media element was paused at the time of the
     * Observation.
     */
    paused : IPausedPlaybackObservation;
    /** Last "playback rate" asked by the user. */
    speed : number;
    /** Theoretical maximum position on the content that can currently be played. */
    maximumPosition : number;
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
  last : boolean;
  /**
   * Actually wanted paused state not yet reached.
   * This might for example be set to `false` when the content is currently
   * loading (and thus paused) but with autoPlay enabled.
   */
  pending : boolean | undefined;
}

/** Arguments given when creating a new `AdaptationStream`. */
export interface IAdaptationStreamArguments {
  /** Regularly emit playback conditions. */
  playbackObserver : IReadOnlyPlaybackObserver<IAdaptationStreamPlaybackObservation>;
  /** Content you want to create this Stream for. */
  content : { manifest : Manifest;
              period : Period;
              adaptation : Adaptation;
              representations : IReadOnlySharedReference<IRepresentationsChoice>; };
  options: IAdaptationStreamOptions;
  /** Estimate the right Representation to play. */
  representationEstimator : IRepresentationEstimator;
  /** SourceBuffer wrapper - needed to push media segments. */
  segmentBuffer : SegmentBuffer;
  /** Module used to fetch the wanted media segments. */
  segmentFetcherCreator : SegmentFetcherCreator;
  /**
   * "Buffer goal" wanted, or the ideal amount of time ahead of the current
   * position in the current SegmentBuffer. When this amount has been reached
   * this AdaptationStream won't try to download new segments.
   */
  wantedBufferAhead : IReadOnlySharedReference<number>;
  /**
   *  The buffer size limit in memory that we can reach for the video buffer.
   *
   *  Once reached, no segments will be loaded until it goes below that size
   *  again
   */
  maxVideoBufferSize : IReadOnlySharedReference<number>;
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
  drmSystemId : string | undefined;
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
  enableFastSwitching : boolean;
}

/** Object indicating a choice of Adaptation made by the user. */
export interface IAdaptationChoice {
  /** The Adaptation choosen. */
  adaptation : Adaptation;

  /** "Switching mode" in which the track switch should happen. */
  switchingMode : ITrackSwitchingMode;

  /**
   * Shared reference allowing to indicate which Representations from
   * that Adaptation are allowed.
   */
  representations : IReadOnlySharedReference<IRepresentationsChoice>;
}

export type ITrackSwitchingMode = IAudioTrackSwitchingMode |
                                  IVideoTrackSwitchingMode;
