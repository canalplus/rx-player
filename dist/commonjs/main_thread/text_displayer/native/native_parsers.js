"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var features_1 = require("../../../features");
var log_1 = require("../../../log");
/**
 * Convert text track data into timed VTT Cues.
 * @param {string} type - Text track format wanted
 * @param {string} data - Text track data
 * @param {Number} timestampOffset - offset to apply to every timed text
 * @param {string} [language] - language of the text tracks
 * @returns {Array.<VTTCue>}
 * @throws Error - Throw if no parser is found for the given type
 */
function parseTextTrackToCues(type, data, timestampOffset, language) {
    log_1.default.debug("NTSB: Finding parser for native text tracks:", type);
    var parser = features_1.default.nativeTextTracksParsers[type];
    if (typeof parser !== "function") {
        throw new Error("no parser found for the given text track");
    }
    log_1.default.debug("NTSB: Parser found, parsing...");
    var parsed = parser(data, timestampOffset, language);
    log_1.default.debug("NTSB: Parsed successfully!", parsed.length);
    return parsed;
}
exports.default = parseTextTrackToCues;
