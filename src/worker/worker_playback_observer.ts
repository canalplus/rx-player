import { IReadOnlySharedReference } from "../common/utils/reference";
import { CancellationSignal } from "../common/utils/task_canceller";
import { IWorkerPlaybackObservation } from "../main";

// XXX TODO better import
import { generateReadOnlyObserver } from "../main/core/api/playback_observer";
import { IReadOnlyPlaybackObserver } from "./core/api";

export default class WorkerPlaybackObserver implements IReadOnlyPlaybackObserver<
  IWorkerPlaybackObservation
> {
  private _src : IReadOnlySharedReference<IWorkerPlaybackObservation>;
  private _cancelSignal : CancellationSignal;

  constructor(
    src : IReadOnlySharedReference<IWorkerPlaybackObservation>,
    cancellationSignal : CancellationSignal
  ) {
    this._src = src;
    this._cancelSignal = cancellationSignal;
  }

  public getCurrentTime() : number {
    // XXX TODO probably should be async or removed
    return this._src.getValue().position.last;
  }

  public getReadyState() : number {
    // XXX TODO probably should be async or removed
    return this._src.getValue().readyState;
  }

  public getIsPaused() : boolean {
    // XXX TODO probably should be async or removed
    return this._src.getValue().paused.last;
  }

  public getReference() : IReadOnlySharedReference<IWorkerPlaybackObservation> {
    return this._src;
  }

  public listen(
    cb : (observation : IWorkerPlaybackObservation) => void,
    options? : { includeLastObservation? : boolean | undefined;
                 clearSignal? : CancellationSignal | undefined; }
  ) : void {
    if (this._cancelSignal.isCancelled || options?.clearSignal?.isCancelled === true) {
      return ;
    }
    this._src.onUpdate(cb, {
      clearSignal: options?.clearSignal,
      emitCurrentValue: options?.includeLastObservation,
    });
  }

  public deriveReadOnlyObserver<TDest>(
    transform : (
      observationRef : IReadOnlySharedReference<IWorkerPlaybackObservation>,
      cancellationSignal : CancellationSignal
    ) => IReadOnlySharedReference<TDest>
  ) : IReadOnlyPlaybackObserver<TDest> {
    return generateReadOnlyObserver(this, transform, this._cancelSignal);
  }
}
