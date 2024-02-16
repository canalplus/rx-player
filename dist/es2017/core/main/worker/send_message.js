import { formatError } from "../../../errors";
import log from "../../../log";
export default function sendMessage(msg, transferables) {
    log.debug("<--- Sending to Main:", msg.type);
    if (transferables === undefined) {
        postMessage(msg);
    }
    else {
        // TypeScript made a mistake here, and 2busy2fix
        /* eslint-disable-next-line */
        postMessage(msg, transferables);
    }
}
export function formatErrorForSender(error) {
    const formattedError = formatError(error, {
        defaultCode: "NONE",
        defaultReason: "An unknown error stopped content playback.",
    });
    return formattedError.serialize();
}
