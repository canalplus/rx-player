import log from "../../log";
import { IMainThreadMessage } from "../../multithread_types";

export default function sendMessage(
  worker : Worker,
  msg : IMainThreadMessage,
  transferables? : Transferable[]
) : void {
  log.debug("---> Sending to Worker:", msg.type);
  if (transferables === undefined) {
    worker.postMessage(msg);
  } else {
    worker.postMessage(msg, transferables);
  }
}
