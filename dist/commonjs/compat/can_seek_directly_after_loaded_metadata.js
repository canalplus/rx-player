"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var browser_detection_1 = require("./browser_detection");
/**
 * On safari mobile (version 17.1.2) seeking too early cause the video to never buffer
 * media data. Using delaying mechanisms such as `setTimeout(fn, 0)` defers the seek
 * to a moment at which safari should be more able to handle a seek.
 */
var canSeekDirectlyAfterLoadedMetadata = !browser_detection_1.isSafariMobile;
exports.default = canSeekDirectlyAfterLoadedMetadata;
