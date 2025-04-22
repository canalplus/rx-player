import log from "../../log";
import type { IMainThreadMessage } from "../../multithread_types";

export default function sendMessage(
  worker: Worker,
  msg: IMainThreadMessage,
  transferables?: Transferable[],
): void {
  log.debug("M-->C", "Sending message", { name: msg.type });
  if (transferables === undefined) {
    worker.postMessage(msg);
  } else {
    worker.postMessage(msg, transferables);
  }
}
