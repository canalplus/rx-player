"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = typeof queueMicrotask === "function"
    ? queueMicrotask
    : function queueMicrotaskPonyfill(cb) {
        Promise.resolve().then(cb, function () { return cb(); });
    };
