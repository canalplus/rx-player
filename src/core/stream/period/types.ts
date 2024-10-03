import type { IManifest, IAdaptation, IPeriod } from "../../../manifest";
import type {
  ObservationPosition,
  IReadOnlyPlaybackObserver,
} from "../../../playback_observer";
import type { ITrackType } from "../../../public_types";
import type { IRange } from "../../../utils/ranges";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import type SharedReference from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
import type WeakMapMemory from "../../../utils/weak_map_memory";
import type { IRepresentationEstimator } from "../../adaptive";
import type { SegmentQueueCreator } from "../../fetchers";
import type { IBufferType, SegmentSink } from "../../segment_sinks";
import type SegmentSinksStore from "../../segment_sinks";
import type {
  IAdaptationChoice,
  IAdaptationStreamCallbacks,
  IAdaptationStreamOptions,
} from "../adaptation";
import type { IPausedPlaybackObservation } from "../representation";

export type { IPausedPlaybackObservation };

/** Callbacks called by the `AdaptationStream` on various events. */
export interface IPeriodStreamCallbacks extends IAdaptationStreamCallbacks {
  /**
   * Called when a new `PeriodStream` is ready to start but needs an Adaptation
   * (i.e. track) to be chosen first.
   */
  periodStreamReady(payload: IPeriodStreamReadyPayload): void;
  /**
   * Called when a new `AdaptationStream` is created to load segments from an
   * `Adaptation`.
   */
  adaptationChange(payload: IAdaptationChangePayload): void;
}

/** Payload for the `adaptationChange` callback. */
export interface IAdaptationChangePayload {
  /** The type of buffer for which the Representation is changing. */
  type: IBufferType;
  /** The `Period` linked to the `RepresentationStream` we're creating. */
  period: IPeriod;
  /**
   * The `Adaptation` linked to the `AdaptationStream` we're creating.
   * `null` when we're choosing no Adaptation at all.
   */
  adaptation: IAdaptation | null;
}

/** Payload for the `periodStreamReady` callback. */
export interface IPeriodStreamReadyPayload {
  /** The type of buffer linked to the `PeriodStream` we want to create. */
  type: IBufferType;
  /** The `Manifest` linked to the `PeriodStream` we have created. */
  manifest: IManifest;
  /** The `Period` linked to the `PeriodStream` we have created. */
  period: IPeriod;
  /**
   * The reference through which any Adaptation (i.e. track) choice should be
   * emitted for that `PeriodStream`.
   *
   * The `PeriodStream` will not do anything until this Reference has emitted
   * at least one to give its initial choice.
   * You can send `null` through it to tell this `PeriodStream` that you don't
   * want any `Adaptation` for now.
   * It is set to `undefined` by default, you SHOULD NOT set it to `undefined`
   * yourself.
   */
  adaptationRef: SharedReference<IAdaptationChoice | null | undefined>;
}

/** Playback observation required by the `PeriodStream`. */
export interface IPeriodStreamPlaybackObservation {
  /**
   * Information on whether the media element was paused at the time of the
   * Observation.
   */
  paused: IPausedPlaybackObservation;
  /**
   * Information on the current media position in seconds at the time of the
   * Observation.
   */
  position: ObservationPosition;
  /** `duration` property of the HTMLMediaElement. */
  duration: number;
  /** `readyState` property of the HTMLMediaElement. */
  readyState: number;
  /** Target playback rate at which we want to play the content. */
  speed: number;
  /** Theoretical maximum position on the content that can currently be played. */
  maximumPosition: number;
  /**
   * Ranges of buffered data per type of media.
   * `null` if no buffer exists for that type of media.
   */
  buffered: Record<ITrackType, IRange[] | null>;
  /**
   * Indicates whether the user agent believes it has enough buffered data to ensure
   * uninterrupted playback for a meaningful period or needs more data.
   * It also reflects whether the user agent can retrieve and buffer data in an
   * energy-efficient manner while maintaining the desired memory usage.
   * The value can be `undefined` if the user agent does not provide this indicator.
   * `true` indicates that the buffer is low, and more data should be buffered.
   * `false` indicates that there is enough buffered data, and no additional data needs
   *  to be buffered at this time.
   */
  canStream: boolean | undefined;
}

/** Arguments required by the `PeriodStream`. */
export interface IPeriodStreamArguments {
  bufferType: IBufferType;
  content: { manifest: IManifest; period: IPeriod };
  garbageCollectors: WeakMapMemory<
    SegmentSink,
    (cancelSignal: CancellationSignal) => void
  >;
  segmentQueueCreator: SegmentQueueCreator;
  segmentSinksStore: SegmentSinksStore;
  playbackObserver: IReadOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>;
  options: IPeriodStreamOptions;
  representationEstimator: IRepresentationEstimator;
  wantedBufferAhead: IReadOnlySharedReference<number>;
  maxVideoBufferSize: IReadOnlySharedReference<number>;
}

/** Options tweaking the behavior of the PeriodStream. */
export type IPeriodStreamOptions = IAdaptationStreamOptions & {
  /** Behavior when a new video and/or audio codec is encountered. */
  onCodecSwitch: "continue" | "reload";
};

export type { IAudioTrackSwitchingMode } from "../../../public_types";
