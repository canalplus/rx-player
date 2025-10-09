import type { IMessageReceiverCallback } from "../../core/types";
import log from "../../log";
import type { IMainThreadMessage, IWorkerMessage } from "../../multithread_types";
import noop from "../../utils/noop";
import CoreInterface from "./base";

export class MonoThreadCoreInterface extends CoreInterface {
  private _currentCoreListener: IMessageReceiverCallback;

  constructor() {
    super();
    this._currentCoreListener = noop;
  }

  public sendMessage(msg: IMainThreadMessage) {
    log.debug("M-->C", "Sending message", { name: msg.type });
    queueMicrotask(() => {
      // NOTE: We don't clone for performance reasons
      this._currentCoreListener({ data: msg });
    });
  }

  public getCallbacks(): {
    setCoreMessageReceiver: (handler: IMessageReceiverCallback) => void;
    sendCoreMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void;
  } {
    const setCoreMessageReceiver = (handler: IMessageReceiverCallback): void => {
      this._currentCoreListener = handler;
    };
    const sendCoreMessage = (msg: IWorkerMessage, _transferables?: Transferable[]) => {
      queueMicrotask(() => {
        log.debug("M<--C", "Sending message", { name: msg.type });
        this.listeners.forEach((listener) => {
          listener(msg);
        });
      });
    };
    return { setCoreMessageReceiver, sendCoreMessage };
  }
}
