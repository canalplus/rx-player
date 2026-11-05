import type { IManifest, IAdaptation, IPeriod } from "../../../manifest/index.ts";
import type {
  ObservationPosition,
  IReadOnlyPlaybackObserver,
} from "../../../playback_observer/index.ts";
import type { ITrackType } from "../../../public_types.ts";
import type { IRange } from "../../../utils/ranges.ts";
import type { IReadOnlySharedReference } from "../../../utils/reference.ts";
import type SharedReference from "../../../utils/reference.ts";
import type { CancellationSignal } from "../../../utils/task_canceller.ts";
import type WeakMapMemory from "../../../utils/weak_map_memory.ts";
import type { IRepresentationEstimator } from "../../adaptive/index.ts";
import type { SegmentQueueCreator } from "../../fetchers/index.ts";
import type { IBufferType, SegmentSink } from "../../segment_sinks/index.ts";
import type SegmentSinksStore from "../../segment_sinks/index.ts";
import type {
  IAdaptationChoice,
  IRepresentationSelectorCallbacks,
  IRepresentationSelectorOptions,
} from "../3-Representation_selection/index.ts";
import type { IPausedPlaybackObservation } from "../4-Segment_selection/index.ts";

export type { IPausedPlaybackObservation };

/** Callbacks called by the `RepresentationSelector` on various events. */
export interface ITrackSelectorStreamCallbacks extends IRepresentationSelectorCallbacks {
  /**
   * Called when a new `TrackSelectorStream` is ready to start but needs an Adaptation
   * (i.e. track) to be chosen first.
   */
  streamReady(payload: IStreamReadyPayload): void;
  /**
   * Called when a new `RepresentationSelector` is created to load segments from an
   * `Adaptation`.
   */
  adaptationChange(payload: IAdaptationChangePayload): void;
}

/** Payload for the `adaptationChange` callback. */
export interface IAdaptationChangePayload {
  /** The type of buffer for which the Representation is changing. */
  type: IBufferType;
  /** The `Period` linked to the `SegmentSelector` we're creating. */
  period: IPeriod;
  /**
   * The `Adaptation` linked to the `RepresentationSelector` we're creating.
   * `null` when we're choosing no Adaptation at all.
   */
  adaptation: IAdaptation | null;
}

/** Payload for the `streamReady` callback. */
export interface IStreamReadyPayload {
  /** The type of buffer linked to the `TrackSelectorStream` we want to create. */
  type: IBufferType;
  /** The `Manifest` linked to the `TrackSelectorStream` we have created. */
  manifest: IManifest;
  /** The `Period` linked to the `TrackSelectorStream` we have created. */
  period: IPeriod;
  /**
   * The reference through which any Adaptation (i.e. track) choice should be
   * emitted for that `TrackSelectorStream`.
   *
   * The `TrackSelectorStream` will not do anything until this Reference has emitted
   * at least one to give its initial choice.
   * You can send `null` through it to tell this `TrackSelectorStream` that you don't
   * want any `Adaptation` for now.
   * It is set to `undefined` by default, you SHOULD NOT set it to `undefined`
   * yourself.
   */
  adaptationRef: SharedReference<IAdaptationChoice | null | undefined>;
}

/** Playback observation required by the `TrackSelectorStream`. */
export interface ITrackSelectorStreamPlaybackObservation {
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
   * `true` indicates that the buffer is low, and more data should be buffered.
   * `false` indicates that there is enough buffered data, and no additional data needs
   *  to be buffered at this time.
   */
  canStream: boolean;
}

/** Arguments required by the `TrackSelectorStream`. */
export interface ITrackSelectorStreamArguments {
  bufferType: IBufferType;
  content: { manifest: IManifest; period: IPeriod };
  garbageCollectors: WeakMapMemory<
    SegmentSink,
    (cancelSignal: CancellationSignal) => void
  >;
  segmentQueueCreator: SegmentQueueCreator;
  segmentSinksStore: SegmentSinksStore;
  playbackObserver: IReadOnlyPlaybackObserver<ITrackSelectorStreamPlaybackObservation>;
  options: ITrackSelectorStreamOptions;
  representationEstimator: IRepresentationEstimator;
  wantedBufferAhead: IReadOnlySharedReference<number>;
  maxVideoBufferSize: IReadOnlySharedReference<number>;
}

/** Options tweaking the behavior of the TrackSelectorStream. */
export type ITrackSelectorStreamOptions = IRepresentationSelectorOptions & {
  /** Behavior when a new video and/or audio codec is encountered. */
  onCodecSwitch: "continue" | "reload";
};

export type { IAudioTrackSwitchingMode } from "../../../public_types.ts";
