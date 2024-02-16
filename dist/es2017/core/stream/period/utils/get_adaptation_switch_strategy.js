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
import config from "../../../../config";
import areCodecsCompatible from "../../../../utils/are_codecs_compatible";
import { excludeFromRanges, insertInto } from "../../../../utils/ranges";
import { getFirstSegmentAfterPeriod, getLastSegmentBeforePeriod, SegmentSinkOperation, } from "../../../segment_sinks";
/**
 * Find out what to do when switching Adaptation, based on the current
 * situation.
 * @param {Object} segmentSink
 * @param {Object} period
 * @param {Object} adaptation
 * @param {Object} playbackObserver
 * @returns {Object}
 */
export default function getAdaptationSwitchStrategy(segmentSink, period, adaptation, switchingMode, playbackObserver, options) {
    var _a, _b, _c, _d;
    if (segmentSink.codec !== undefined &&
        options.onCodecSwitch === "reload" &&
        !hasCompatibleCodec(adaptation, segmentSink.codec)) {
        return { type: "needs-reload", value: undefined };
    }
    const inventory = segmentSink.getLastKnownInventory();
    const unwantedRange = [];
    for (const elt of inventory) {
        if (elt.infos.period.id === period.id && elt.infos.adaptation.id !== adaptation.id) {
            insertInto(unwantedRange, {
                start: (_a = elt.bufferedStart) !== null && _a !== void 0 ? _a : elt.start,
                end: (_b = elt.bufferedEnd) !== null && _b !== void 0 ? _b : elt.end,
            });
        }
    }
    const pendingOperations = segmentSink.getPendingOperations();
    for (const operation of pendingOperations) {
        if (operation.type === SegmentSinkOperation.Push) {
            const info = operation.value.inventoryInfos;
            if (info.period.id === period.id && info.adaptation.id !== adaptation.id) {
                const start = info.segment.time;
                const end = start + info.segment.duration;
                insertInto(unwantedRange, { start, end });
            }
        }
    }
    // Continue if we have no other Adaptation buffered in the current Period
    if (unwantedRange.length === 0) {
        return { type: "continue", value: undefined };
    }
    if (switchingMode === "reload") {
        const readyState = playbackObserver.getReadyState();
        if (readyState === undefined || readyState > 1) {
            return { type: "needs-reload", value: undefined };
        }
    }
    // From here, clean-up data from the previous Adaptation, if one
    const shouldCleanAll = switchingMode === "direct";
    const rangesToExclude = [];
    // First, we don't want to accidentally remove some segments from the previous
    // Period (which overlap a little with this one)
    /** Last segment before one for the current period. */
    const lastSegmentBefore = getLastSegmentBeforePeriod(inventory, period);
    if (lastSegmentBefore !== null &&
        (lastSegmentBefore.bufferedEnd === undefined ||
            period.start - lastSegmentBefore.bufferedEnd < 1)) {
        // Close to Period's start
        // Exclude data close to the period's start to avoid cleaning
        // to much
        rangesToExclude.push({ start: 0, end: period.start + 1 });
    }
    if (!shouldCleanAll) {
        // Exclude data around current position to avoid decoding issues
        const bufferType = adaptation.type;
        const { ADAP_REP_SWITCH_BUFFER_PADDINGS } = config.getCurrent();
        /** Ranges that won't be cleaned from the current buffer. */
        const paddingBefore = (_c = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].before) !== null && _c !== void 0 ? _c : 0;
        const paddingAfter = (_d = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].after) !== null && _d !== void 0 ? _d : 0;
        let currentTime = playbackObserver.getCurrentTime();
        if (currentTime === undefined) {
            // TODO current position might be old. A better solution should be found.
            const lastObservation = playbackObserver.getReference().getValue();
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
        const firstSegmentAfter = getFirstSegmentAfterPeriod(inventory, period);
        if (firstSegmentAfter !== null &&
            (firstSegmentAfter.bufferedStart === undefined ||
                firstSegmentAfter.bufferedStart - period.end < 1)) {
            // Close to Period's end
            rangesToExclude.push({ start: period.end - 1, end: Number.MAX_VALUE });
        }
    }
    const toRemove = excludeFromRanges(unwantedRange, rangesToExclude);
    if (toRemove.length === 0) {
        return { type: "continue", value: undefined };
    }
    return shouldCleanAll && adaptation.type !== "text"
        ? { type: "flush-buffer", value: toRemove }
        : { type: "clean-buffer", value: toRemove };
}
/**
 * Returns `true` if at least one codec of the Representations in the given
 * Adaptation has a codec compatible with the given SegmentSink's codec.
 * @param {Object} adaptation
 * @param {string} segmentSinkCodec
 * @returns {boolean}
 */
function hasCompatibleCodec(adaptation, segmentSinkCodec) {
    return adaptation.representations.some((rep) => rep.isSupported === true &&
        rep.decipherable !== false &&
        areCodecsCompatible(rep.getMimeTypeString(), segmentSinkCodec));
}
