import type { IUpdatePlaybackRateWorkerMessage } from "../multithread_types";
import { WorkerMessageType } from "../multithread_types";
import type { ITrackType } from "../public_types";
import type { IRange } from "../utils/ranges";
import type { IReadOnlySharedReference } from "../utils/reference";
import type { CancellationSignal } from "../utils/task_canceller";
import type {
  IFreezingStatus,
  IReadOnlyPlaybackObserver,
  IRebufferingStatus,
} from "./types";
import generateReadOnlyObserver from "./utils/generate_read_only_observer";
import type ObservationPosition from "./utils/observation_position";

export interface IWorkerPlaybackObservation {
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
  rebuffering: IRebufferingStatus | null;
  freezing: IFreezingStatus | null;
  bufferGap: number | undefined;
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

export default class WorkerPlaybackObserver
  implements IReadOnlyPlaybackObserver<IWorkerPlaybackObservation>
{
  private _src: IReadOnlySharedReference<IWorkerPlaybackObservation>;
  private _cancelSignal: CancellationSignal;
  private _messageSender: (msg: IUpdatePlaybackRateWorkerMessage) => void;
  private _contentId: string;

  constructor(
    src: IReadOnlySharedReference<IWorkerPlaybackObservation>,
    contentId: string,
    sendMessage: (msg: IUpdatePlaybackRateWorkerMessage) => void,
    cancellationSignal: CancellationSignal,
  ) {
    this._src = src;
    this._contentId = contentId;
    this._messageSender = sendMessage;
    this._cancelSignal = cancellationSignal;
  }

  public getCurrentTime(): number | undefined {
    return undefined;
  }

  public getReadyState(): number | undefined {
    return undefined;
  }

  public getIsPaused(): boolean | undefined {
    return undefined;
  }

  public getReference(): IReadOnlySharedReference<IWorkerPlaybackObservation> {
    return this._src;
  }

  public setPlaybackRate(playbackRate: number): void {
    this._messageSender({
      type: WorkerMessageType.UpdatePlaybackRate,
      contentId: this._contentId,
      value: playbackRate,
    });
  }

  public getPlaybackRate(): number | undefined {
    return undefined;
  }

  public listen(
    cb: (observation: IWorkerPlaybackObservation, stopListening: () => void) => void,
    options?: {
      includeLastObservation?: boolean | undefined;
      clearSignal?: CancellationSignal | undefined;
    },
  ): void {
    if (
      this._cancelSignal.isCancelled() ||
      options?.clearSignal?.isCancelled() === true
    ) {
      return;
    }

    this._src.onUpdate(cb, {
      clearSignal: options?.clearSignal,
      emitCurrentValue: options?.includeLastObservation,
    });
  }

  public deriveReadOnlyObserver<TDest>(
    transform: (
      observationRef: IReadOnlySharedReference<IWorkerPlaybackObservation>,
      cancellationSignal: CancellationSignal,
    ) => IReadOnlySharedReference<TDest>,
  ): IReadOnlyPlaybackObserver<TDest> {
    return generateReadOnlyObserver(this, transform, this._cancelSignal);
  }
}
