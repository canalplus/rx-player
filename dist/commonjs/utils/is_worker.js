"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * `true` if the current code is running in a WebWorker.
 */
exports.default = typeof WorkerGlobalScope !== "undefined" &&
    self instanceof WorkerGlobalScope;
