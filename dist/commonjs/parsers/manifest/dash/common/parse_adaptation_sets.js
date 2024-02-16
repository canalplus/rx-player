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
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../../log");
var manifest_1 = require("../../../../manifest");
var array_find_1 = require("../../../../utils/array_find");
var array_find_index_1 = require("../../../../utils/array_find_index");
var array_includes_1 = require("../../../../utils/array_includes");
var is_non_empty_string_1 = require("../../../../utils/is_non_empty_string");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var attach_trickmode_track_1 = require("./attach_trickmode_track");
var infer_adaptation_type_1 = require("./infer_adaptation_type");
var parse_representations_1 = require("./parse_representations");
var resolve_base_urls_1 = require("./resolve_base_urls");
/**
 * Detect if the accessibility given defines an adaptation for the visually
 * impaired.
 * Based on DVB Document A168 (DVB-DASH) and DASH-IF 4.3.
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isVisuallyImpaired(accessibility) {
    if (accessibility === undefined) {
        return false;
    }
    var isVisuallyImpairedAudioDvbDash = accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
        accessibility.value === "1";
    var isVisuallyImpairedDashIf = accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
        accessibility.value === "description";
    return isVisuallyImpairedAudioDvbDash || isVisuallyImpairedDashIf;
}
/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH) and DASH specification.
 * @param {Array.<Object>} accessibilities
 * @param {Array.<Object>} roles
 * @returns {Boolean}
 */
function isCaptionning(accessibilities, roles) {
    if (accessibilities !== undefined) {
        var hasDvbClosedCaptionSignaling = accessibilities.some(function (accessibility) {
            return accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
                accessibility.value === "2";
        });
        if (hasDvbClosedCaptionSignaling) {
            return true;
        }
    }
    if (roles !== undefined) {
        var hasDashCaptionSinaling = roles.some(function (role) {
            return role.schemeIdUri === "urn:mpeg:dash:role:2011" && role.value === "caption";
        });
        if (hasDashCaptionSinaling) {
            return true;
        }
    }
    return false;
}
/**
 * Detect if the accessibility given defines an AdaptationSet containing a sign
 * language interpretation.
 * Based on DASH-IF 4.3.
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function hasSignLanguageInterpretation(accessibility) {
    if (accessibility === undefined) {
        return false;
    }
    return (accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
        accessibility.value === "sign");
}
/**
 * Contruct Adaptation ID from the information we have.
 * @param {Object} adaptation
 * @param {Object} infos
 * @returns {string}
 */
function getAdaptationID(adaptation, infos) {
    if ((0, is_non_empty_string_1.default)(adaptation.attributes.id)) {
        return adaptation.attributes.id;
    }
    var isClosedCaption = infos.isClosedCaption, isForcedSubtitle = infos.isForcedSubtitle, isAudioDescription = infos.isAudioDescription, isSignInterpreted = infos.isSignInterpreted, isTrickModeTrack = infos.isTrickModeTrack, type = infos.type;
    var idString = type;
    if ((0, is_non_empty_string_1.default)(adaptation.attributes.language)) {
        idString += "-".concat(adaptation.attributes.language);
    }
    if (isClosedCaption === true) {
        idString += "-cc";
    }
    if (isForcedSubtitle === true) {
        idString += "-cc";
    }
    if (isAudioDescription === true) {
        idString += "-ad";
    }
    if (isSignInterpreted === true) {
        idString += "-si";
    }
    if (isTrickModeTrack) {
        idString += "-trickMode";
    }
    if ((0, is_non_empty_string_1.default)(adaptation.attributes.contentType)) {
        idString += "-".concat(adaptation.attributes.contentType);
    }
    if ((0, is_non_empty_string_1.default)(adaptation.attributes.codecs)) {
        idString += "-".concat(adaptation.attributes.codecs);
    }
    if ((0, is_non_empty_string_1.default)(adaptation.attributes.mimeType)) {
        idString += "-".concat(adaptation.attributes.mimeType);
    }
    if (adaptation.attributes.frameRate !== undefined) {
        idString += "-".concat(String(adaptation.attributes.frameRate));
    }
    return idString;
}
/**
 * Returns a list of ID this adaptation can be seamlessly switched to
 * @param {Object} adaptation
 * @returns {Array.<string>}
 */
function getAdaptationSetSwitchingIDs(adaptation) {
    var e_1, _a;
    if (!(0, is_null_or_undefined_1.default)(adaptation.children.supplementalProperties)) {
        var supplementalProperties = adaptation.children.supplementalProperties;
        try {
            for (var supplementalProperties_1 = __values(supplementalProperties), supplementalProperties_1_1 = supplementalProperties_1.next(); !supplementalProperties_1_1.done; supplementalProperties_1_1 = supplementalProperties_1.next()) {
                var supplementalProperty = supplementalProperties_1_1.value;
                if (supplementalProperty.schemeIdUri ===
                    "urn:mpeg:dash:adaptation-set-switching:2016" &&
                    !(0, is_null_or_undefined_1.default)(supplementalProperty.value)) {
                    return supplementalProperty.value
                        .split(",")
                        .map(function (id) { return id.trim(); })
                        .filter(function (id) { return id; });
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (supplementalProperties_1_1 && !supplementalProperties_1_1.done && (_a = supplementalProperties_1.return)) _a.call(supplementalProperties_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return [];
}
/**
 * Process AdaptationSets intermediate representations to return under its final
 * form.
 * Note that the AdaptationSets returned are sorted by priority (from the most
 * priority to the least one).
 * @param {Array.<Object>} adaptationsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
function parseAdaptationSets(adaptationsIR, context) {
    var e_2, _a;
    var _b, _c, _d, _e, _f, _g, _h;
    var parsedAdaptations = { video: [], audio: [], text: [] };
    var trickModeAdaptations = [];
    var adaptationSwitchingInfos = {};
    var parsedAdaptationsIDs = [];
    for (var adaptationIdx = 0; adaptationIdx < adaptationsIR.length; adaptationIdx++) {
        var adaptation = adaptationsIR[adaptationIdx];
        var adaptationChildren = adaptation.children;
        var essentialProperties = adaptationChildren.essentialProperties, roles = adaptationChildren.roles, label = adaptationChildren.label;
        var isMainAdaptation = Array.isArray(roles) &&
            roles.some(function (role) { return role.value === "main"; }) &&
            roles.some(function (role) { return role.schemeIdUri === "urn:mpeg:dash:role:2011"; });
        var representationsIR = adaptation.children.representations;
        var availabilityTimeComplete = (_b = adaptation.attributes.availabilityTimeComplete) !== null && _b !== void 0 ? _b : context.availabilityTimeComplete;
        var availabilityTimeOffset = void 0;
        if (adaptation.attributes.availabilityTimeOffset !== undefined ||
            context.availabilityTimeOffset !== undefined) {
            availabilityTimeOffset =
                ((_c = adaptation.attributes.availabilityTimeOffset) !== null && _c !== void 0 ? _c : 0) +
                    ((_d = context.availabilityTimeOffset) !== null && _d !== void 0 ? _d : 0);
        }
        var adaptationMimeType = adaptation.attributes.mimeType;
        var adaptationCodecs = adaptation.attributes.codecs;
        var type = (0, infer_adaptation_type_1.default)(representationsIR, (0, is_non_empty_string_1.default)(adaptationMimeType) ? adaptationMimeType : null, (0, is_non_empty_string_1.default)(adaptationCodecs) ? adaptationCodecs : null, !(0, is_null_or_undefined_1.default)(adaptationChildren.roles) ? adaptationChildren.roles : null);
        if (type === undefined) {
            continue;
        }
        var priority = (_e = adaptation.attributes.selectionPriority) !== null && _e !== void 0 ? _e : 1;
        var originalID = adaptation.attributes.id;
        var adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);
        var parentSegmentTemplates = [];
        if (context.segmentTemplate !== undefined) {
            parentSegmentTemplates.push(context.segmentTemplate);
        }
        if (adaptation.children.segmentTemplate !== undefined) {
            parentSegmentTemplates.push(adaptation.children.segmentTemplate);
        }
        var reprCtxt = {
            availabilityTimeComplete: availabilityTimeComplete,
            availabilityTimeOffset: availabilityTimeOffset,
            baseURLs: (0, resolve_base_urls_1.default)(context.baseURLs, adaptationChildren.baseURLs),
            manifestBoundsCalculator: context.manifestBoundsCalculator,
            end: context.end,
            isDynamic: context.isDynamic,
            isLastPeriod: context.isLastPeriod,
            manifestProfiles: context.manifestProfiles,
            parentSegmentTemplates: parentSegmentTemplates,
            receivedTime: context.receivedTime,
            start: context.start,
            unsafelyBaseOnPreviousAdaptation: null,
        };
        var trickModeProperty = Array.isArray(essentialProperties)
            ? (0, array_find_1.default)(essentialProperties, function (scheme) {
                return scheme.schemeIdUri === "http://dashif.org/guidelines/trickmode";
            })
            : undefined;
        var trickModeAttachedAdaptationIds = (_f = trickModeProperty === null || trickModeProperty === void 0 ? void 0 : trickModeProperty.value) === null || _f === void 0 ? void 0 : _f.split(" ");
        var isTrickModeTrack = trickModeAttachedAdaptationIds !== undefined;
        var accessibilities = adaptationChildren.accessibilities;
        var isDub = void 0;
        if (roles !== undefined && roles.some(function (role) { return role.value === "dub"; })) {
            isDub = true;
        }
        var isClosedCaption = void 0;
        if (type !== "text") {
            isClosedCaption = false;
        }
        else {
            isClosedCaption = isCaptionning(accessibilities, roles);
        }
        var isForcedSubtitle = void 0;
        if (type === "text" &&
            roles !== undefined &&
            roles.some(function (role) { return role.value === "forced-subtitle" || role.value === "forced_subtitle"; })) {
            isForcedSubtitle = true;
        }
        var isAudioDescription = void 0;
        if (type !== "audio") {
            isAudioDescription = false;
        }
        else if (accessibilities !== undefined) {
            isAudioDescription = accessibilities.some(isVisuallyImpaired);
        }
        var isSignInterpreted = void 0;
        if (type !== "video") {
            isSignInterpreted = false;
        }
        else if (accessibilities !== undefined) {
            isSignInterpreted = accessibilities.some(hasSignLanguageInterpretation);
        }
        var adaptationID = getAdaptationID(adaptation, {
            isAudioDescription: isAudioDescription,
            isForcedSubtitle: isForcedSubtitle,
            isClosedCaption: isClosedCaption,
            isSignInterpreted: isSignInterpreted,
            isTrickModeTrack: isTrickModeTrack,
            type: type,
        });
        // Avoid duplicate IDs
        while ((0, array_includes_1.default)(parsedAdaptationsIDs, adaptationID)) {
            adaptationID += "-dup";
        }
        var newID = adaptationID;
        parsedAdaptationsIDs.push(adaptationID);
        reprCtxt.unsafelyBaseOnPreviousAdaptation =
            (_h = (_g = context.unsafelyBaseOnPreviousPeriod) === null || _g === void 0 ? void 0 : _g.getAdaptation(adaptationID)) !== null && _h !== void 0 ? _h : null;
        var representations = (0, parse_representations_1.default)(representationsIR, adaptation, reprCtxt);
        var parsedAdaptationSet = {
            id: adaptationID,
            representations: representations,
            type: type,
            isTrickModeTrack: isTrickModeTrack,
        };
        if (!(0, is_null_or_undefined_1.default)(adaptation.attributes.language)) {
            parsedAdaptationSet.language = adaptation.attributes.language;
        }
        if (!(0, is_null_or_undefined_1.default)(isClosedCaption)) {
            parsedAdaptationSet.closedCaption = isClosedCaption;
        }
        if (!(0, is_null_or_undefined_1.default)(isAudioDescription)) {
            parsedAdaptationSet.audioDescription = isAudioDescription;
        }
        if (isDub === true) {
            parsedAdaptationSet.isDub = true;
        }
        if (isForcedSubtitle !== undefined) {
            parsedAdaptationSet.forcedSubtitles = isForcedSubtitle;
        }
        if (isSignInterpreted === true) {
            parsedAdaptationSet.isSignInterpreted = true;
        }
        if (label !== undefined) {
            parsedAdaptationSet.label = label;
        }
        if (trickModeAttachedAdaptationIds !== undefined) {
            trickModeAdaptations.push({
                adaptation: parsedAdaptationSet,
                trickModeAttachedAdaptationIds: trickModeAttachedAdaptationIds,
            });
        }
        else {
            // look if we have to merge this into another Adaptation
            var mergedIntoIdx = -1;
            var _loop_1 = function (id) {
                var _j;
                var switchingInfos = adaptationSwitchingInfos[id];
                if (switchingInfos !== undefined &&
                    switchingInfos.newID !== newID &&
                    (0, array_includes_1.default)(switchingInfos.adaptationSetSwitchingIDs, originalID)) {
                    mergedIntoIdx = (0, array_find_index_1.default)(parsedAdaptations[type], function (a) { return a[0].id === id; });
                    var mergedInto = parsedAdaptations[type][mergedIntoIdx];
                    if (mergedInto !== undefined &&
                        mergedInto[0].audioDescription === parsedAdaptationSet.audioDescription &&
                        mergedInto[0].closedCaption === parsedAdaptationSet.closedCaption &&
                        mergedInto[0].language === parsedAdaptationSet.language) {
                        log_1.default.info('DASH Parser: merging "switchable" AdaptationSets', originalID, id);
                        (_j = mergedInto[0].representations).push.apply(_j, __spreadArray([], __read(parsedAdaptationSet.representations), false));
                        mergedInto[1] = {
                            priority: Math.max(priority, mergedInto[1].priority),
                            isMainAdaptation: isMainAdaptation || mergedInto[1].isMainAdaptation,
                            indexInMpd: Math.min(adaptationIdx, mergedInto[1].indexInMpd),
                        };
                        return "break";
                    }
                }
            };
            try {
                for (var adaptationSetSwitchingIDs_1 = (e_2 = void 0, __values(adaptationSetSwitchingIDs)), adaptationSetSwitchingIDs_1_1 = adaptationSetSwitchingIDs_1.next(); !adaptationSetSwitchingIDs_1_1.done; adaptationSetSwitchingIDs_1_1 = adaptationSetSwitchingIDs_1.next()) {
                    var id = adaptationSetSwitchingIDs_1_1.value;
                    var state_1 = _loop_1(id);
                    if (state_1 === "break")
                        break;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (adaptationSetSwitchingIDs_1_1 && !adaptationSetSwitchingIDs_1_1.done && (_a = adaptationSetSwitchingIDs_1.return)) _a.call(adaptationSetSwitchingIDs_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (mergedIntoIdx < 0) {
                parsedAdaptations[type].push([
                    parsedAdaptationSet,
                    { priority: priority, isMainAdaptation: isMainAdaptation, indexInMpd: adaptationIdx },
                ]);
            }
        }
        if (!(0, is_null_or_undefined_1.default)(originalID) &&
            (0, is_null_or_undefined_1.default)(adaptationSwitchingInfos[originalID])) {
            adaptationSwitchingInfos[originalID] = {
                newID: newID,
                adaptationSetSwitchingIDs: adaptationSetSwitchingIDs,
            };
        }
    }
    var adaptationsPerType = manifest_1.SUPPORTED_ADAPTATIONS_TYPE.reduce(function (acc, adaptationType) {
        var adaptationsParsedForType = parsedAdaptations[adaptationType];
        if (adaptationsParsedForType.length > 0) {
            adaptationsParsedForType.sort(compareAdaptations);
            acc[adaptationType] = adaptationsParsedForType.map(function (_a) {
                var _b = __read(_a, 1), parsedAdaptation = _b[0];
                return parsedAdaptation;
            });
        }
        return acc;
    }, {});
    parsedAdaptations.video.sort(compareAdaptations);
    (0, attach_trickmode_track_1.default)(adaptationsPerType, trickModeAdaptations);
    return adaptationsPerType;
}
exports.default = parseAdaptationSets;
/**
 * Compare groups of parsed AdaptationSet, alongside some ordering metadata,
 * allowing to easily sort them through JavaScript's `Array.prototype.sort`
 * method.
 * @param {Array.<Object>} a
 * @param {Array.<Object>} b
 * @returns {number}
 */
function compareAdaptations(a, b) {
    var priorityDiff = b[1].priority - a[1].priority;
    if (priorityDiff !== 0) {
        return priorityDiff;
    }
    if (a[1].isMainAdaptation !== b[1].isMainAdaptation) {
        return a[1].isMainAdaptation ? -1 : 1;
    }
    return a[1].indexInMpd - b[1].indexInMpd;
}
