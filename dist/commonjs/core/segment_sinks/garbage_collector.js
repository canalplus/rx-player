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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
var log_1 = require("../../log");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var ranges_1 = require("../../utils/ranges");
/**
 * Perform cleaning of the buffer according to the values set by the user
 * each time `playbackObserver` emits and each times the
 * maxBufferBehind/maxBufferAhead values change.
 *
 * Abort this operation when the `cancellationSignal` emits.
 *
 * @param {Object} opt
 * @param {Object} cancellationSignal
 *
 * TODO Move to main thread?
 */
function BufferGarbageCollector(_a, cancellationSignal) {
    var segmentSink = _a.segmentSink, playbackObserver = _a.playbackObserver, maxBufferBehind = _a.maxBufferBehind, maxBufferAhead = _a.maxBufferAhead;
    var lastPosition;
    var lastBuffered = [];
    playbackObserver.listen(function (o) {
        lastPosition = o.position.getWanted();
        lastBuffered = o.buffered[segmentSink.bufferType];
        clean();
    }, { includeLastObservation: true, clearSignal: cancellationSignal });
    function clean() {
        if (lastBuffered === null) {
            return;
        }
        clearBuffer(segmentSink, lastPosition, lastBuffered, maxBufferBehind.getValue(), maxBufferAhead.getValue(), cancellationSignal).catch(function (e) {
            var errMsg = e instanceof Error ? e.message : "Unknown error";
            log_1.default.error("Could not run BufferGarbageCollector:", errMsg);
        });
    }
    maxBufferBehind.onUpdate(clean, { clearSignal: cancellationSignal });
    maxBufferAhead.onUpdate(clean, { clearSignal: cancellationSignal });
    clean();
}
exports.default = BufferGarbageCollector;
/**
 * Remove buffer from the browser's memory based on the user's
 * maxBufferAhead / maxBufferBehind settings.
 *
 * Normally, the browser garbage-collect automatically old-added chunks of
 * buffer data when memory is scarce. However, you might want to control
 * the size of memory allocated. This function takes the current position
 * and a "depth" behind and ahead wanted for the buffer, in seconds.
 *
 * Anything older than the depth will be removed from the buffer.
 * @param {Object} segmentSink
 * @param {Number} position - The current position
 * @param {Array.<Object>} buffered
 * @param {Number} maxBufferBehind
 * @param {Number} maxBufferAhead
 * @param {Object} cancellationSignal
 * @returns {Promise}
 */
function clearBuffer(segmentSink, position, buffered, maxBufferBehind, maxBufferAhead, cancellationSignal) {
    return __awaiter(this, void 0, void 0, function () {
        var cleanedupRanges, _a, innerRange, outerRanges, collectBufferBehind, collectBufferAhead, cleanedupRanges_1, cleanedupRanges_1_1, range, e_1_1;
        var e_1, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!isFinite(maxBufferBehind) && !isFinite(maxBufferAhead)) {
                        return [2 /*return*/, Promise.resolve()];
                    }
                    cleanedupRanges = [];
                    _a = (0, ranges_1.getInnerAndOuterRanges)(buffered, position), innerRange = _a.innerRange, outerRanges = _a.outerRanges;
                    collectBufferBehind = function () {
                        if (!isFinite(maxBufferBehind)) {
                            return;
                        }
                        // begin from the oldest
                        for (var i = 0; i < outerRanges.length; i++) {
                            var outerRange = outerRanges[i];
                            if (position - maxBufferBehind >= outerRange.end) {
                                cleanedupRanges.push(outerRange);
                            }
                            else if (position >= outerRange.end &&
                                position - maxBufferBehind > outerRange.start &&
                                position - maxBufferBehind < outerRange.end) {
                                cleanedupRanges.push({
                                    start: outerRange.start,
                                    end: position - maxBufferBehind,
                                });
                            }
                        }
                        if (!(0, is_null_or_undefined_1.default)(innerRange)) {
                            if (position - maxBufferBehind > innerRange.start) {
                                cleanedupRanges.push({
                                    start: innerRange.start,
                                    end: position - maxBufferBehind,
                                });
                            }
                        }
                    };
                    collectBufferAhead = function () {
                        if (!isFinite(maxBufferAhead)) {
                            return;
                        }
                        // begin from the oldest
                        for (var i = 0; i < outerRanges.length; i++) {
                            var outerRange = outerRanges[i];
                            if (position + maxBufferAhead <= outerRange.start) {
                                cleanedupRanges.push(outerRange);
                            }
                            else if (position <= outerRange.start &&
                                position + maxBufferAhead < outerRange.end &&
                                position + maxBufferAhead > outerRange.start) {
                                cleanedupRanges.push({
                                    start: position + maxBufferAhead,
                                    end: outerRange.end,
                                });
                            }
                        }
                        if (!(0, is_null_or_undefined_1.default)(innerRange)) {
                            if (position + maxBufferAhead < innerRange.end) {
                                cleanedupRanges.push({
                                    start: position + maxBufferAhead,
                                    end: innerRange.end,
                                });
                            }
                        }
                    };
                    collectBufferBehind();
                    collectBufferAhead();
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, 7, 8]);
                    cleanedupRanges_1 = __values(cleanedupRanges), cleanedupRanges_1_1 = cleanedupRanges_1.next();
                    _c.label = 2;
                case 2:
                    if (!!cleanedupRanges_1_1.done) return [3 /*break*/, 5];
                    range = cleanedupRanges_1_1.value;
                    if (!(range.start < range.end)) return [3 /*break*/, 4];
                    log_1.default.debug("GC: cleaning range from SegmentSink", range.start, range.end);
                    if (cancellationSignal.cancellationError !== null) {
                        throw cancellationSignal.cancellationError;
                    }
                    return [4 /*yield*/, segmentSink.removeBuffer(range.start, range.end)];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    cleanedupRanges_1_1 = cleanedupRanges_1.next();
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_1_1 = _c.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (cleanedupRanges_1_1 && !cleanedupRanges_1_1.done && (_b = cleanedupRanges_1.return)) _b.call(cleanedupRanges_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
