"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var features_1 = require("../../../features");
var log_1 = require("../../../log");
/**
 * Convert text track data into timed HTML Cues.
 * @param {string} type - Text track format wanted
 * @param {string} data - Text track data
 * @param {Number} timestampOffset - offset to apply to every timed text
 * @param {string} [language] - language of the text tracks
 * @returns {Array.<Object>}
 * @throws Error - Throw if no parser is found for the given type
 */
function parseTextTrackToElements(type, data, timestampOffset, language) {
    log_1.default.debug("HTSB: Finding parser for html text tracks:", type);
    var parser = features_1.default.htmlTextTracksParsers[type];
    if (typeof parser !== "function") {
        throw new Error("no parser found for the given text track");
    }
    log_1.default.debug("HTSB: Parser found, parsing...");
    var parsed = parser(data, timestampOffset, language);
    log_1.default.debug("HTTB: Parsed successfully!", parsed.length);
    return parsed;
}
exports.default = parseTextTrackToElements;
