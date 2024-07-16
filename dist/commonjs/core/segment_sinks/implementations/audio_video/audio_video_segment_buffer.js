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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../../log");
var manifest_1 = require("../../../../manifest");
var monotonic_timestamp_1 = require("../../../../utils/monotonic_timestamp");
var types_1 = require("../types");
/**
 * Allows to push and remove new segments to a SourceBuffer while keeping an
 * inventory of what has been pushed and what is being pushed.
 *
 * To work correctly, only a single AudioVideoSegmentSink per SourceBuffer
 * should be created.
 *
 * @class AudioVideoSegmentSink
 */
var AudioVideoSegmentSink = /** @class */ (function (_super) {
    __extends(AudioVideoSegmentSink, _super);
    /**
     * @constructor
     * @param {string} bufferType
     * @param {string} codec
     * @param {Object} mediaSource
     */
    function AudioVideoSegmentSink(bufferType, codec, mediaSource) {
        var _this = _super.call(this) || this;
        log_1.default.info("AVSB: calling `mediaSource.addSourceBuffer`", codec);
        var sourceBuffer = mediaSource.addSourceBuffer(bufferType, codec);
        _this.bufferType = bufferType;
        _this._sourceBuffer = sourceBuffer;
        _this._lastInitSegmentUniqueId = null;
        _this.codec = codec;
        _this._initSegmentsMap = new Map();
        _this._pendingOperations = [];
        return _this;
    }
    /** @see SegmentSink */
    AudioVideoSegmentSink.prototype.declareInitSegment = function (uniqueId, initSegmentData) {
        assertDataIsBufferSource(initSegmentData);
        this._initSegmentsMap.set(uniqueId, initSegmentData);
    };
    /** @see SegmentSink */
    AudioVideoSegmentSink.prototype.freeInitSegment = function (uniqueId) {
        this._initSegmentsMap.delete(uniqueId);
    };
    /**
     * Push a chunk of the media segment given to the attached SourceBuffer.
     *
     * Once all chunks of a single Segment have been given to `pushChunk`, you
     * should call `signalSegmentComplete` to indicate that the whole Segment has
     * been pushed.
     *
     * Depending on the type of data appended, the pushed chunk might rely on an
     * initialization segment, given through the `data.initSegment` property.
     *
     * Such initialization segment will be first pushed to the SourceBuffer if the
     * last pushed segment was associated to another initialization segment.
     * This detection rely on the initialization segment's reference so you need
     * to avoid mutating in-place a initialization segment given to that function
     * (to avoid having two different values which have the same reference).
     *
     * If you don't need any initialization segment to push the wanted chunk, you
     * can just set `data.initSegment` to `null`.
     *
     * You can also only push an initialization segment by setting the
     * `data.chunk` argument to null.
     *
     * @param {Object} infos
     * @returns {Promise}
     */
    AudioVideoSegmentSink.prototype.pushChunk = function (infos) {
        return __awaiter(this, void 0, void 0, function () {
            var dataToPush, promise, res, err_1, ranges;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        assertDataIsBufferSource(infos.data.chunk);
                        log_1.default.debug("AVSB: receiving order to push data to the SourceBuffer", this.bufferType, (0, manifest_1.getLoggableSegmentId)(infos.inventoryInfos));
                        dataToPush = this._getActualDataToPush(infos.data);
                        if (dataToPush.length === 0) {
                            // TODO
                            // For now the following code rely on the fact that there should be at
                            // least one element to push (else, we won't make the round-trip to
                            // be able to signal updated ranges).
                            //
                            // For cases where this isn't the case (e.g. when pushing an
                            // initialization segment which was already the last one pushed), we
                            // perform a trick by just pushing an empty segment instead.
                            // That seems to work on all platforms even if it is a little ugly.
                            //
                            // To provide a better solution we could either handle initialization
                            // segment references on a `SourceBufferInterface` - which has access to
                            // the buffered ranges - or just create a new `SourceBufferInterface`
                            // method to specifically obtain the current buffered range, which we
                            // would call instead here. For now, I'm more of a fan of the former
                            // solution.
                            dataToPush.push(new Uint8Array());
                        }
                        promise = Promise.all(dataToPush.map(function (data) {
                            var _a = infos.data, codec = _a.codec, timestampOffset = _a.timestampOffset, appendWindow = _a.appendWindow;
                            log_1.default.debug("AVSB: pushing segment", _this.bufferType, (0, manifest_1.getLoggableSegmentId)(infos.inventoryInfos));
                            return _this._sourceBuffer.appendBuffer(data, {
                                codec: codec,
                                timestampOffset: timestampOffset,
                                appendWindow: appendWindow,
                            });
                        }));
                        this._addToOperationQueue(promise, {
                            type: types_1.SegmentSinkOperation.Push,
                            value: infos,
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, promise];
                    case 2:
                        res = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        this._segmentInventory.insertChunk(infos.inventoryInfos, false, (0, monotonic_timestamp_1.default)());
                        throw err_1;
                    case 4:
                        if (infos.inventoryInfos !== null) {
                            this._segmentInventory.insertChunk(infos.inventoryInfos, true, (0, monotonic_timestamp_1.default)());
                        }
                        ranges = res[res.length - 1];
                        this._segmentInventory.synchronizeBuffered(ranges);
                        return [2 /*return*/, ranges];
                }
            });
        });
    };
    /** @see SegmentSink */
    AudioVideoSegmentSink.prototype.removeBuffer = function (start, end) {
        return __awaiter(this, void 0, void 0, function () {
            var promise, ranges;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        log_1.default.debug("AVSB: receiving order to remove data from the SourceBuffer", this.bufferType, start, end);
                        promise = this._sourceBuffer.remove(start, end);
                        this._addToOperationQueue(promise, {
                            type: types_1.SegmentSinkOperation.Remove,
                            value: { start: start, end: end },
                        });
                        return [4 /*yield*/, promise];
                    case 1:
                        ranges = _a.sent();
                        this._segmentInventory.synchronizeBuffered(ranges);
                        return [2 /*return*/, ranges];
                }
            });
        });
    };
    /**
     * Indicate that every chunks from a Segment has been given to pushChunk so
     * far.
     * This will update our internal Segment inventory accordingly.
     * The returned Promise will resolve once the whole segment has been pushed
     * and this indication is acknowledged.
     * @param {Object} infos
     * @returns {Promise}
     */
    AudioVideoSegmentSink.prototype.signalSegmentComplete = function (infos) {
        return __awaiter(this, void 0, void 0, function () {
            var promise, _1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this._pendingOperations.length > 0)) return [3 /*break*/, 4];
                        promise = this._pendingOperations[this._pendingOperations.length - 1].promise;
                        this._addToOperationQueue(promise, {
                            type: types_1.SegmentSinkOperation.SignalSegmentComplete,
                            value: infos,
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, promise];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _1 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        this._segmentInventory.completeSegment(infos);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Returns the list of every operations that the `AudioVideoSegmentSink` is
     * still processing.
     * @returns {Array.<Object>}
     */
    AudioVideoSegmentSink.prototype.getPendingOperations = function () {
        return this._pendingOperations.map(function (p) { return p.operation; });
    };
    /** @see SegmentSink */
    AudioVideoSegmentSink.prototype.dispose = function () {
        try {
            log_1.default.debug("AVSB: Calling `dispose` on the SourceBufferInterface");
            this._sourceBuffer.dispose();
        }
        catch (e) {
            log_1.default.debug("AVSB: Failed to dispose a ".concat(this.bufferType, " SourceBufferInterface:"), e instanceof Error ? e : "");
        }
    };
    /**
     * A single `pushChunk` might actually necessitate two `appendBuffer` call
     * if the initialization segment needs to be pushed again.
     *
     * This method perform this check and actually return both the
     * initialization segment then the media segment when the former needs to
     * be pushed again first.
     * @param {Object} data
     * @returns {Object}
     */
    AudioVideoSegmentSink.prototype._getActualDataToPush = function (data) {
        // Push operation with both an init segment and a regular segment might
        // need to be separated into two steps
        var dataToPush = [];
        if (data.initSegmentUniqueId !== null &&
            !this._isLastInitSegment(data.initSegmentUniqueId)) {
            // Push initialization segment before the media segment
            var segmentData = this._initSegmentsMap.get(data.initSegmentUniqueId);
            if (segmentData === undefined) {
                throw new Error("Invalid initialization segment uniqueId");
            }
            // Initialization segments have to be cloned for now
            // TODO Initialization segments could be stored on the main thread?
            var dst = new ArrayBuffer(segmentData.byteLength);
            var tmpU8 = new Uint8Array(dst);
            tmpU8.set(segmentData instanceof ArrayBuffer
                ? new Uint8Array(segmentData)
                : new Uint8Array(segmentData.buffer));
            segmentData = tmpU8;
            dataToPush.push(segmentData);
            this._lastInitSegmentUniqueId = data.initSegmentUniqueId;
        }
        if (data.chunk !== null) {
            dataToPush.push(data.chunk);
        }
        return dataToPush;
    };
    /**
     * Return `true` if the given `uniqueId` is the identifier of the last
     * initialization segment pushed to the `AudioVideoSegmentSink`.
     * @param {string} uniqueId
     * @returns {boolean}
     */
    AudioVideoSegmentSink.prototype._isLastInitSegment = function (uniqueId) {
        if (this._lastInitSegmentUniqueId === null) {
            return false;
        }
        return this._lastInitSegmentUniqueId === uniqueId;
    };
    AudioVideoSegmentSink.prototype._addToOperationQueue = function (promise, operation) {
        var _this = this;
        var queueObject = { operation: operation, promise: promise };
        this._pendingOperations.push(queueObject);
        var endOperation = function () {
            var indexOf = _this._pendingOperations.indexOf(queueObject);
            if (indexOf >= 0) {
                _this._pendingOperations.splice(indexOf, 1);
            }
        };
        promise.then(endOperation, endOperation); // `finally` not supported everywhere
    };
    return AudioVideoSegmentSink;
}(types_1.SegmentSink));
exports.default = AudioVideoSegmentSink;
/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} data
 */
function assertDataIsBufferSource(data) {
    if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 0 /* __ENVIRONMENT__.PRODUCTION */) {
        return;
    }
    if (typeof data !== "object" ||
        (data !== null &&
            !(data instanceof ArrayBuffer) &&
            !(data.buffer instanceof ArrayBuffer))) {
        throw new Error("Invalid data given to the AudioVideoSegmentSink");
    }
}
