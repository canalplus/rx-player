import log from "../../log";
import type { ITextDisplayerData } from "../../main_thread/types";
import type { IRange } from "../../utils/ranges";
import { CancellationError } from "../../utils/task_canceller";
import type { ITextDisplayerInterface } from "../segment_sinks";
import type {
  IPushTextDataCoreMessage,
  IRemoveTextDataCoreMessage,
  IResetTextDisplayerCoreMessage,
  IStopTextDisplayerCoreMessage,
} from "../types";
import { CoreMessageType } from "../types";

/**
 * Implementation of an `ITextDisplayerInterface` for the Core, that can run in
 * a WebWorker (so, in a different thread than the `ITextDisplayer`).
 *
 * @class CoreTextDisplayerInterface
 */
export default class CoreTextDisplayerInterface implements ITextDisplayerInterface {
  private _contentId: string;
  private _messageSender: (msg: ICoreTextDisplayerInterfaceMessage) => void;
  public _queues: {
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
    contentId: string,
    messageSender: (msg: ICoreTextDisplayerInterfaceMessage) => void,
  ) {
    this._contentId = contentId;
    this._messageSender = messageSender;
    this._queues = { pushTextData: [], remove: [] };
  }

  /**
   * @see ITextDisplayerInterface
   */
  public pushTextData(infos: ITextDisplayerData): Promise<IRange[]> {
    return new Promise((resolve, reject) => {
      this._messageSender({
        type: CoreMessageType.PushTextData,
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
        type: CoreMessageType.RemoveTextData,
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
      type: CoreMessageType.ResetTextDisplayer,
      contentId: this._contentId,
      value: null,
    });
    this._resetCurrentQueue("WorkerTextDisplayerInterface reset");
  }

  /**
   * @see ITextDisplayerInterface
   */
  public stop(reason: string | undefined): void {
    this._messageSender({
      type: CoreMessageType.StopTextDisplayer,
      contentId: this._contentId,
      value: null,
    });
    this._resetCurrentQueue(reason);
  }

  private _resetCurrentQueue(reason: string | undefined): void {
    const error = new CancellationError(
      "WorkerTextDisplayerInterface queue",
      reason ?? "reset",
    );
    this._queues.pushTextData.forEach((elt) => {
      elt.reject(error);
    });
    this._queues.remove.forEach((elt) => {
      elt.reject(error);
    });
  }

  /**
   * @param {Array.<Object>} ranges
   */
  public onPushedTrackSuccess(ranges: IRange[]): void {
    const element = this._queues.pushTextData.shift();
    if (element === undefined) {
      log.error("text", "pushTextData success for inexistant operation");
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
      log.error("text", "pushTextData error for inexistant operation");
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
      log.error("text", "remove success for inexistant operation");
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
      log.error("text", "pushTextData error for inexistant operation");
      return;
    }
    element.reject(err);
  }
}

type ICoreTextDisplayerInterfaceMessage =
  | IPushTextDataCoreMessage
  | IRemoveTextDataCoreMessage
  | IStopTextDisplayerCoreMessage
  | IResetTextDisplayerCoreMessage;
