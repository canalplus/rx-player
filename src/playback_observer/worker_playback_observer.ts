import type { IUpdatePlaybackRateWorkerMessage } from "../multithread_types";
import { WorkerMessageType } from "../multithread_types";
import type { IReadOnlySharedReference } from "../utils/reference";
import type { CancellationSignal } from "../utils/task_canceller";
import type { ICorePlaybackObservation, IReadOnlyPlaybackObserver } from "./types";
import generateReadOnlyObserver from "./utils/generate_read_only_observer";

export default class WorkerPlaybackObserver
  implements IReadOnlyPlaybackObserver<ICorePlaybackObservation>
{
  private _src: IReadOnlySharedReference<ICorePlaybackObservation>;
  private _cancelSignal: CancellationSignal;
  private _messageSender: (msg: IUpdatePlaybackRateWorkerMessage) => void;
  private _contentId: string;

  constructor(
    src: IReadOnlySharedReference<ICorePlaybackObservation>,
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

  public getReference(): IReadOnlySharedReference<ICorePlaybackObservation> {
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
    cb: (observation: ICorePlaybackObservation, stopListening: () => void) => void,
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
      observationRef: IReadOnlySharedReference<ICorePlaybackObservation>,
      cancellationSignal: CancellationSignal,
    ) => IReadOnlySharedReference<TDest>,
  ): IReadOnlyPlaybackObserver<TDest> {
    return generateReadOnlyObserver(this, transform, this._cancelSignal);
  }
}
