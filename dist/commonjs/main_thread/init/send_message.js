"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../log");
function sendMessage(worker, msg, transferables) {
    log_1.default.debug("---> Sending to Worker:", msg.type);
    if (transferables === undefined) {
        worker.postMessage(msg);
    }
    else {
        worker.postMessage(msg, transferables);
    }
}
exports.default = sendMessage;
