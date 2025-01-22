import type { IMainThreadMessage, IWorkerMessage } from "../../multithread_types";

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
