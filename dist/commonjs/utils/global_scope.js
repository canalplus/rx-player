"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var is_node_1 = require("./is_node");
var is_worker_1 = require("./is_worker");
/**
 * The current environment's global object, written in such a way to maximize
 * compatibility.
 *
 * Though the RxPlayer should theoretically not be runnable in NodeJS, we still
 * had to support it for some applications implementing server-side rendering.
 */
var globalScope;
if (is_worker_1.default) {
    globalScope = self;
}
else if (is_node_1.default) {
    globalScope = global;
}
else {
    globalScope = window;
}
exports.default = globalScope;
