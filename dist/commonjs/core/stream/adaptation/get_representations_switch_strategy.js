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
var config_1 = require("../../../config");
var array_includes_1 = require("../../../utils/array_includes");
var ranges_1 = require("../../../utils/ranges");
var segment_sinks_1 = require("../../segment_sinks");
function getRepresentationsSwitchingStrategy(period, adaptation, settings, segmentSink, playbackObserver) {
    var e_1, _a, e_2, _b;
    var _c, _d, _e, _f;
    if (settings.switchingMode === "lazy") {
        return { type: "continue", value: undefined };
    }
    var inventory = segmentSink.getLastKnownInventory();
    var unwantedRange = [];
    try {
        for (var inventory_1 = __values(inventory), inventory_1_1 = inventory_1.next(); !inventory_1_1.done; inventory_1_1 = inventory_1.next()) {
            var elt = inventory_1_1.value;
            if (elt.infos.period.id === period.id &&
                (elt.infos.adaptation.id !== adaptation.id ||
                    !(0, array_includes_1.default)(settings.representationIds, elt.infos.representation.id))) {
                (0, ranges_1.insertInto)(unwantedRange, {
                    start: (_c = elt.bufferedStart) !== null && _c !== void 0 ? _c : elt.start,
                    end: (_d = elt.bufferedEnd) !== null && _d !== void 0 ? _d : elt.end,
                });
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (inventory_1_1 && !inventory_1_1.done && (_a = inventory_1.return)) _a.call(inventory_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var pendingOperations = segmentSink.getPendingOperations();
    try {
        for (var pendingOperations_1 = __values(pendingOperations), pendingOperations_1_1 = pendingOperations_1.next(); !pendingOperations_1_1.done; pendingOperations_1_1 = pendingOperations_1.next()) {
            var operation = pendingOperations_1_1.value;
            if (operation.type === segment_sinks_1.SegmentSinkOperation.Push) {
                var info = operation.value.inventoryInfos;
                if (info.period.id === period.id &&
                    (info.adaptation.id !== adaptation.id ||
                        !(0, array_includes_1.default)(settings.representationIds, info.representation.id))) {
                    var start = info.segment.time;
                    var end = start + info.segment.duration;
                    (0, ranges_1.insertInto)(unwantedRange, { start: start, end: end });
                }
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (pendingOperations_1_1 && !pendingOperations_1_1.done && (_b = pendingOperations_1.return)) _b.call(pendingOperations_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    // Continue if we have no other Adaptation buffered in the current Period
    if (unwantedRange.length === 0) {
        return { type: "continue", value: undefined };
    }
    if (settings.switchingMode === "reload") {
        var readyState = playbackObserver.getReadyState();
        if (readyState === undefined || readyState > 1) {
            return { type: "needs-reload", value: undefined };
        }
    }
    // From here, clean-up data from the previous Adaptation, if one
    var shouldFlush = settings.switchingMode === "direct";
    var rangesToExclude = [];
    // First, we don't want to accidentally remove some segments from the previous
    // Period (which overlap a little with this one)
    /** Last segment before one for the current period. */
    var lastSegmentBefore = (0, segment_sinks_1.getLastSegmentBeforePeriod)(inventory, period);
    if (lastSegmentBefore !== null &&
        (lastSegmentBefore.bufferedEnd === undefined ||
            period.start - lastSegmentBefore.bufferedEnd < 1)) {
        // Close to Period's start
        // Exclude data close to the period's start to avoid cleaning
        // to much
        rangesToExclude.push({ start: 0, end: period.start + 1 });
    }
    if (!shouldFlush) {
        // exclude data around current position to avoid decoding issues
        var ADAP_REP_SWITCH_BUFFER_PADDINGS = config_1.default.getCurrent().ADAP_REP_SWITCH_BUFFER_PADDINGS;
        var bufferType = adaptation.type;
        /** Ranges that won't be cleaned from the current buffer. */
        var paddingBefore = (_e = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].before) !== null && _e !== void 0 ? _e : 0;
        var paddingAfter = (_f = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].after) !== null && _f !== void 0 ? _f : 0;
        var currentTime = playbackObserver.getCurrentTime();
        if (currentTime === undefined) {
            // TODO current position might be old. A better solution should be found.
            var lastObservation = playbackObserver.getReference().getValue();
            currentTime = lastObservation.position.getPolled();
        }
        rangesToExclude.push({
            start: currentTime - paddingBefore,
            end: currentTime + paddingAfter,
        });
    }
    // Now remove possible small range from the end if there is a segment from the
    // next Period
    if (period.end !== undefined) {
        /** first segment after for the current period. */
        var firstSegmentAfter = (0, segment_sinks_1.getFirstSegmentAfterPeriod)(inventory, period);
        if (firstSegmentAfter !== null &&
            (firstSegmentAfter.bufferedStart === undefined ||
                // Close to Period's end
                firstSegmentAfter.bufferedStart - period.end < 1)) {
            rangesToExclude.push({ start: period.end - 1, end: Number.MAX_VALUE });
        }
    }
    var toRemove = (0, ranges_1.excludeFromRanges)(unwantedRange, rangesToExclude);
    if (toRemove.length === 0) {
        return { type: "continue", value: undefined };
    }
    return shouldFlush
        ? { type: "flush-buffer", value: toRemove }
        : { type: "clean-buffer", value: toRemove };
}
exports.default = getRepresentationsSwitchingStrategy;
