"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var global_scope_1 = require("./global_scope");
var monotonic_timestamp_1 = require("./monotonic_timestamp");
/**
 * Create and return a Universally Unique IDentifier (UUID) as defined by
 * RFC4122.
 * Depending on browser API availability, we may be generating an approximation
 * of what the RFC indicates instead.
 * @returns {string}
 */
function createUuid() {
    var _a;
    if (typeof ((_a = global_scope_1.default.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID) === "function") {
        return global_scope_1.default.crypto.randomUUID();
    }
    var ts1 = new Date().getTime();
    var ts2 = (0, monotonic_timestamp_1.default)();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16;
        if (ts1 > 0) {
            r = (ts1 + r) % 16 | 0;
            ts1 = Math.floor(ts1 / 16);
        }
        else {
            r = (ts2 + r) % 16 | 0;
            ts2 = Math.floor(ts2 / 16);
        }
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}
exports.default = createUuid;
