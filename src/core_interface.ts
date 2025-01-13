import type { IMessageReceiverCallback } from "./core/main/worker/worker_main";
import log from "./log";
import type { IMainThreadMessage, IWorkerMessage } from "./multithread_types";
import noop from "./utils/noop";

export default abstract class CoreInterface {
  protected listeners: Array<(evt: IWorkerMessage) => void> = [];
  protected listenersError: Array<() => void> = [];

  public abstract sendMessage(msg: IMainThreadMessage): void;

  public addMessageListener(cb: (evt: IWorkerMessage) => void): void {
    this.listeners.push(cb);
  }

  public removeMessageListener(cb: (evt: IWorkerMessage) => void): void {
    const index = this.listeners.indexOf(cb);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  public addErrorListener(cb: () => void): void {
    this.listenersError.push(cb);
  }

  public removeErrorListener(cb: () => void): void {
    const index = this.listenersError.indexOf(cb);
    if (index >= 0) {
      this.listenersError.splice(index, 1);
    }
  }

  public dispose(): void {
    this.listeners.length = 0;
    this.listenersError.length = 0;
  }
}

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
    sendCoreMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void;
  } {
    const setCoreMessageReceiver = (handler: IMessageReceiverCallback): void => {
      this._currentCoreListener = handler;
    };
    const sendCoreMessage = (msg: IWorkerMessage, _transferables?: Transferable[]) => {
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

/**
 * `CoreInterface` implementation for when the core will run in a WebWorker.
 */
export class WorkerCoreInterface extends CoreInterface {
  private _worker: Worker;

  /**
   * Initialize a `WorkerCoreInterface` for the given `WebWorker` instance.
   *
   * The `addMessageListener` and `addMessageListener` will then register
   * listeners respectively for the `onmessage` and `onmessageerror` events
   * from this `WebWorker`.
   * The `sendMessage` method will allow to send messages to the `WebWorker`.
   * @param {Worker} worker
   */
  constructor(worker: Worker) {
    super();
    this._worker = worker;
    this._worker.onmessageerror = () => {
      this.listenersError.forEach((listener) => {
        listener();
      });
    };
    this._worker.onmessage = (evt) => {
      this.listeners.forEach((listener) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        listener(evt.data);
      });
    };
  }

  /**
   * Send given message to the `WebWorker`.
   * @param {Object} msg
   * @param {Array.<Object>} [transferables]
   */
  public sendMessage(msg: IMainThreadMessage, transferables?: Transferable[]): void {
    log.debug("---> Sending to Worker:", msg.type);
    if (transferables === undefined) {
      this._worker.postMessage(msg);
    } else {
      this._worker.postMessage(msg, transferables);
    }
  }
}
