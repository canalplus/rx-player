"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMediaKeys = void 0;
var log_1 = require("../../log");
var sleep_1 = require("../../utils/sleep");
var should_await_set_media_keys_1 = require("../should_await_set_media_keys");
/**
 * @param {Object} emeImplementation
 * @param {Object} mediaElement
 * @param {Object|null} mediaKeys
 * @returns {Promise}
 */
function setMediaKeys(emeImplementation, mediaElement, mediaKeys) {
    var prom = emeImplementation
        .setMediaKeys(mediaElement, mediaKeys)
        .then(function () {
        log_1.default.info("Compat: MediaKeys updated with success");
    })
        .catch(function (err) {
        if (mediaKeys === null) {
            log_1.default.error("Compat: Could not reset MediaKeys", err instanceof Error ? err : "Unknown Error");
            return;
        }
        log_1.default.error("Compat: Could not update MediaKeys", err instanceof Error ? err : "Unknown Error");
        throw err;
    });
    if ((0, should_await_set_media_keys_1.default)()) {
        return prom;
    }
    return Promise.race([
        prom,
        // Because we know how much EME has implementation issues, let's not block
        // everything because that API hangs
        (0, sleep_1.default)(1000),
    ]);
}
exports.setMediaKeys = setMediaKeys;
