"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEBUG_ELEMENT = void 0;
var debug_1 = require("../../main_thread/api/debug");
/**
 * Add ability to parse SAMI text tracks in an HTML textrack mode.
 * @param {Object} features
 */
function addDebugElementFeature(features) {
    features.createDebugElement = debug_1.default;
}
exports.DEBUG_ELEMENT = addDebugElementFeature;
exports.default = addDebugElementFeature;
