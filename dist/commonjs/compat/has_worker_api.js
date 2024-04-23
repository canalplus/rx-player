"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var browser_detection_1 = require("./browser_detection");
/**
 * Return `true` if the current device is compatible with the Worker API.
 *
 * Some old webkit devices, such as the PlayStation 4, returns weird results
 * when doing the most straightforward check. We have to check if other Webkit
 * devices have the same issue.
 * @returns {boolean}
 */
function hasWorkerApi() {
    return browser_detection_1.isPlayStation4
        ? typeof Worker === "object" || typeof Worker === "function"
        : typeof Worker === "function";
}
exports.default = hasWorkerApi;
