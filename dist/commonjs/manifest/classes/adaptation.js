"use strict";
/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../log");
var array_find_1 = require("../../utils/array_find");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var languages_1 = require("../../utils/languages");
var representation_1 = require("./representation");
/**
 * Normalized Adaptation structure.
 * An `Adaptation` describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
var Adaptation = /** @class */ (function () {
    /**
     * @constructor
     * @param {Object} parsedAdaptation
     * @param {Object|undefined} [options]
     */
    function Adaptation(parsedAdaptation, options) {
        if (options === void 0) { options = {}; }
        var trickModeTracks = parsedAdaptation.trickModeTracks;
        var representationFilter = options.representationFilter, isManuallyAdded = options.isManuallyAdded;
        this.id = parsedAdaptation.id;
        this.type = parsedAdaptation.type;
        if (parsedAdaptation.isTrickModeTrack !== undefined) {
            this.isTrickModeTrack = parsedAdaptation.isTrickModeTrack;
        }
        if (parsedAdaptation.language !== undefined) {
            this.language = parsedAdaptation.language;
            this.normalizedLanguage = (0, languages_1.default)(parsedAdaptation.language);
        }
        if (parsedAdaptation.closedCaption !== undefined) {
            this.isClosedCaption = parsedAdaptation.closedCaption;
        }
        if (parsedAdaptation.audioDescription !== undefined) {
            this.isAudioDescription = parsedAdaptation.audioDescription;
        }
        if (parsedAdaptation.isDub !== undefined) {
            this.isDub = parsedAdaptation.isDub;
        }
        if (parsedAdaptation.forcedSubtitles !== undefined) {
            this.isForcedSubtitles = parsedAdaptation.forcedSubtitles;
        }
        if (parsedAdaptation.isSignInterpreted !== undefined) {
            this.isSignInterpreted = parsedAdaptation.isSignInterpreted;
        }
        if (parsedAdaptation.label !== undefined) {
            this.label = parsedAdaptation.label;
        }
        if (trickModeTracks !== undefined && trickModeTracks.length > 0) {
            this.trickModeTracks = trickModeTracks.map(function (track) { return new Adaptation(track); });
        }
        var argsRepresentations = parsedAdaptation.representations;
        var representations = [];
        var isSupported;
        for (var i = 0; i < argsRepresentations.length; i++) {
            var representation = new representation_1.default(argsRepresentations[i], this.type);
            var shouldAdd = true;
            if (!(0, is_null_or_undefined_1.default)(representationFilter)) {
                var reprObject = {
                    id: representation.id,
                    bitrate: representation.bitrate,
                    codecs: representation.codecs,
                    height: representation.height,
                    width: representation.width,
                    frameRate: representation.frameRate,
                    hdrInfo: representation.hdrInfo,
                };
                if (representation.contentProtections !== undefined) {
                    reprObject.contentProtections = {};
                    if (representation.contentProtections.keyIds !== undefined) {
                        var keyIds = representation.contentProtections.keyIds.map(function (_a) {
                            var keyId = _a.keyId;
                            return keyId;
                        });
                        reprObject.contentProtections.keyIds = keyIds;
                    }
                }
                shouldAdd = representationFilter(reprObject, {
                    trackType: this.type,
                    language: this.language,
                    normalizedLanguage: this.normalizedLanguage,
                    isClosedCaption: this.isClosedCaption,
                    isDub: this.isDub,
                    isAudioDescription: this.isAudioDescription,
                    isSignInterpreted: this.isSignInterpreted,
                });
            }
            if (shouldAdd) {
                representations.push(representation);
                if (isSupported === undefined) {
                    if (representation.isSupported === true) {
                        isSupported = true;
                    }
                    else if (representation.isSupported === false) {
                        isSupported = false;
                    }
                }
            }
            else {
                log_1.default.debug("Filtering Representation due to representationFilter", this.type, "Adaptation: ".concat(this.id), "Representation: ".concat(representation.id), "(".concat(representation.bitrate, ")"));
            }
        }
        representations.sort(function (a, b) { return a.bitrate - b.bitrate; });
        this.representations = representations;
        this.isSupported = isSupported;
        // for manuallyAdded adaptations (not in the manifest)
        this.manuallyAdded = isManuallyAdded === true;
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually with a clear list of codecs supported
     * once it has been requested on a compatible environment (e.g. in the main
     * thread) allows to work-around this issue.
     *
     * If the right mimetype+codec combination is found in the provided object,
     * this `Adaptation`'s `isSupported` property will be updated accordingly as
     * well as all of its inner `Representation`'s `isSupported` attributes.
     *
     * @param {Array.<Object>} supportList
     */
    Adaptation.prototype.refreshCodecSupport = function (supportList) {
        var e_1, _a;
        try {
            for (var _b = __values(this.representations), _c = _b.next(); !_c.done; _c = _b.next()) {
                var representation = _c.value;
                if (representation.isSupported === undefined) {
                    representation.refreshCodecSupport(supportList);
                    if (this.isSupported !== true && representation.isSupported === true) {
                        this.isSupported = true;
                    }
                    else if (this.isSupported === undefined &&
                        representation.isSupported === false) {
                        this.isSupported = false;
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * Returns the Representation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    Adaptation.prototype.getRepresentation = function (wantedId) {
        return (0, array_find_1.default)(this.representations, function (_a) {
            var id = _a.id;
            return wantedId === id;
        });
    };
    /**
     * Format the current `Adaptation`'s properties into a
     * `IAdaptationMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Adaptation` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Adaptation`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    Adaptation.prototype.getMetadataSnapshot = function () {
        var e_2, _a;
        var representations = [];
        var baseRepresentations = this.representations;
        try {
            for (var baseRepresentations_1 = __values(baseRepresentations), baseRepresentations_1_1 = baseRepresentations_1.next(); !baseRepresentations_1_1.done; baseRepresentations_1_1 = baseRepresentations_1.next()) {
                var representation = baseRepresentations_1_1.value;
                representations.push(representation.getMetadataSnapshot());
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (baseRepresentations_1_1 && !baseRepresentations_1_1.done && (_a = baseRepresentations_1.return)) _a.call(baseRepresentations_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return {
            id: this.id,
            type: this.type,
            isSupported: this.isSupported,
            language: this.language,
            isForcedSubtitles: this.isForcedSubtitles,
            isClosedCaption: this.isClosedCaption,
            isAudioDescription: this.isAudioDescription,
            isSignInterpreted: this.isSignInterpreted,
            normalizedLanguage: this.normalizedLanguage,
            representations: representations,
            label: this.label,
            isDub: this.isDub,
        };
    };
    return Adaptation;
}());
exports.default = Adaptation;
