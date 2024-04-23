"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var browser_detection_1 = require("./browser_detection");
/**
 * Returns `true` if a `MediaKeys` instance (the  `Encrypted Media Extension`
 * concept) can be reused between contents.
 *
 * This should usually be the case but we found rare devices where this would
 * cause problem:
 *   - (2022-11-21): WebOS (LG TVs), for some encrypted contents, just
 *     rebuffered indefinitely when loading a content already-loaded on the
 *     HTMLMediaElement.
 *
 * @returns {boolean}
 */
function canReuseMediaKeys() {
    return !browser_detection_1.isWebOs && !browser_detection_1.isPanasonic;
}
exports.default = canReuseMediaKeys;
