"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Force function output to be wrapped in a Promise instance, which also rejects
 * if the function call threw.
 * @param {Function} val
 * @returns {Promise}
 */
function wrapInPromise(val) {
    try {
        var ret = val();
        if (typeof ret === "object" &&
            ret !== null &&
            typeof ret.then === "function") {
            return ret;
        }
        else {
            return Promise.resolve(ret);
        }
    }
    catch (err) {
        return Promise.reject(err);
    }
}
exports.default = wrapInPromise;
