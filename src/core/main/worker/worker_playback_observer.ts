// XXX TODO
import { generateReadOnlyObserver } from "../../../main_thread/api/playback_observer";
import type {
  IFreezingStatus,
  IReadOnlyPlaybackObserver,
  IRebufferingStatus,
} from "../../../main_thread/types";
import { WorkerMessageType } from "../../../multithread_types";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
import { IStreamOrchestratorPlaybackObservation } from "../../stream";
import sendMessage from "./send_message";

export type ICorePlaybackObservation = IStreamOrchestratorPlaybackObservation & {
  rebuffering: IRebufferingStatus | null;
  freezing: IFreezingStatus | null;
  bufferGap: number | undefined;
};

export default class WorkerPlaybackObserver implements IReadOnlyPlaybackObserver<
  ICorePlaybackObservation
> {
  private _src : IReadOnlySharedReference<ICorePlaybackObservation>;
  private _cancelSignal : CancellationSignal;
  private _contentId : string;

  constructor(
    src : IReadOnlySharedReference<ICorePlaybackObservation>,
    contentId : string,
    cancellationSignal : CancellationSignal
  ) {
    this._src = src;
    this._contentId = contentId;
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

  public getReference() : IReadOnlySharedReference<ICorePlaybackObservation> {
    return this._src;
  }

  public setPlaybackRate(playbackRate : number) : void {
    sendMessage({ type: WorkerMessageType.UpdatePlaybackRate,
                  contentId: this._contentId,
                  value: playbackRate });
  }

  public getPlaybackRate() : number | undefined {
    return undefined;
  }

  public listen(
    cb : (
      observation : ICorePlaybackObservation,
      stopListening : () => void
    ) => void,
    options? : { includeLastObservation? : boolean | undefined;
                 clearSignal? : CancellationSignal | undefined; }
  ) : void {
    if (this._cancelSignal.isCancelled() ||
        options?.clearSignal?.isCancelled() === true) {
      return ;
    }

    this._src.onUpdate(cb, {
      clearSignal: options?.clearSignal,
      emitCurrentValue: options?.includeLastObservation,
    });
  }

  public deriveReadOnlyObserver<TDest>(
    transform : (
      observationRef : IReadOnlySharedReference<ICorePlaybackObservation>,
      cancellationSignal : CancellationSignal
    ) => IReadOnlySharedReference<TDest>
  ) : IReadOnlyPlaybackObserver<TDest> {
    return generateReadOnlyObserver(this, transform, this._cancelSignal);
  }
}
