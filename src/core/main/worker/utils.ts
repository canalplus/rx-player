import { formatError } from "../../../errors";
import type { ISentError } from "../../../multithread_types";

export function formatErrorForSender(error: unknown): ISentError {
  const formattedError = formatError(error, {
    defaultCode: "NONE",
    defaultReason: "An unknown error stopped content playback.",
  });

  return formattedError.serialize();
}
