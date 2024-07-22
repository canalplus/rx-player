"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttleVideoBitrate = exports.limitVideoResolution = exports.maxBufferAhead = exports.maxBufferBehind = exports.maxVideoBufferSize = exports.wantedBufferAhead = void 0;
var config_1 = require("../../../config");
var reference_1 = require("../../../utils/reference");
var _a = config_1.default.getCurrent(), DEFAULT_WANTED_BUFFER_AHEAD = _a.DEFAULT_WANTED_BUFFER_AHEAD, DEFAULT_MAX_VIDEO_BUFFER_SIZE = _a.DEFAULT_MAX_VIDEO_BUFFER_SIZE, DEFAULT_MAX_BUFFER_AHEAD = _a.DEFAULT_MAX_BUFFER_AHEAD, DEFAULT_MAX_BUFFER_BEHIND = _a.DEFAULT_MAX_BUFFER_BEHIND;
/** Buffer "goal" at which we stop downloading new segments. */
var wantedBufferAhead = new reference_1.default(DEFAULT_WANTED_BUFFER_AHEAD);
exports.wantedBufferAhead = wantedBufferAhead;
/** Buffer maximum size in kiloBytes at which we stop downloading */
var maxVideoBufferSize = new reference_1.default(DEFAULT_MAX_VIDEO_BUFFER_SIZE);
exports.maxVideoBufferSize = maxVideoBufferSize;
/** Max buffer size after the current position, in seconds (we GC further up). */
var maxBufferAhead = new reference_1.default(DEFAULT_MAX_BUFFER_AHEAD);
exports.maxBufferAhead = maxBufferAhead;
/** Max buffer size before the current position, in seconds (we GC further down). */
var maxBufferBehind = new reference_1.default(DEFAULT_MAX_BUFFER_BEHIND);
exports.maxBufferBehind = maxBufferBehind;
var limitVideoResolution = new reference_1.default({
    height: undefined,
    width: undefined,
    pixelRatio: 1,
});
exports.limitVideoResolution = limitVideoResolution;
var throttleVideoBitrate = new reference_1.default(Infinity);
exports.throttleVideoBitrate = throttleVideoBitrate;
