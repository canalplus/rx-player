import log from "../../log.ts";
import type { IMainThreadMessage } from "../types.ts";
import CoreInterface from "./base.ts";

/**
 * `CoreInterface` implementation for when the core will run in a WebWorker.
 */
export class WorkerCoreInterface extends CoreInterface {
  private _worker: Worker;

  /**
   * Initialize a `WorkerCoreInterface` for the given `WebWorker` instance.
   *
   * The `addMessageListener` and `addErrorListener` methods will then register
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
    log.debug("M-->C", "Sending message to worker", { name: msg.type });
    if (transferables === undefined) {
      this._worker.postMessage(msg);
    } else {
      this._worker.postMessage(msg, transferables);
    }
  }
}
