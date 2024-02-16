"use strict";
/**
 * This file is the entry point of the worker part of the RxPlayer, only relied
 * on when running in a multithread mode.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var worker_1 = require("./core/main/worker");
(0, worker_1.default)();
