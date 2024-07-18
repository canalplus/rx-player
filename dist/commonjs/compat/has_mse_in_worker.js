"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var hasMseInWorker = typeof MediaSource === "function" &&
    /* eslint-disable-next-line */
    MediaSource.canConstructInDedicatedWorker === true;
exports.default = hasMseInWorker;
