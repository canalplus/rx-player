"use strict";
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
exports.createRepresentationFilterFromFnString = exports.replicateUpdatesOnManifestMetadata = exports.updateDecipherabilityFromProtectionData = exports.updateDecipherabilityFromKeyIds = exports.toTaggedTrack = exports.toVideoTrack = exports.toTextTrack = exports.toAudioTrack = exports.getAdaptations = exports.periodContainsTime = exports.getPeriodAfter = exports.getPeriodForTime = exports.getSupportedAdaptations = exports.getMaximumSafePosition = exports.getLivePosition = exports.getMinimumSafePosition = exports.SUPPORTED_ADAPTATIONS_TYPE = void 0;
var are_arrays_of_numbers_equal_1 = require("../utils/are_arrays_of_numbers_equal");
var array_find_1 = require("../utils/array_find");
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../utils/monotonic_timestamp");
var object_values_1 = require("../utils/object_values");
/** List in an array every possible value for the Adaptation's `type` property. */
exports.SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text"];
/**
 * Returns the theoretical minimum playable position on the content
 * regardless of the current Adaptation chosen, as estimated at parsing
 * time.
 * @param {Object} manifest
 * @returns {number}
 */
function getMinimumSafePosition(manifest) {
    var _a, _b;
    var windowData = manifest.timeBounds;
    if (windowData.timeshiftDepth === null) {
        return (_a = windowData.minimumSafePosition) !== null && _a !== void 0 ? _a : 0;
    }
    var maximumTimeData = windowData.maximumTimeData;
    var maximumTime;
    if (!windowData.maximumTimeData.isLinear) {
        maximumTime = maximumTimeData.maximumSafePosition;
    }
    else {
        var timeDiff = (0, monotonic_timestamp_1.default)() - maximumTimeData.time;
        maximumTime = maximumTimeData.maximumSafePosition + timeDiff / 1000;
    }
    var theoricalMinimum = maximumTime - windowData.timeshiftDepth;
    return Math.max((_b = windowData.minimumSafePosition) !== null && _b !== void 0 ? _b : 0, theoricalMinimum);
}
exports.getMinimumSafePosition = getMinimumSafePosition;
/**
 * Get the position of the live edge - that is, the position of what is
 * currently being broadcasted, in seconds.
 * @param {Object} manifest
 * @returns {number|undefined}
 */
function getLivePosition(manifest) {
    var maximumTimeData = manifest.timeBounds.maximumTimeData;
    if (!manifest.isLive || maximumTimeData.livePosition === undefined) {
        return undefined;
    }
    if (!maximumTimeData.isLinear) {
        return maximumTimeData.livePosition;
    }
    var timeDiff = (0, monotonic_timestamp_1.default)() - maximumTimeData.time;
    return maximumTimeData.livePosition + timeDiff / 1000;
}
exports.getLivePosition = getLivePosition;
/**
 * Returns the theoretical maximum playable position on the content
 * regardless of the current Adaptation chosen, as estimated at parsing
 * time.
 * @param {Object} manifest
 * @returns {number}
 */
function getMaximumSafePosition(manifest) {
    var maximumTimeData = manifest.timeBounds.maximumTimeData;
    if (!maximumTimeData.isLinear) {
        return maximumTimeData.maximumSafePosition;
    }
    var timeDiff = (0, monotonic_timestamp_1.default)() - maximumTimeData.time;
    return maximumTimeData.maximumSafePosition + timeDiff / 1000;
}
exports.getMaximumSafePosition = getMaximumSafePosition;
function getSupportedAdaptations(period, type) {
    if (type === undefined) {
        return getAdaptations(period).filter(function (ada) {
            return ada.isSupported === true;
        });
    }
    var adaptationsForType = period.adaptations[type];
    if (adaptationsForType === undefined) {
        return [];
    }
    return adaptationsForType.filter(function (ada) {
        return ada.isSupported === true;
    });
}
exports.getSupportedAdaptations = getSupportedAdaptations;
function getPeriodForTime(manifest, time) {
    var nextPeriod = null;
    for (var i = manifest.periods.length - 1; i >= 0; i--) {
        var period = manifest.periods[i];
        if (periodContainsTime(period, time, nextPeriod)) {
            return period;
        }
        nextPeriod = period;
    }
}
exports.getPeriodForTime = getPeriodForTime;
function getPeriodAfter(manifest, period) {
    var endOfPeriod = period.end;
    if (endOfPeriod === undefined) {
        return null;
    }
    var nextPeriod = (0, array_find_1.default)(manifest.periods, function (_period) {
        return _period.end === undefined || endOfPeriod < _period.end;
    });
    return nextPeriod === undefined ? null : nextPeriod;
}
exports.getPeriodAfter = getPeriodAfter;
/**
 * Returns true if the give time is in the time boundaries of this `Period`.
 * @param {Object} period - The `Period` which we want to check.
 * @param {number} time
 * @param {object|null} nextPeriod - Period coming chronologically just
 * after in the same Manifest. `null` if this instance is the last `Period`.
 * @returns {boolean}
 */
function periodContainsTime(period, time, nextPeriod) {
    if (time >= period.start && (period.end === undefined || time < period.end)) {
        return true;
    }
    else if (time === period.end &&
        (nextPeriod === null || nextPeriod.start > period.end)) {
        // The last possible timed position of a Period is ambiguous as it is
        // frequently in common with the start of the next one: is it part of
        // the current or of the next Period?
        // Here we only consider it part of the current Period if it is the
        // only one with that position.
        return true;
    }
    return false;
}
exports.periodContainsTime = periodContainsTime;
function getAdaptations(period) {
    var adaptationsByType = period.adaptations;
    return (0, object_values_1.objectValues)(adaptationsByType).reduce(
    // Note: the second case cannot happen. TS is just being dumb here
    function (acc, adaptations) {
        return !(0, is_null_or_undefined_1.default)(adaptations) ? acc.concat(adaptations) : acc;
    }, []);
}
exports.getAdaptations = getAdaptations;
/**
 * Format an `Adaptation`, generally of type `"audio"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @param {boolean} filterPlayable - If `true` only "playable" Representation
 * will be returned.
 * @returns {Object}
 */
function toAudioTrack(adaptation, filterPlayable) {
    var _a, _b;
    var formatted = {
        language: (_a = adaptation.language) !== null && _a !== void 0 ? _a : "",
        normalized: (_b = adaptation.normalizedLanguage) !== null && _b !== void 0 ? _b : "",
        audioDescription: adaptation.isAudioDescription === true,
        id: adaptation.id,
        representations: (filterPlayable
            ? adaptation.representations.filter(function (r) { return r.isSupported === true && r.decipherable !== false; })
            : adaptation.representations).map(toAudioRepresentation),
        label: adaptation.label,
    };
    if (adaptation.isDub === true) {
        formatted.dub = true;
    }
    return formatted;
}
exports.toAudioTrack = toAudioTrack;
/**
 * Format an `Adaptation`, generally of type `"audio"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @returns {Object}
 */
function toTextTrack(adaptation) {
    var _a, _b;
    return {
        language: (_a = adaptation.language) !== null && _a !== void 0 ? _a : "",
        normalized: (_b = adaptation.normalizedLanguage) !== null && _b !== void 0 ? _b : "",
        closedCaption: adaptation.isClosedCaption === true,
        id: adaptation.id,
        label: adaptation.label,
        forced: adaptation.isForcedSubtitles,
    };
}
exports.toTextTrack = toTextTrack;
/**
 * Format an `Adaptation`, generally of type `"video"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @param {boolean} filterPlayable - If `true` only "playable" Representation
 * will be returned.
 * @returns {Object}
 */
function toVideoTrack(adaptation, filterPlayable) {
    var trickModeTracks = adaptation.trickModeTracks !== undefined
        ? adaptation.trickModeTracks.map(function (trickModeAdaptation) {
            var representations = (filterPlayable
                ? trickModeAdaptation.representations.filter(function (r) { return r.isSupported === true && r.decipherable !== false; })
                : trickModeAdaptation.representations).map(toVideoRepresentation);
            var trickMode = {
                id: trickModeAdaptation.id,
                representations: representations,
                isTrickModeTrack: true,
            };
            if (trickModeAdaptation.isSignInterpreted === true) {
                trickMode.signInterpreted = true;
            }
            return trickMode;
        })
        : undefined;
    var videoTrack = {
        id: adaptation.id,
        representations: (filterPlayable
            ? adaptation.representations.filter(function (r) { return r.isSupported === true && r.decipherable !== false; })
            : adaptation.representations).map(toVideoRepresentation),
        label: adaptation.label,
    };
    if (adaptation.isSignInterpreted === true) {
        videoTrack.signInterpreted = true;
    }
    if (adaptation.isTrickModeTrack === true) {
        videoTrack.isTrickModeTrack = true;
    }
    if (trickModeTracks !== undefined) {
        videoTrack.trickModeTracks = trickModeTracks;
    }
    return videoTrack;
}
exports.toVideoTrack = toVideoTrack;
/**
 * Format Representation as an `IAudioRepresentation`.
 * @returns {Object}
 */
function toAudioRepresentation(representation) {
    var id = representation.id, bitrate = representation.bitrate, codecs = representation.codecs, isSpatialAudio = representation.isSpatialAudio, isSupported = representation.isSupported, decipherable = representation.decipherable;
    return {
        id: id,
        bitrate: bitrate,
        codec: codecs === null || codecs === void 0 ? void 0 : codecs[0],
        isSpatialAudio: isSpatialAudio,
        isCodecSupported: isSupported,
        decipherable: decipherable,
    };
}
/**
 * Format Representation as an `IVideoRepresentation`.
 * @returns {Object}
 */
function toVideoRepresentation(representation) {
    var id = representation.id, bitrate = representation.bitrate, frameRate = representation.frameRate, width = representation.width, height = representation.height, codecs = representation.codecs, hdrInfo = representation.hdrInfo, isSupported = representation.isSupported, decipherable = representation.decipherable;
    return {
        id: id,
        bitrate: bitrate,
        frameRate: frameRate,
        width: width,
        height: height,
        codec: codecs === null || codecs === void 0 ? void 0 : codecs[0],
        hdrInfo: hdrInfo,
        isCodecSupported: isSupported,
        decipherable: decipherable,
    };
}
function toTaggedTrack(adaptation) {
    switch (adaptation.type) {
        case "audio":
            return { type: "audio", track: toAudioTrack(adaptation, false) };
        case "video":
            return { type: "video", track: toVideoTrack(adaptation, false) };
        case "text":
            return { type: "text", track: toTextTrack(adaptation) };
    }
}
exports.toTaggedTrack = toTaggedTrack;
/**
 * Change the decipherability of Representations which have their key id in one
 * of the given Arrays:
 *
 *   - Those who have a key id listed in `whitelistedKeyIds` will have their
 *     decipherability updated to `true`
 *
 *   - Those who have a key id listed in `blacklistedKeyIds` will have their
 *     decipherability updated to `false`
 *
 *   - Those who have a key id listed in `delistedKeyIds` will have their
 *     decipherability updated to `undefined`.
 *
 * @param {Object} manifest
 * @param {Array.<Uint8Array>} whitelistedKeyIds
 * @param {Array.<Uint8Array>} blacklistedKeyIds
 * @param {Array.<Uint8Array>} delistedKeyIds
 */
function updateDecipherabilityFromKeyIds(manifest, updates) {
    var whitelistedKeyIds = updates.whitelistedKeyIds, blacklistedKeyIds = updates.blacklistedKeyIds, delistedKeyIds = updates.delistedKeyIds;
    return updateRepresentationsDeciperability(manifest, function (representation) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        if (representation.contentProtections === undefined) {
            return representation.decipherable;
        }
        var contentKIDs = representation.contentProtections.keyIds;
        if (contentKIDs !== undefined) {
            try {
                for (var contentKIDs_1 = __values(contentKIDs), contentKIDs_1_1 = contentKIDs_1.next(); !contentKIDs_1_1.done; contentKIDs_1_1 = contentKIDs_1.next()) {
                    var elt = contentKIDs_1_1.value;
                    try {
                        for (var blacklistedKeyIds_1 = (e_2 = void 0, __values(blacklistedKeyIds)), blacklistedKeyIds_1_1 = blacklistedKeyIds_1.next(); !blacklistedKeyIds_1_1.done; blacklistedKeyIds_1_1 = blacklistedKeyIds_1.next()) {
                            var blacklistedKeyId = blacklistedKeyIds_1_1.value;
                            if ((0, are_arrays_of_numbers_equal_1.default)(blacklistedKeyId, elt.keyId)) {
                                return false;
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (blacklistedKeyIds_1_1 && !blacklistedKeyIds_1_1.done && (_b = blacklistedKeyIds_1.return)) _b.call(blacklistedKeyIds_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    try {
                        for (var whitelistedKeyIds_1 = (e_3 = void 0, __values(whitelistedKeyIds)), whitelistedKeyIds_1_1 = whitelistedKeyIds_1.next(); !whitelistedKeyIds_1_1.done; whitelistedKeyIds_1_1 = whitelistedKeyIds_1.next()) {
                            var whitelistedKeyId = whitelistedKeyIds_1_1.value;
                            if ((0, are_arrays_of_numbers_equal_1.default)(whitelistedKeyId, elt.keyId)) {
                                return true;
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (whitelistedKeyIds_1_1 && !whitelistedKeyIds_1_1.done && (_c = whitelistedKeyIds_1.return)) _c.call(whitelistedKeyIds_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    try {
                        for (var delistedKeyIds_1 = (e_4 = void 0, __values(delistedKeyIds)), delistedKeyIds_1_1 = delistedKeyIds_1.next(); !delistedKeyIds_1_1.done; delistedKeyIds_1_1 = delistedKeyIds_1.next()) {
                            var delistedKeyId = delistedKeyIds_1_1.value;
                            if ((0, are_arrays_of_numbers_equal_1.default)(delistedKeyId, elt.keyId)) {
                                return undefined;
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (delistedKeyIds_1_1 && !delistedKeyIds_1_1.done && (_d = delistedKeyIds_1.return)) _d.call(delistedKeyIds_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (contentKIDs_1_1 && !contentKIDs_1_1.done && (_a = contentKIDs_1.return)) _a.call(contentKIDs_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        return representation.decipherable;
    });
}
exports.updateDecipherabilityFromKeyIds = updateDecipherabilityFromKeyIds;
/**
 * Update decipherability to `false` to any Representation which is linked to
 * the given initialization data.
 * @param {Object} manifest
 * @param {Object} initData
 */
function updateDecipherabilityFromProtectionData(manifest, initData) {
    return updateRepresentationsDeciperability(manifest, function (representation) {
        var e_5, _a;
        var _b, _c;
        if (representation.decipherable === false) {
            return false;
        }
        var segmentProtections = (_c = (_b = representation.contentProtections) === null || _b === void 0 ? void 0 : _b.initData) !== null && _c !== void 0 ? _c : [];
        var _loop_1 = function (protection) {
            if (initData.type === undefined || protection.type === initData.type) {
                var containedInitData = initData.values
                    .getFormattedValues()
                    .every(function (undecipherableVal) {
                    return protection.values.some(function (currVal) {
                        return ((undecipherableVal.systemId === undefined ||
                            currVal.systemId === undecipherableVal.systemId) &&
                            (0, are_arrays_of_numbers_equal_1.default)(currVal.data, undecipherableVal.data));
                    });
                });
                if (containedInitData) {
                    return { value: false };
                }
            }
        };
        try {
            for (var segmentProtections_1 = __values(segmentProtections), segmentProtections_1_1 = segmentProtections_1.next(); !segmentProtections_1_1.done; segmentProtections_1_1 = segmentProtections_1.next()) {
                var protection = segmentProtections_1_1.value;
                var state_1 = _loop_1(protection);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (segmentProtections_1_1 && !segmentProtections_1_1.done && (_a = segmentProtections_1.return)) _a.call(segmentProtections_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return representation.decipherable;
    });
}
exports.updateDecipherabilityFromProtectionData = updateDecipherabilityFromProtectionData;
/**
 * Update `decipherable` property of every `Representation` found in the
 * Manifest based on the result of a `isDecipherable` callback:
 *   - When that callback returns `true`, update `decipherable` to `true`
 *   - When that callback returns `false`, update `decipherable` to `false`
 *   - When that callback returns `undefined`, update `decipherable` to
 *     `undefined`
 * @param {Manifest} manifest
 * @param {Function} isDecipherable
 * @returns {Array.<Object>}
 */
function updateRepresentationsDeciperability(manifest, isDecipherable) {
    var e_6, _a, e_7, _b, e_8, _c;
    var updates = [];
    try {
        for (var _d = __values(manifest.periods), _e = _d.next(); !_e.done; _e = _d.next()) {
            var period = _e.value;
            var adaptationsByType = period.adaptations;
            var adaptations = (0, object_values_1.objectValues)(adaptationsByType).reduce(
            // Note: the second case cannot happen. TS is just being dumb here
            function (acc, adaps) { return (!(0, is_null_or_undefined_1.default)(adaps) ? acc.concat(adaps) : acc); }, []);
            try {
                for (var adaptations_1 = (e_7 = void 0, __values(adaptations)), adaptations_1_1 = adaptations_1.next(); !adaptations_1_1.done; adaptations_1_1 = adaptations_1.next()) {
                    var adaptation = adaptations_1_1.value;
                    try {
                        for (var _f = (e_8 = void 0, __values(adaptation.representations)), _g = _f.next(); !_g.done; _g = _f.next()) {
                            var representation = _g.value;
                            var result = isDecipherable(representation);
                            if (result !== representation.decipherable) {
                                updates.push({ manifest: manifest, period: period, adaptation: adaptation, representation: representation });
                                representation.decipherable = result;
                            }
                        }
                    }
                    catch (e_8_1) { e_8 = { error: e_8_1 }; }
                    finally {
                        try {
                            if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                        }
                        finally { if (e_8) throw e_8.error; }
                    }
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (adaptations_1_1 && !adaptations_1_1.done && (_b = adaptations_1.return)) _b.call(adaptations_1);
                }
                finally { if (e_7) throw e_7.error; }
            }
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_6) throw e_6.error; }
    }
    return updates;
}
/**
 *
 * TODO that function is kind of very ugly, yet should work.
 * Maybe find out a better system for Manifest updates.
 * @param {Object} baseManifest
 * @param {Object} newManifest
 * @param {Array.<Object>} updates
 */
function replicateUpdatesOnManifestMetadata(baseManifest, newManifest, updates) {
    var e_9, _a, e_10, _b, e_11, _c, e_12, _d, e_13, _e, e_14, _f, e_15, _g, e_16, _h, e_17, _j, e_18, _k, e_19, _l, e_20, _m;
    var _o, _p;
    try {
        for (var _q = __values(Object.keys(newManifest)), _r = _q.next(); !_r.done; _r = _q.next()) {
            var prop = _r.value;
            if (prop !== "periods") {
                // eslint-disable-next-line
                baseManifest[prop] = newManifest[prop];
            }
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (_r && !_r.done && (_a = _q.return)) _a.call(_q);
        }
        finally { if (e_9) throw e_9.error; }
    }
    try {
        for (var _s = __values(updates.removedPeriods), _t = _s.next(); !_t.done; _t = _s.next()) {
            var removedPeriod = _t.value;
            for (var periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
                if (baseManifest.periods[periodIdx].id === removedPeriod.id) {
                    baseManifest.periods.splice(periodIdx, 1);
                    break;
                }
            }
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (_t && !_t.done && (_b = _s.return)) _b.call(_s);
        }
        finally { if (e_10) throw e_10.error; }
    }
    try {
        for (var _u = __values(updates.updatedPeriods), _v = _u.next(); !_v.done; _v = _u.next()) {
            var updatedPeriod = _v.value;
            for (var periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
                var newPeriod = updatedPeriod.period;
                if (baseManifest.periods[periodIdx].id === updatedPeriod.period.id) {
                    var basePeriod = baseManifest.periods[periodIdx];
                    try {
                        for (var _w = (e_12 = void 0, __values(Object.keys(newPeriod))), _x = _w.next(); !_x.done; _x = _w.next()) {
                            var prop = _x.value;
                            if (prop !== "adaptations") {
                                // eslint-disable-next-line
                                basePeriod[prop] = newPeriod[prop];
                            }
                        }
                    }
                    catch (e_12_1) { e_12 = { error: e_12_1 }; }
                    finally {
                        try {
                            if (_x && !_x.done && (_d = _w.return)) _d.call(_w);
                        }
                        finally { if (e_12) throw e_12.error; }
                    }
                    try {
                        for (var _y = (e_13 = void 0, __values(updatedPeriod.result.removedAdaptations)), _z = _y.next(); !_z.done; _z = _y.next()) {
                            var removedAdaptation = _z.value;
                            var ttype = removedAdaptation.trackType;
                            var adaptationsForType = (_o = basePeriod.adaptations[ttype]) !== null && _o !== void 0 ? _o : [];
                            for (var adapIdx = 0; adapIdx < adaptationsForType.length; adapIdx++) {
                                if (adaptationsForType[adapIdx].id === removedAdaptation.id) {
                                    adaptationsForType.splice(adapIdx, 1);
                                    break;
                                }
                            }
                        }
                    }
                    catch (e_13_1) { e_13 = { error: e_13_1 }; }
                    finally {
                        try {
                            if (_z && !_z.done && (_e = _y.return)) _e.call(_y);
                        }
                        finally { if (e_13) throw e_13.error; }
                    }
                    try {
                        for (var _0 = (e_14 = void 0, __values(updatedPeriod.result.updatedAdaptations)), _1 = _0.next(); !_1.done; _1 = _0.next()) {
                            var updatedAdaptation = _1.value;
                            var newAdaptation = updatedAdaptation.adaptation;
                            var ttype = updatedAdaptation.trackType;
                            var adaptationsForType = (_p = basePeriod.adaptations[ttype]) !== null && _p !== void 0 ? _p : [];
                            for (var adapIdx = 0; adapIdx < adaptationsForType.length; adapIdx++) {
                                if (adaptationsForType[adapIdx].id === newAdaptation) {
                                    var baseAdaptation = adaptationsForType[adapIdx];
                                    try {
                                        for (var _2 = (e_15 = void 0, __values(updatedAdaptation.removedRepresentations)), _3 = _2.next(); !_3.done; _3 = _2.next()) {
                                            var removedRepresentation = _3.value;
                                            for (var repIdx = 0; repIdx < baseAdaptation.representations.length; repIdx++) {
                                                if (baseAdaptation.representations[repIdx].id === removedRepresentation) {
                                                    baseAdaptation.representations.splice(repIdx, 1);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    catch (e_15_1) { e_15 = { error: e_15_1 }; }
                                    finally {
                                        try {
                                            if (_3 && !_3.done && (_g = _2.return)) _g.call(_2);
                                        }
                                        finally { if (e_15) throw e_15.error; }
                                    }
                                    try {
                                        for (var _4 = (e_16 = void 0, __values(updatedAdaptation.updatedRepresentations)), _5 = _4.next(); !_5.done; _5 = _4.next()) {
                                            var newRepresentation = _5.value;
                                            for (var repIdx = 0; repIdx < baseAdaptation.representations.length; repIdx++) {
                                                if (baseAdaptation.representations[repIdx].id === newRepresentation.id) {
                                                    var baseRepresentation = baseAdaptation.representations[repIdx];
                                                    try {
                                                        for (var _6 = (e_17 = void 0, __values(Object.keys(newRepresentation))), _7 = _6.next(); !_7.done; _7 = _6.next()) {
                                                            var prop = _7.value;
                                                            if (prop !== "decipherable" && prop !== "isSupported") {
                                                                // eslint-disable-next-line
                                                                baseRepresentation[prop] = newRepresentation[prop];
                                                            }
                                                        }
                                                    }
                                                    catch (e_17_1) { e_17 = { error: e_17_1 }; }
                                                    finally {
                                                        try {
                                                            if (_7 && !_7.done && (_j = _6.return)) _j.call(_6);
                                                        }
                                                        finally { if (e_17) throw e_17.error; }
                                                    }
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    catch (e_16_1) { e_16 = { error: e_16_1 }; }
                                    finally {
                                        try {
                                            if (_5 && !_5.done && (_h = _4.return)) _h.call(_4);
                                        }
                                        finally { if (e_16) throw e_16.error; }
                                    }
                                    try {
                                        for (var _8 = (e_18 = void 0, __values(updatedAdaptation.addedRepresentations)), _9 = _8.next(); !_9.done; _9 = _8.next()) {
                                            var addedRepresentation = _9.value;
                                            baseAdaptation.representations.push(addedRepresentation);
                                        }
                                    }
                                    catch (e_18_1) { e_18 = { error: e_18_1 }; }
                                    finally {
                                        try {
                                            if (_9 && !_9.done && (_k = _8.return)) _k.call(_8);
                                        }
                                        finally { if (e_18) throw e_18.error; }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    catch (e_14_1) { e_14 = { error: e_14_1 }; }
                    finally {
                        try {
                            if (_1 && !_1.done && (_f = _0.return)) _f.call(_0);
                        }
                        finally { if (e_14) throw e_14.error; }
                    }
                    try {
                        for (var _10 = (e_19 = void 0, __values(updatedPeriod.result.addedAdaptations)), _11 = _10.next(); !_11.done; _11 = _10.next()) {
                            var addedAdaptation = _11.value;
                            var ttype = addedAdaptation.type;
                            var adaptationsForType = basePeriod.adaptations[ttype];
                            if (adaptationsForType === undefined) {
                                basePeriod.adaptations[ttype] = [addedAdaptation];
                            }
                            else {
                                adaptationsForType.push(addedAdaptation);
                            }
                        }
                    }
                    catch (e_19_1) { e_19 = { error: e_19_1 }; }
                    finally {
                        try {
                            if (_11 && !_11.done && (_l = _10.return)) _l.call(_10);
                        }
                        finally { if (e_19) throw e_19.error; }
                    }
                    break;
                }
            }
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (_v && !_v.done && (_c = _u.return)) _c.call(_u);
        }
        finally { if (e_11) throw e_11.error; }
    }
    try {
        for (var _12 = __values(updates.addedPeriods), _13 = _12.next(); !_13.done; _13 = _12.next()) {
            var addedPeriod = _13.value;
            for (var periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
                if (baseManifest.periods[periodIdx].start > addedPeriod.start) {
                    baseManifest.periods.splice(periodIdx, 0, addedPeriod);
                    break;
                }
            }
            baseManifest.periods.push(addedPeriod);
        }
    }
    catch (e_20_1) { e_20 = { error: e_20_1 }; }
    finally {
        try {
            if (_13 && !_13.done && (_m = _12.return)) _m.call(_12);
        }
        finally { if (e_20) throw e_20.error; }
    }
}
exports.replicateUpdatesOnManifestMetadata = replicateUpdatesOnManifestMetadata;
function createRepresentationFilterFromFnString(fnString) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function("return (".concat(fnString, "(arguments[0], arguments[1]))"));
}
exports.createRepresentationFilterFromFnString = createRepresentationFilterFromFnString;
