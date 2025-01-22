import type { ICoreMessage } from "../../core/types";
import type { IMainThreadMessage } from "../types";

export default abstract class CoreInterface {
  protected listeners: Array<(evt: ICoreMessage) => void> = [];
  protected listenersError: Array<() => void> = [];

  public abstract sendMessage(msg: IMainThreadMessage): void;

  public addMessageListener(cb: (evt: ICoreMessage) => void): void {
    this.listeners.push(cb);
  }

  public removeMessageListener(cb: (evt: ICoreMessage) => void): void {
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
