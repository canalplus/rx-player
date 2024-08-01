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
var config_1 = require("../../../../config");
var log_1 = require("../../../../log");
var array_find_1 = require("../../../../utils/array_find");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../../../utils/monotonic_timestamp");
var resolve_url_1 = require("../../../../utils/resolve_url");
var content_protection_parser_1 = require("./content_protection_parser");
var get_clock_offset_1 = require("./get_clock_offset");
var get_http_utc_timing_url_1 = require("./get_http_utc-timing_url");
var get_minimum_and_maximum_positions_1 = require("./get_minimum_and_maximum_positions");
var manifest_bounds_calculator_1 = require("./manifest_bounds_calculator");
var parse_availability_start_time_1 = require("./parse_availability_start_time");
var parse_periods_1 = require("./parse_periods");
var resolve_base_urls_1 = require("./resolve_base_urls");
/**
 * Checks if xlinks needs to be loaded before actually parsing the manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @param {boolean} hasLoadedClock
 * @param {Array.<Object>} warnings
 * @returns {Object}
 */
function parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos) {
    if (xlinkInfos === void 0) { xlinkInfos = new WeakMap(); }
    var rootChildren = mpdIR.children, rootAttributes = mpdIR.attributes;
    if ((0, is_null_or_undefined_1.default)(args.externalClockOffset)) {
        var isDynamic = rootAttributes.type === "dynamic";
        var directTiming = (0, array_find_1.default)(rootChildren.utcTimings, function (utcTiming) {
            return (utcTiming.schemeIdUri === "urn:mpeg:dash:utc:direct:2014" &&
                !(0, is_null_or_undefined_1.default)(utcTiming.value));
        });
        var clockOffsetFromDirectUTCTiming = !(0, is_null_or_undefined_1.default)(directTiming) && !(0, is_null_or_undefined_1.default)(directTiming.value)
            ? (0, get_clock_offset_1.default)(directTiming.value)
            : undefined;
        var clockOffset = !(0, is_null_or_undefined_1.default)(clockOffsetFromDirectUTCTiming) &&
            !isNaN(clockOffsetFromDirectUTCTiming)
            ? clockOffsetFromDirectUTCTiming
            : undefined;
        if (!(0, is_null_or_undefined_1.default)(clockOffset) && hasLoadedClock !== true) {
            args.externalClockOffset = clockOffset;
        }
        else if (isDynamic && hasLoadedClock !== true) {
            var UTCTimingHTTPURL = (0, get_http_utc_timing_url_1.default)(mpdIR);
            if (!(0, is_null_or_undefined_1.default)(UTCTimingHTTPURL) && UTCTimingHTTPURL.length > 0) {
                // TODO fetch UTCTiming and XLinks at the same time
                return {
                    type: "needs-clock",
                    value: {
                        url: UTCTimingHTTPURL,
                        continue: function continueParsingMPD(responseDataClock) {
                            if (!responseDataClock.success) {
                                warnings.push(responseDataClock.error);
                                log_1.default.warn("DASH Parser: Error on fetching the clock ressource", responseDataClock.error);
                                return parseMpdIr(mpdIR, args, warnings, true);
                            }
                            args.externalClockOffset = (0, get_clock_offset_1.default)(responseDataClock.data);
                            return parseMpdIr(mpdIR, args, warnings, true);
                        },
                    },
                };
            }
        }
    }
    var xlinksToLoad = [];
    for (var i = 0; i < rootChildren.periods.length; i++) {
        var _a = rootChildren.periods[i].attributes, xlinkHref = _a.xlinkHref, xlinkActuate = _a.xlinkActuate;
        if (!(0, is_null_or_undefined_1.default)(xlinkHref) && xlinkActuate === "onLoad") {
            xlinksToLoad.push({ index: i, ressource: xlinkHref });
        }
    }
    if (xlinksToLoad.length === 0) {
        return parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos);
    }
    return {
        type: "needs-xlinks",
        value: {
            xlinksUrls: xlinksToLoad.map(function (_a) {
                var ressource = _a.ressource;
                return ressource;
            }),
            continue: function continueParsingMPD(loadedRessources) {
                var e_1, _a, _b;
                if (loadedRessources.length !== xlinksToLoad.length) {
                    throw new Error("DASH parser: wrong number of loaded ressources.");
                }
                // Note: It is important to go from the last index to the first index in
                // the resulting array, as we will potentially add elements to the array
                for (var i = loadedRessources.length - 1; i >= 0; i--) {
                    var index = xlinksToLoad[i].index;
                    var _c = loadedRessources[i], periodsIR = _c.parsed, parsingWarnings = _c.warnings, receivedTime = _c.receivedTime, sendingTime = _c.sendingTime, url = _c.url;
                    if (parsingWarnings.length > 0) {
                        warnings.push.apply(warnings, __spreadArray([], __read(parsingWarnings), false));
                    }
                    try {
                        for (var periodsIR_1 = (e_1 = void 0, __values(periodsIR)), periodsIR_1_1 = periodsIR_1.next(); !periodsIR_1_1.done; periodsIR_1_1 = periodsIR_1.next()) {
                            var periodIR = periodsIR_1_1.value;
                            xlinkInfos.set(periodIR, { receivedTime: receivedTime, sendingTime: sendingTime, url: url });
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (periodsIR_1_1 && !periodsIR_1_1.done && (_a = periodsIR_1.return)) _a.call(periodsIR_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    // replace original "xlinked" periods by the real deal
                    (_b = rootChildren.periods).splice.apply(_b, __spreadArray([index, 1], __read(periodsIR), false));
                }
                return parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos);
            },
        },
    };
}
exports.default = parseMpdIr;
/**
 * Parse the MPD intermediate representation into a regular Manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @param {Array.<Object>} warnings
 * @param {Object} xlinkInfos
 * @returns {Object}
 */
function parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos) {
    var _a, _b, _c, _d, _e;
    var rootChildren = mpdIR.children, rootAttributes = mpdIR.attributes;
    var isDynamic = rootAttributes.type === "dynamic";
    var initialBaseUrl = args.url !== undefined
        ? [{ url: args.url.substring(0, (0, resolve_url_1.getFilenameIndexInUrl)(args.url)) }]
        : [];
    var mpdBaseUrls = (0, resolve_base_urls_1.default)(initialBaseUrl, rootChildren.baseURLs);
    var availabilityStartTime = (0, parse_availability_start_time_1.default)(rootAttributes, args.referenceDateTime);
    var timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
    var clockOffset = args.externalClockOffset, unsafelyBaseOnPreviousManifest = args.unsafelyBaseOnPreviousManifest;
    var externalClockOffset = args.externalClockOffset;
    var manifestBoundsCalculator = new manifest_bounds_calculator_1.default({
        availabilityStartTime: availabilityStartTime,
        isDynamic: isDynamic,
        timeShiftBufferDepth: timeShiftBufferDepth,
        serverTimestampOffset: externalClockOffset,
    });
    var contentProtectionParser = new content_protection_parser_1.default();
    contentProtectionParser.addReferences((_a = rootChildren.contentProtections) !== null && _a !== void 0 ? _a : []);
    var manifestInfos = {
        availabilityStartTime: availabilityStartTime,
        baseURLs: mpdBaseUrls,
        clockOffset: clockOffset,
        contentProtectionParser: contentProtectionParser,
        duration: rootAttributes.duration,
        isDynamic: isDynamic,
        manifestBoundsCalculator: manifestBoundsCalculator,
        manifestProfiles: mpdIR.attributes.profiles,
        receivedTime: args.manifestReceivedTime,
        timeShiftBufferDepth: timeShiftBufferDepth,
        unsafelyBaseOnPreviousManifest: unsafelyBaseOnPreviousManifest,
        xlinkInfos: xlinkInfos,
        xmlNamespaces: mpdIR.attributes.namespaces,
    };
    var parsedPeriods = (0, parse_periods_1.default)(rootChildren.periods, manifestInfos);
    contentProtectionParser.finalize();
    var mediaPresentationDuration = rootAttributes.duration;
    var lifetime;
    var minimumTime;
    var timeshiftDepth = null;
    var maximumTimeData;
    if (rootAttributes.minimumUpdatePeriod !== undefined &&
        rootAttributes.minimumUpdatePeriod >= 0) {
        lifetime =
            rootAttributes.minimumUpdatePeriod === 0
                ? config_1.default.getCurrent().DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0
                : rootAttributes.minimumUpdatePeriod;
    }
    var _f = (0, get_minimum_and_maximum_positions_1.default)(parsedPeriods), minimumSafePosition = _f.minimumSafePosition, maximumSafePosition = _f.maximumSafePosition, maximumUnsafePosition = _f.maximumUnsafePosition;
    var now = (0, monotonic_timestamp_1.default)();
    if (!isDynamic) {
        minimumTime = minimumSafePosition;
        if (minimumTime === undefined) {
            minimumTime = (_c = (_b = parsedPeriods[0]) === null || _b === void 0 ? void 0 : _b.start) !== null && _c !== void 0 ? _c : 0;
        }
        var finalMaximumSafePosition = mediaPresentationDuration !== null && mediaPresentationDuration !== void 0 ? mediaPresentationDuration : Infinity;
        if (parsedPeriods[parsedPeriods.length - 1] !== undefined) {
            var lastPeriod = parsedPeriods[parsedPeriods.length - 1];
            var lastPeriodEnd = (_d = lastPeriod.end) !== null && _d !== void 0 ? _d : (lastPeriod.duration !== undefined
                ? lastPeriod.start + lastPeriod.duration
                : undefined);
            if (lastPeriodEnd !== undefined && lastPeriodEnd < finalMaximumSafePosition) {
                finalMaximumSafePosition = lastPeriodEnd;
            }
        }
        if (maximumSafePosition !== undefined &&
            maximumSafePosition < finalMaximumSafePosition) {
            finalMaximumSafePosition = maximumSafePosition;
        }
        maximumTimeData = {
            isLinear: false,
            maximumSafePosition: finalMaximumSafePosition,
            livePosition: undefined,
            time: now,
        };
    }
    else {
        // Determine the maximum seekable position
        var finalMaximumSafePosition = void 0;
        if (maximumSafePosition !== undefined) {
            finalMaximumSafePosition = maximumSafePosition;
        }
        else {
            if (externalClockOffset === undefined) {
                log_1.default.warn("DASH Parser: use system clock to define maximum position");
                finalMaximumSafePosition = Date.now() / 1000 - availabilityStartTime;
            }
            else {
                var serverTime = (0, monotonic_timestamp_1.default)() + externalClockOffset;
                finalMaximumSafePosition = serverTime / 1000 - availabilityStartTime;
            }
        }
        // Determine live edge (what position corresponds to live content, can be
        // inferior or superior to the maximum anounced position in some specific
        // scenarios). However, the `timeShiftBufferDepth` should be based on it.
        var livePosition = manifestBoundsCalculator.getEstimatedLiveEdge();
        if (livePosition === undefined) {
            if (maximumUnsafePosition !== undefined) {
                livePosition = maximumUnsafePosition;
            }
            else {
                livePosition = finalMaximumSafePosition;
            }
            // manifestBoundsCalculator.forceLiveEdge(livePosition);
        }
        maximumTimeData = {
            isLinear: true,
            maximumSafePosition: finalMaximumSafePosition,
            livePosition: livePosition,
            time: now,
        };
        // if the minimum calculated time is even below the buffer depth, perhaps we
        // can go even lower in terms of depth
        minimumTime = minimumSafePosition;
        timeshiftDepth = timeShiftBufferDepth !== null && timeShiftBufferDepth !== void 0 ? timeShiftBufferDepth : null;
        if (timeshiftDepth !== null &&
            minimumTime !== undefined &&
            livePosition - minimumTime > timeshiftDepth) {
            timeshiftDepth = livePosition - minimumTime;
        }
    }
    // `isLastPeriodKnown` should be `true` in two cases for DASH contents:
    //   1. When the content is static, because we know that no supplementary
    //      Period will be added.
    //   2. If the content is dynamic, only when both the duration is known and
    //      the `minimumUpdatePeriod` is not set. This corresponds to the case
    //      explained in "4.6.4. Transition Phase between Live and On-Demand" of
    //      the DASH-IF IOP v4.3 for live contents transitionning to on-demand.
    var isLastPeriodKnown = !isDynamic ||
        (mpdIR.attributes.minimumUpdatePeriod === undefined &&
            (((_e = parsedPeriods[parsedPeriods.length - 1]) === null || _e === void 0 ? void 0 : _e.end) !== undefined ||
                mpdIR.attributes.duration !== undefined));
    var parsedMPD = {
        availabilityStartTime: availabilityStartTime,
        clockOffset: args.externalClockOffset,
        isDynamic: isDynamic,
        isLive: isDynamic,
        isLastPeriodKnown: isLastPeriodKnown,
        periods: parsedPeriods,
        publishTime: rootAttributes.publishTime,
        suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay,
        transportType: "dash",
        timeBounds: {
            minimumSafePosition: minimumTime,
            timeshiftDepth: timeshiftDepth,
            maximumTimeData: maximumTimeData,
        },
        lifetime: lifetime,
        uris: (0, is_null_or_undefined_1.default)(args.url)
            ? rootChildren.locations
            : __spreadArray([args.url], __read(rootChildren.locations), false),
    };
    return { type: "done", value: { parsed: parsedMPD, warnings: warnings } };
}
