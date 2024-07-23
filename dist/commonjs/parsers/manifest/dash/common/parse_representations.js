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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
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
var log_1 = require("../../../../log");
var array_find_1 = require("../../../../utils/array_find");
var object_assign_1 = require("../../../../utils/object_assign");
var convert_supplemental_codecs_1 = require("./convert_supplemental_codecs");
var get_hdr_information_1 = require("./get_hdr_information");
var parse_representation_index_1 = require("./parse_representation_index");
var resolve_base_urls_1 = require("./resolve_base_urls");
/**
 * Combine inband event streams from representation and
 * adaptation data.
 * @param {Object} representation
 * @param {Object} adaptation
 * @returns {undefined | Array.<Object>}
 */
function combineInbandEventStreams(representation, adaptation) {
    var newSchemeId = [];
    if (representation.children.inbandEventStreams !== undefined) {
        newSchemeId.push.apply(newSchemeId, __spreadArray([], __read(representation.children.inbandEventStreams), false));
    }
    if (adaptation.children.inbandEventStreams !== undefined) {
        newSchemeId.push.apply(newSchemeId, __spreadArray([], __read(adaptation.children.inbandEventStreams), false));
    }
    if (newSchemeId.length === 0) {
        return undefined;
    }
    return newSchemeId;
}
/**
 * Extract HDR information from manifest and codecs.
 * @param {Object}
 * @returns {Object | undefined}
 */
function getHDRInformation(_a) {
    var adaptationProfiles = _a.adaptationProfiles, essentialProperties = _a.essentialProperties, supplementalProperties = _a.supplementalProperties, manifestProfiles = _a.manifestProfiles, codecs = _a.codecs;
    var profiles = (adaptationProfiles !== null && adaptationProfiles !== void 0 ? adaptationProfiles : "") + (manifestProfiles !== null && manifestProfiles !== void 0 ? manifestProfiles : "");
    if (profiles.indexOf("http://dashif.org/guidelines/dash-if-uhd#hevc-hdr-pq10") !== -1) {
        if (codecs === "hvc1.2.4.L153.B0" || codecs === "hev1.2.4.L153.B0") {
            return { colorDepth: 10, eotf: "pq", colorSpace: "rec2020" };
        }
    }
    var transferCharacteristicScheme = (0, array_find_1.default)(__spreadArray(__spreadArray([], __read((essentialProperties !== null && essentialProperties !== void 0 ? essentialProperties : [])), false), __read((supplementalProperties !== null && supplementalProperties !== void 0 ? supplementalProperties : [])), false), function (p) { return p.schemeIdUri === "urn:mpeg:mpegB:cicp:TransferCharacteristics"; });
    if (transferCharacteristicScheme !== undefined) {
        switch (transferCharacteristicScheme.value) {
            case "15":
                return undefined; // SDR
            case "16":
                return { eotf: "pq" };
            case "18":
                return { eotf: "hlg" };
        }
    }
    if (codecs !== undefined && /^vp(08|09|10)/.exec(codecs)) {
        return (0, get_hdr_information_1.getWEBMHDRInformation)(codecs);
    }
}
/**
 * Process intermediate representations to create final parsed representations.
 * @param {Array.<Object>} representationsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
function parseRepresentations(representationsIR, adaptation, context) {
    var e_1, _a;
    var _b, _c, _d, _e, _f, _g, _h;
    var parsedRepresentations = [];
    var _loop_1 = function (representation) {
        var e_2, _j;
        // Compute Representation ID
        var representationID = representation.attributes.id !== undefined
            ? representation.attributes.id
            : String(representation.attributes.bitrate) +
                (representation.attributes.height !== undefined
                    ? "-".concat(representation.attributes.height)
                    : "") +
                (representation.attributes.width !== undefined
                    ? "-".concat(representation.attributes.width)
                    : "") +
                (representation.attributes.mimeType !== undefined
                    ? "-".concat(representation.attributes.mimeType)
                    : "") +
                (representation.attributes.codecs !== undefined
                    ? "-".concat(representation.attributes.codecs)
                    : "");
        // Avoid duplicate IDs
        while (parsedRepresentations.some(function (r) { return r.id === representationID; })) {
            representationID += "-dup";
        }
        // Retrieve previous version of the Representation, if one.
        var unsafelyBaseOnPreviousRepresentation = (_c = (_b = context.unsafelyBaseOnPreviousAdaptation) === null || _b === void 0 ? void 0 : _b.getRepresentation(representationID)) !== null && _c !== void 0 ? _c : null;
        var inbandEventStreams = combineInbandEventStreams(representation, adaptation);
        var availabilityTimeComplete = (_d = representation.attributes.availabilityTimeComplete) !== null && _d !== void 0 ? _d : context.availabilityTimeComplete;
        var availabilityTimeOffset = void 0;
        if (representation.attributes.availabilityTimeOffset !== undefined ||
            context.availabilityTimeOffset !== undefined) {
            availabilityTimeOffset =
                ((_e = representation.attributes.availabilityTimeOffset) !== null && _e !== void 0 ? _e : 0) +
                    ((_f = context.availabilityTimeOffset) !== null && _f !== void 0 ? _f : 0);
        }
        var reprIndexCtxt = (0, object_assign_1.default)({}, context, {
            availabilityTimeOffset: availabilityTimeOffset,
            availabilityTimeComplete: availabilityTimeComplete,
            unsafelyBaseOnPreviousRepresentation: unsafelyBaseOnPreviousRepresentation,
            adaptation: adaptation,
            inbandEventStreams: inbandEventStreams,
        });
        var representationIndex = (0, parse_representation_index_1.default)(representation, reprIndexCtxt);
        // Find bitrate
        var representationBitrate = void 0;
        if (representation.attributes.bitrate === undefined) {
            log_1.default.warn("DASH: No usable bitrate found in the Representation.");
            representationBitrate = 0;
        }
        else {
            representationBitrate = representation.attributes.bitrate;
        }
        var representationBaseURLs = (0, resolve_base_urls_1.default)(context.baseURLs, representation.children.baseURLs);
        var cdnMetadata = representationBaseURLs.length === 0
            ? // No BaseURL seems to be associated to this Representation, nor to the MPD,
                // but underlying segments might have one. To indicate that segments should
                // still be available through a CDN without giving any root CDN URL here,
                // we just communicate about an empty `baseUrl`, as documented.
                [{ baseUrl: "", id: undefined }]
            : representationBaseURLs.map(function (x) { return ({
                baseUrl: x.url,
                id: x.serviceLocation,
            }); });
        // Construct Representation Base
        var parsedRepresentation = {
            bitrate: representationBitrate,
            cdnMetadata: cdnMetadata,
            index: representationIndex,
            id: representationID,
        };
        if (representation.children.supplementalProperties !== undefined &&
            (0, array_find_1.default)(representation.children.supplementalProperties, function (r) {
                return r.schemeIdUri === "tag:dolby.com,2018:dash:EC3_ExtensionType:2018" &&
                    r.value === "JOC";
            })) {
            parsedRepresentation.isSpatialAudio = true;
        }
        // Add optional attributes
        var codecs = void 0;
        if (representation.attributes.codecs !== undefined) {
            codecs = representation.attributes.codecs;
        }
        else if (adaptation.attributes.codecs !== undefined) {
            codecs = adaptation.attributes.codecs;
        }
        if (codecs !== undefined) {
            codecs = codecs === "mp4a.40.02" ? "mp4a.40.2" : codecs;
            parsedRepresentation.codecs = codecs;
        }
        var supplementalCodecs = void 0;
        if (representation.attributes.supplementalCodecs !== undefined) {
            supplementalCodecs = representation.attributes.supplementalCodecs;
        }
        else if (adaptation.attributes.supplementalCodecs !== undefined) {
            supplementalCodecs = adaptation.attributes.supplementalCodecs;
        }
        if (supplementalCodecs !== undefined) {
            parsedRepresentation.supplementalCodecs =
                (0, convert_supplemental_codecs_1.convertSupplementalCodecsToRFC6381)(supplementalCodecs);
        }
        if (representation.attributes.frameRate !== undefined) {
            parsedRepresentation.frameRate = representation.attributes.frameRate;
        }
        else if (adaptation.attributes.frameRate !== undefined) {
            parsedRepresentation.frameRate = adaptation.attributes.frameRate;
        }
        if (representation.attributes.height !== undefined) {
            parsedRepresentation.height = representation.attributes.height;
        }
        else if (adaptation.attributes.height !== undefined) {
            parsedRepresentation.height = adaptation.attributes.height;
        }
        if (representation.attributes.mimeType !== undefined) {
            parsedRepresentation.mimeType = representation.attributes.mimeType;
        }
        else if (adaptation.attributes.mimeType !== undefined) {
            parsedRepresentation.mimeType = adaptation.attributes.mimeType;
        }
        if (representation.attributes.width !== undefined) {
            parsedRepresentation.width = representation.attributes.width;
        }
        else if (adaptation.attributes.width !== undefined) {
            parsedRepresentation.width = adaptation.attributes.width;
        }
        // Content Protection parsing
        {
            var contentProtIrArr = __spreadArray(__spreadArray([], __read(((_g = adaptation.children.contentProtections) !== null && _g !== void 0 ? _g : [])), false), __read(((_h = representation.children.contentProtections) !== null && _h !== void 0 ? _h : [])), false);
            try {
                for (var contentProtIrArr_1 = (e_2 = void 0, __values(contentProtIrArr)), contentProtIrArr_1_1 = contentProtIrArr_1.next(); !contentProtIrArr_1_1.done; contentProtIrArr_1_1 = contentProtIrArr_1.next()) {
                    var contentProtIr = contentProtIrArr_1_1.value;
                    context.contentProtectionParser.add(parsedRepresentation, contentProtIr);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (contentProtIrArr_1_1 && !contentProtIrArr_1_1.done && (_j = contentProtIrArr_1.return)) _j.call(contentProtIrArr_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        parsedRepresentation.hdrInfo = getHDRInformation({
            adaptationProfiles: adaptation.attributes.profiles,
            supplementalProperties: adaptation.children.supplementalProperties,
            essentialProperties: adaptation.children.essentialProperties,
            manifestProfiles: context.manifestProfiles,
            codecs: codecs,
        });
        parsedRepresentations.push(parsedRepresentation);
    };
    try {
        for (var representationsIR_1 = __values(representationsIR), representationsIR_1_1 = representationsIR_1.next(); !representationsIR_1_1.done; representationsIR_1_1 = representationsIR_1.next()) {
            var representation = representationsIR_1_1.value;
            _loop_1(representation);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (representationsIR_1_1 && !representationsIR_1_1.done && (_a = representationsIR_1.return)) _a.call(representationsIR_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return parsedRepresentations;
}
exports.default = parseRepresentations;
