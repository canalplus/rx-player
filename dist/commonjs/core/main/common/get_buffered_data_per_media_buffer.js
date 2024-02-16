"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var array_find_1 = require("../../../utils/array_find");
/**
 * Returns a JS object where keys are the type of buffers (e.g. "audio",
 * "video", "text") and values are the corresponding range of buffered
 * data according to the given `IMediaSourceInterface` (or `null` if not
 * known / nothing is buffered).
 * @param {Object|null} mediaSourceInterface
 * @param {Object|null} textDisplayer
 * @returns {Object}
 */
function getBufferedDataPerMediaBuffer(mediaSourceInterface, textDisplayer) {
    var buffered = {
        audio: null,
        video: null,
        text: null,
    };
    if (textDisplayer !== null) {
        buffered.text = textDisplayer.getBufferedRanges();
    }
    if (mediaSourceInterface === null) {
        return buffered;
    }
    var audioBuffer = (0, array_find_1.default)(mediaSourceInterface.sourceBuffers, function (s) { return s.type === "audio" /* SourceBufferType.Audio */; });
    var videoBuffer = (0, array_find_1.default)(mediaSourceInterface.sourceBuffers, function (s) { return s.type === "video" /* SourceBufferType.Video */; });
    var audioBuffered = audioBuffer === null || audioBuffer === void 0 ? void 0 : audioBuffer.getBuffered();
    if (audioBuffered !== undefined) {
        buffered.audio = audioBuffered;
    }
    var videoBuffered = videoBuffer === null || videoBuffer === void 0 ? void 0 : videoBuffer.getBuffered();
    if (videoBuffered !== undefined) {
        buffered.video = videoBuffered;
    }
    return buffered;
}
exports.default = getBufferedDataPerMediaBuffer;
