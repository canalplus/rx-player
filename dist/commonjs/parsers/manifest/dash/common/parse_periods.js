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
var flat_map_1 = require("../../../../utils/flat_map");
var id_generator_1 = require("../../../../utils/id_generator");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var is_worker_1 = require("../../../../utils/is_worker");
var monotonic_timestamp_1 = require("../../../../utils/monotonic_timestamp");
var object_values_1 = require("../../../../utils/object_values");
var string_parsing_1 = require("../../../../utils/string_parsing");
var flatten_overlapping_periods_1 = require("./flatten_overlapping_periods");
var get_periods_time_infos_1 = require("./get_periods_time_infos");
var parse_adaptation_sets_1 = require("./parse_adaptation_sets");
var resolve_base_urls_1 = require("./resolve_base_urls");
var generatePeriodID = (0, id_generator_1.default)();
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
function parsePeriods(periodsIR, context) {
    var _a, _b, _c, _d, _e;
    var parsedPeriods = [];
    var periodsTimeInformation = (0, get_periods_time_infos_1.default)(periodsIR, context);
    if (periodsTimeInformation.length !== periodsIR.length) {
        throw new Error("MPD parsing error: the time information are incoherent.");
    }
    var isDynamic = context.isDynamic, manifestBoundsCalculator = context.manifestBoundsCalculator;
    if (!isDynamic && !(0, is_null_or_undefined_1.default)(context.duration)) {
        manifestBoundsCalculator.setLastPosition(context.duration);
    }
    var _loop_1 = function (i) {
        var isLastPeriod = i === periodsIR.length - 1;
        var periodIR = periodsIR[i];
        var xlinkInfos = context.xlinkInfos.get(periodIR);
        var periodBaseURLs = (0, resolve_base_urls_1.default)(context.baseURLs, periodIR.children.baseURLs);
        var _g = periodsTimeInformation[i], periodStart = _g.periodStart, periodDuration = _g.periodDuration, periodEnd = _g.periodEnd;
        var periodID;
        if ((0, is_null_or_undefined_1.default)(periodIR.attributes.id)) {
            log_1.default.warn("DASH: No usable id found in the Period. Generating one.");
            periodID = "gen-dash-period-" + generatePeriodID();
        }
        else {
            periodID = periodIR.attributes.id;
        }
        // Avoid duplicate IDs
        while (parsedPeriods.some(function (p) { return p.id === periodID; })) {
            periodID += "-dup";
        }
        var receivedTime = xlinkInfos !== undefined ? xlinkInfos.receivedTime : context.receivedTime;
        var unsafelyBaseOnPreviousPeriod = (_b = (_a = context.unsafelyBaseOnPreviousManifest) === null || _a === void 0 ? void 0 : _a.getPeriod(periodID)) !== null && _b !== void 0 ? _b : null;
        var availabilityTimeComplete = periodIR.attributes.availabilityTimeComplete;
        var availabilityTimeOffset = periodIR.attributes.availabilityTimeOffset;
        var manifestProfiles = context.manifestProfiles, contentProtectionParser = context.contentProtectionParser;
        var segmentTemplate = periodIR.children.segmentTemplate;
        contentProtectionParser.addReferences((_c = periodIR.children.contentProtections) !== null && _c !== void 0 ? _c : []);
        var adapCtxt = {
            availabilityTimeComplete: availabilityTimeComplete,
            availabilityTimeOffset: availabilityTimeOffset,
            baseURLs: periodBaseURLs,
            contentProtectionParser: contentProtectionParser,
            manifestBoundsCalculator: manifestBoundsCalculator,
            end: periodEnd,
            isDynamic: isDynamic,
            isLastPeriod: isLastPeriod,
            manifestProfiles: manifestProfiles,
            receivedTime: receivedTime,
            segmentTemplate: segmentTemplate,
            start: periodStart,
            unsafelyBaseOnPreviousPeriod: unsafelyBaseOnPreviousPeriod,
        };
        var adaptations = (0, parse_adaptation_sets_1.default)(periodIR.children.adaptations, adapCtxt);
        var namespaces = ((_d = context.xmlNamespaces) !== null && _d !== void 0 ? _d : []).concat((_e = periodIR.attributes.namespaces) !== null && _e !== void 0 ? _e : []);
        var streamEvents = generateStreamEvents(periodIR.children.eventStreams, periodStart, namespaces);
        var parsedPeriod = {
            id: periodID,
            start: periodStart,
            end: periodEnd,
            duration: periodDuration,
            adaptations: adaptations,
            streamEvents: streamEvents,
        };
        parsedPeriods.unshift(parsedPeriod);
        if (!manifestBoundsCalculator.lastPositionIsKnown()) {
            var lastPosition = getMaximumLastPosition(adaptations);
            if (!isDynamic) {
                if (typeof lastPosition === "number") {
                    manifestBoundsCalculator.setLastPosition(lastPosition);
                }
            }
            else {
                if (typeof lastPosition === "number") {
                    var positionTime = (0, monotonic_timestamp_1.default)() / 1000;
                    manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
                }
                else {
                    var guessedLastPositionFromClock = guessLastPositionFromClock(context, periodStart);
                    if (guessedLastPositionFromClock !== undefined) {
                        var _h = __read(guessedLastPositionFromClock, 2), guessedLastPosition = _h[0], guessedPositionTime = _h[1];
                        manifestBoundsCalculator.setLastPosition(guessedLastPosition, guessedPositionTime);
                    }
                }
            }
        }
    };
    // We parse it in reverse because we might need to deduce the buffer depth from
    // the last Periods' indexes
    for (var i = periodsIR.length - 1; i >= 0; i--) {
        _loop_1(i);
    }
    if (context.isDynamic && !manifestBoundsCalculator.lastPositionIsKnown()) {
        // Guess a last time the last position
        var guessedLastPositionFromClock = guessLastPositionFromClock(context, 0);
        if (guessedLastPositionFromClock !== undefined) {
            var _f = __read(guessedLastPositionFromClock, 2), lastPosition = _f[0], positionTime = _f[1];
            manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
        }
    }
    return (0, flatten_overlapping_periods_1.default)(parsedPeriods);
}
exports.default = parsePeriods;
/**
 * Try to guess the "last position", which is the last position
 * available in the manifest in seconds, and the "position time", the
 * monotonically-raising timestamp used by the RxPlayer, at which the
 * last position was collected.
 *
 * These values allows to retrieve at any time in the future the new last
 * position, by substracting the position time to the last position, and
 * adding to it the new monotonically-raising timestamp.
 *
 * The last position and position time are returned by this function if and only if
 * it would indicate a last position superior to the `minimumTime` given.
 *
 * This last part allows for example to detect which Period is likely to be the
 * "current" one in multi-periods contents. By giving the Period's start as a
 * `minimumTime`, you ensure that you will get a value only if the current time
 * is in that period.
 *
 * This is useful as guessing the live time from the clock can be seen as a last
 * resort. By detecting that the current time is before the currently considered
 * Period, we can just parse and look at the previous Period. If we can guess
 * the live time more directly from that previous one, we might be better off
 * than just using the clock.
 *
 * @param {Object} context
 * @param {number} minimumTime
 * @returns {Array.<number|undefined>}
 */
function guessLastPositionFromClock(context, minimumTime) {
    if (!(0, is_null_or_undefined_1.default)(context.clockOffset)) {
        var lastPosition = context.clockOffset / 1000 - context.availabilityStartTime;
        var positionTime = (0, monotonic_timestamp_1.default)() / 1000;
        var timeInSec = positionTime + lastPosition;
        if (timeInSec >= minimumTime) {
            return [timeInSec, positionTime];
        }
    }
    else {
        var now = Date.now() / 1000;
        if (now >= minimumTime) {
            log_1.default.warn("DASH Parser: no clock synchronization mechanism found." +
                " Using the system clock instead.");
            var lastPosition = now - context.availabilityStartTime;
            var positionTime = (0, monotonic_timestamp_1.default)() / 1000;
            return [lastPosition, positionTime];
        }
    }
    return undefined;
}
/**
 * Try to extract the last position declared for any segments in a Period:
 *   - If at least a single index' last position is defined, take the maximum
 *     among them.
 *   - If segments are available but we cannot define the last position
 *     return undefined.
 *   - If no segment are available in that period, return null
 * @param {Object} adaptationsPerType
 * @returns {number|null|undefined}
 */
function getMaximumLastPosition(adaptationsPerType) {
    var e_1, _a, e_2, _b;
    var maxEncounteredPosition = null;
    var allIndexAreEmpty = true;
    var adaptationsVal = (0, object_values_1.default)(adaptationsPerType).filter(function (ada) { return !(0, is_null_or_undefined_1.default)(ada); });
    var allAdaptations = (0, flat_map_1.default)(adaptationsVal, function (adaptationsForType) { return adaptationsForType; });
    try {
        for (var allAdaptations_1 = __values(allAdaptations), allAdaptations_1_1 = allAdaptations_1.next(); !allAdaptations_1_1.done; allAdaptations_1_1 = allAdaptations_1.next()) {
            var adaptation = allAdaptations_1_1.value;
            var representations = adaptation.representations;
            try {
                for (var representations_1 = (e_2 = void 0, __values(representations)), representations_1_1 = representations_1.next(); !representations_1_1.done; representations_1_1 = representations_1.next()) {
                    var representation = representations_1_1.value;
                    var position = representation.index.getLastAvailablePosition();
                    if (position !== null) {
                        allIndexAreEmpty = false;
                        if (typeof position === "number") {
                            maxEncounteredPosition = (0, is_null_or_undefined_1.default)(maxEncounteredPosition)
                                ? position
                                : Math.max(maxEncounteredPosition, position);
                        }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (representations_1_1 && !representations_1_1.done && (_b = representations_1.return)) _b.call(representations_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (allAdaptations_1_1 && !allAdaptations_1_1.done && (_a = allAdaptations_1.return)) _a.call(allAdaptations_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (!(0, is_null_or_undefined_1.default)(maxEncounteredPosition)) {
        return maxEncounteredPosition;
    }
    else if (allIndexAreEmpty) {
        return null;
    }
    return undefined;
}
/**
 * Generate parsed "eventStream" objects from a `StreamEvent` node's
 * intermediate Representation.
 * @param {Array.<Object>} baseIr - The array of every encountered StreamEvent's
 * intermediate representations for a given Period.
 * @param {number} periodStart - The time in seconds at which this corresponding
 * Period starts.
 * @returns {Array.<Object>} - The parsed objects.
 */
function generateStreamEvents(baseIr, periodStart, xmlNamespaces) {
    var e_3, _a, e_4, _b;
    var _c, _d;
    var res = [];
    try {
        for (var baseIr_1 = __values(baseIr), baseIr_1_1 = baseIr_1.next(); !baseIr_1_1.done; baseIr_1_1 = baseIr_1.next()) {
            var eventStreamIr = baseIr_1_1.value;
            var _e = eventStreamIr.attributes, _f = _e.schemeIdUri, schemeIdUri = _f === void 0 ? "" : _f, _g = _e.timescale, timescale = _g === void 0 ? 1 : _g;
            var allNamespaces = xmlNamespaces.concat((_c = eventStreamIr.attributes.namespaces) !== null && _c !== void 0 ? _c : []);
            try {
                for (var _h = (e_4 = void 0, __values(eventStreamIr.children.events)), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var eventIr = _j.value;
                    if (eventIr.eventStreamData !== undefined) {
                        var start = ((_d = eventIr.presentationTime) !== null && _d !== void 0 ? _d : 0) / timescale + periodStart;
                        var end = eventIr.duration === undefined
                            ? undefined
                            : start + eventIr.duration / timescale;
                        var element = void 0;
                        var xmlData = void 0;
                        if (!is_worker_1.default && eventIr.eventStreamData instanceof Element) {
                            element = eventIr.eventStreamData;
                        }
                        else {
                            try {
                                xmlData = {
                                    namespaces: allNamespaces,
                                    data: typeof eventIr.eventStreamData === "string"
                                        ? eventIr.eventStreamData
                                        : (0, string_parsing_1.utf8ToStr)(new Uint8Array(eventIr.eventStreamData)),
                                };
                            }
                            catch (err) {
                                log_1.default.error("DASH: Error while parsing event-stream:", err instanceof Error ? err.message : "Unknown error");
                            }
                        }
                        res.push({
                            start: start,
                            end: end,
                            id: eventIr.id,
                            data: {
                                type: "dash-event-stream",
                                value: { schemeIdUri: schemeIdUri, timescale: timescale, element: element, xmlData: xmlData },
                            },
                        });
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (baseIr_1_1 && !baseIr_1_1.done && (_a = baseIr_1.return)) _a.call(baseIr_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return res;
}
