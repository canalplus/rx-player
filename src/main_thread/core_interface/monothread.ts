import type { ICoreMessage, IMessageReceiverCallback } from "../../core/types";
import log from "../../log";
import noop from "../../utils/noop";
import type { IMainThreadMessage } from "../types";
import CoreInterface from "./base";

export class MonoThreadCoreInterface extends CoreInterface {
  private _currentCoreListener: IMessageReceiverCallback;

  constructor() {
    super();
    this._currentCoreListener = noop;
  }

  public sendMessage(msg: IMainThreadMessage) {
    log.debug("---> Sending to Core:", msg.type);
    queueMicrotask(() => {
      // NOTE: We don't clone for performance reasons
      this._currentCoreListener({ data: msg });
    });
  }

  public getCallbacks(): {
    setCoreMessageReceiver: (handler: IMessageReceiverCallback) => void;
    sendCoreMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void;
  } {
    const setCoreMessageReceiver = (handler: IMessageReceiverCallback): void => {
      this._currentCoreListener = handler;
    };
    const sendCoreMessage = (msg: ICoreMessage, _transferables?: Transferable[]) => {
      queueMicrotask(() => {
        log.debug("<--- Receiving from Core:", msg.type);
        this.listeners.forEach((listener) => {
          listener(msg);
        });
      });
    };
    return { setCoreMessageReceiver, sendCoreMessage };
  }
}
