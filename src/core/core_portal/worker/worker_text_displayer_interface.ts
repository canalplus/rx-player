import log from "../../../log";
import type { ITextDisplayerData } from "../../../main_thread/types";
import {
  IRemoveTextDataWorkerMessage,
  IStopTextDisplayerWorkerMessage,
  IResetTextDisplayerWorkerMessage,
  WorkerMessageType,
  IPushTextDataWorkerMessage,
} from "../../../multithread_types";
import type { IRange } from "../../../utils/ranges";
import { CancellationError } from "../../../utils/task_canceller";
import type { ITextDisplayerInterface } from "../../segment_sinks";

/**
 * Implementation of an `ITextDisplayerInterface` running in a WebWorker
 * (so, in a different thread than the `ITextDisplayer`).
 *
 * @class WorkerTextDisplayerInterface
 */
export default class WorkerTextDisplayerInterface implements ITextDisplayerInterface {
  private _contentId : string;
  private _messageSender : (msg: IWorkerTextDisplayerInterfaceMessage) => void;
  public _queues : {
    pushTextData: Array<{
      resolve: (ranges: IRange[]) => void;
      reject: (err: unknown) => void;
    }>;
    remove: Array<{
      resolve: (ranges: IRange[]) => void;
      reject: (err: unknown) => void;
    }>;
  };

  /**
   * @param {string} contentId
   * @param {Object} messageSender
   */
  constructor(
    contentId : string,
    messageSender : (msg: IWorkerTextDisplayerInterfaceMessage) => void
  ) {
    this._contentId = contentId;
    this._messageSender = messageSender;
    this._queues = { pushTextData: [],
                     remove: [] };
  }

  /**
   * @see ITextDisplayerInterface
   */
  public pushTextData(infos: ITextDisplayerData): Promise<IRange[]> {
    return new Promise((resolve, reject) => {
      this._messageSender({
        type: WorkerMessageType.PushTextData,
        contentId: this._contentId,
        value: infos,
      });
      this._queues.pushTextData.push({ resolve, reject });
    });
  }

  /**
   * @see ITextDisplayerInterface
   */
  public remove(start: number, end: number): Promise<IRange[]> {
    return new Promise((resolve, reject) => {
      this._messageSender({
        type: WorkerMessageType.RemoveTextData,
        contentId: this._contentId,
        value: { start, end },
      });
      this._queues.remove.push({ resolve, reject });
    });
  }

  /**
   * @see ITextDisplayerInterface
   */
  public reset(): void {
    this._messageSender({
      type: WorkerMessageType.ResetTextDisplayer,
      contentId: this._contentId,
      value: null,
    });
    this._resetCurrentQueue();
  }

  /**
   * @see ITextDisplayerInterface
   */
  public stop(): void {
    this._messageSender({
      type: WorkerMessageType.StopTextDisplayer,
      contentId: this._contentId,
      value: null,
    });
    this._resetCurrentQueue();
  }

  private _resetCurrentQueue(): void {
    const error = new CancellationError();
    this._queues.pushTextData.forEach(elt => {
      elt.reject(error);
    });
    this._queues.remove.forEach(elt => {
      elt.reject(error);
    });
  }

  /**
   * @param {Array.<Object>} ranges
   */
  public onPushedTrackSuccess(ranges: IRange[]): void {
    const element = this._queues.pushTextData.shift();
    if (element === undefined) {
      log.error("WMS: pushTextData success for inexistant operation");
      return;
    }
    element.resolve(ranges);
  }

  /**
   * @param {unknown} err
   */
  public onPushedTrackError(err: Error): void {
    const element = this._queues.pushTextData.shift();
    if (element === undefined) {
      log.error("WMS: pushTextData error for inexistant operation");
      return;
    }
    element.reject(err);
  }

  /**
   * @param {Array.<Object>} ranges
   */
  public onRemoveSuccess(ranges: IRange[]): void {
    const element = this._queues.remove.shift();
    if (element === undefined) {
      log.error("WMS: remove success for inexistant operation");
      return;
    }
    element.resolve(ranges);
  }

  /**
   * @param {unknown} err
   */
  public onRemoveError(err: Error): void {
    const element = this._queues.pushTextData.shift();
    if (element === undefined) {
      log.error("WMS: pushTextData error for inexistant operation");
      return;
    }
    element.reject(err);
  }
}

type IWorkerTextDisplayerInterfaceMessage = IPushTextDataWorkerMessage |
                                            IRemoveTextDataWorkerMessage |
                                            IStopTextDisplayerWorkerMessage |
                                            IResetTextDisplayerWorkerMessage;
