import {
  CoreMessageType,
  type ICoreMessage,
  type IMessageReceiverCallback,
} from "../../core/types.ts";
import log from "../../log.ts";
import noop from "../../utils/noop.ts";
import queueMicrotaskUtil from "../../utils/queue_microtask.ts";
import type { IMainThreadMessage } from "../types.ts";
import CoreInterface from "./base.ts";

export class MonoThreadCoreInterface extends CoreInterface {
  private _currentCoreListener: IMessageReceiverCallback;

  constructor() {
    super();
    this._currentCoreListener = noop;
  }

  public sendMessage(msg: IMainThreadMessage) {
    log.debug("M-->C", "Sending message", { name: msg.type });
    queueMicrotaskUtil(() => {
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
      queueMicrotaskUtil(() => {
        if (msg.type !== CoreMessageType.LogMessage) {
          log.debug("M<--C", "Sending message", { name: msg.type });
        }
        this.listeners.forEach((listener) => {
          listener(msg);
        });
      });
    };
    return { setCoreMessageReceiver, sendCoreMessage };
  }
}
