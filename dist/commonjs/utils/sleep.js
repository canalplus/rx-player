"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Convert a setTimeout to a Promise.
 *
 * You can use it to have a much more readable blocking code with async/await
 * in some asynchronous tests.
 *
 * @param {number} timeInMs
 * @returns {Promise}
 */
function sleep(timeInMs) {
    return new Promise(function (res) {
        setTimeout(res, timeInMs);
    });
}
exports.default = sleep;
