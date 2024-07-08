import { formatError } from "../../../errors";
import log from "../../../log";
import type { ISentError, IWorkerMessage } from "../../../multithread_types";

export default function sendMessage(
  msg: IWorkerMessage,
  transferables?: Transferable[],
): void {
  log.debug("<--- Sending to Main:", msg.type);
  if (transferables === undefined) {
    postMessage(msg);
  } else {
    // TypeScript made a mistake here, and 2busy2fix
    /* eslint-disable-next-line */
    (postMessage as any)(msg, transferables);
  }
}

export function formatErrorForSender(error: unknown): ISentError {
  const formattedError = formatError(error, {
    defaultCode: "NONE",
    defaultReason: "An unknown error stopped content playback.",
  });

  return formattedError.serialize();
}
