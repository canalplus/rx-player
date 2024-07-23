import log from "../../log";
export default function sendMessage(worker, msg, transferables) {
    log.debug("---> Sending to Worker:", msg.type);
    if (transferables === undefined) {
        worker.postMessage(msg);
    }
    else {
        worker.postMessage(msg, transferables);
    }
}
