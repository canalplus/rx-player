"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatErrorForSender = void 0;
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
function sendMessage(msg, transferables) {
    log_1.default.debug("<--- Sending to Main:", msg.type);
    if (transferables === undefined) {
        postMessage(msg);
    }
    else {
        // TypeScript made a mistake here, and 2busy2fix
        /* eslint-disable-next-line */
        postMessage(msg, transferables);
    }
}
exports.default = sendMessage;
function formatErrorForSender(error) {
    var formattedError = (0, errors_1.formatError)(error, {
        defaultCode: "NONE",
        defaultReason: "An unknown error stopped content playback.",
    });
    return formattedError.serialize();
}
exports.formatErrorForSender = formatErrorForSender;
