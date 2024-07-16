"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var browser_detection_1 = require("./browser_detection");
/**
 * Enable the audio track at the given index while disabling all others in the
 * `audioTracks` array.
 *
 * Returns false if the given index is not found in the `audioTracks` array.
 * @param {array.<audioTrack>} audioTracks
 * @param {number} indexToEnable
 * @returns {boolean}
 */
function enableAudioTrack(audioTracks, indexToEnable) {
    // Seen on Safari MacOS only (2022-02-14), not disabling ALL audio tracks
    // first (even the wanted one), can lead to the media not playing.
    for (var i = 0; i < audioTracks.length; i++) {
        // However, Tizen just plays no audio if it is disabled then enabled
        // synchronously (2022-10-12)
        if (!browser_detection_1.isTizen || i !== indexToEnable) {
            audioTracks[i].enabled = false;
        }
    }
    if (indexToEnable < 0 || indexToEnable >= audioTracks.length) {
        return false;
    }
    audioTracks[indexToEnable].enabled = true;
    return true;
}
exports.default = enableAudioTrack;
