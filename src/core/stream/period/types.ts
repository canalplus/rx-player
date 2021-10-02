import Manifest, {
  Adaptation,
  Period,
} from "../../../manifest";
import { IReadOnlySharedReference, ISharedReference } from "../../../utils/reference";
import { CancellationSignal } from "../../../utils/task_canceller";
import WeakMapMemory from "../../../utils/weak_map_memory";
import { IRepresentationEstimator } from "../../adaptive";
import { IReadOnlyPlaybackObserver } from "../../api";
import { SegmentFetcherCreator } from "../../fetchers";
import SegmentBuffersStore, {
  IBufferType,
  ITextTrackSegmentBufferOptions,
  SegmentBuffer,
} from "../../segment_buffers";
import {
  IAdaptationChoice,
  IAdaptationStreamCallbacks,
  IAdaptationStreamOptions,
  IPausedPlaybackObservation,
} from "../adaptation";
import { IPositionPlaybackObservation } from "../representation";

/** Callbacks called by the `AdaptationStream` on various events. */
export interface IPeriodStreamCallbacks extends
  IAdaptationStreamCallbacks<unknown>
{
  /**
   * Called when a new `PeriodStream` is ready to start but needs an Adaptation
   * (i.e. track) to be chosen first.
   */
  periodStreamReady(payload : IPeriodStreamReadyPayload) : void;
  /**
   * Called when a new `AdaptationStream` is created to load segments from an
   * `Adaptation`.
   */
  adaptationChange(payload : IAdaptationChangePayload) : void;
}

/** Payload for the `adaptationChange` callback. */
export interface IAdaptationChangePayload {
  /** The type of buffer for which the Representation is changing. */
  type : IBufferType;
  /** The `Period` linked to the `RepresentationStream` we're creating. */
  period : Period;
  /**
   * The `Adaptation` linked to the `AdaptationStream` we're creating.
   * `null` when we're choosing no Adaptation at all.
   */
  adaptation : Adaptation |
               null;
}

/** Payload for the `periodStreamReady` callback. */
export interface IPeriodStreamReadyPayload {
  /** The type of buffer linked to the `PeriodStream` we want to create. */
  type : IBufferType;
  /** The `Manifest` linked to the `PeriodStream` we have created. */
  manifest : Manifest;
  /** The `Period` linked to the `PeriodStream` we have created. */
  period : Period;
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
  adaptationRef : ISharedReference<IAdaptationChoice|null|undefined>;
}

/** Playback observation required by the `PeriodStream`. */
export interface IPeriodStreamPlaybackObservation {
  /**
   * Information on whether the media element was paused at the time of the
   * Observation.
   */
  paused : IPausedPlaybackObservation;
  /**
   * Information on the current media position in seconds at the time of the
   * Observation.
   */
  position : IPositionPlaybackObservation;
  /** `duration` property of the HTMLMediaElement. */
  duration : number;
  /** `readyState` property of the HTMLMediaElement. */
  readyState : number;
  /** Target playback rate at which we want to play the content. */
  speed : number;
  /** Theoretical maximum position on the content that can currently be played. */
  maximumPosition : number;
}

/** Arguments required by the `PeriodStream`. */
export interface IPeriodStreamArguments {
  bufferType : IBufferType;
  content : { manifest : Manifest;
              period : Period; };
  garbageCollectors : WeakMapMemory<SegmentBuffer,
                                    (cancelSignal : CancellationSignal) => void>;
  segmentFetcherCreator : SegmentFetcherCreator;
  segmentBuffersStore : SegmentBuffersStore;
  playbackObserver : IReadOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>;
  options: IPeriodStreamOptions;
  representationEstimator : IRepresentationEstimator;
  wantedBufferAhead : IReadOnlySharedReference<number>;
  maxVideoBufferSize : IReadOnlySharedReference<number>;
}

/** Options tweaking the behavior of the PeriodStream. */
export type IPeriodStreamOptions =
  IAdaptationStreamOptions &
  {
    /** Behavior when a new video and/or audio codec is encountered. */
    onCodecSwitch : "continue" | "reload";
    /** Options specific to the text SegmentBuffer. */
    textTrackOptions? : ITextTrackSegmentBufferOptions;
  };

export { IAudioTrackSwitchingMode } from "../../../public_types";
