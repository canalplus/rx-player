"use strict";
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
exports.MainSourceBufferInterface = void 0;
var browser_compatibility_types_1 = require("../compat/browser_compatibility_types");
var change_source_buffer_type_1 = require("../compat/change_source_buffer_type");
var event_listeners_1 = require("../compat/event_listeners");
var errors_1 = require("../errors");
var log_1 = require("../log");
var byte_parsing_1 = require("../utils/byte_parsing");
var event_emitter_1 = require("../utils/event_emitter");
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
var object_assign_1 = require("../utils/object_assign");
var ranges_1 = require("../utils/ranges");
var task_canceller_1 = require("../utils/task_canceller");
var end_of_stream_1 = require("./utils/end_of_stream");
var media_source_duration_updater_1 = require("./utils/media_source_duration_updater");
/**
 * `IMediaSourceInterface` object for when the MSE API are directly available.
 * @see IMediaSourceInterface
 * @class {MainMediaSourceInterface}
 */
var MainMediaSourceInterface = /** @class */ (function (_super) {
    __extends(MainMediaSourceInterface, _super);
    /**
     * Creates a new `MainMediaSourceInterface` alongside its `MediaSource` MSE
     * object.
     *
     * You can then obtain a link to that `MediaSource`, for example to link it
     * to an `HTMLMediaElement`, through the `handle` property.
     */
    function MainMediaSourceInterface(id) {
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.sourceBuffers = [];
        _this._canceller = new task_canceller_1.default();
        if ((0, is_null_or_undefined_1.default)(browser_compatibility_types_1.MediaSource_)) {
            throw new errors_1.MediaError("MEDIA_SOURCE_NOT_SUPPORTED", "No MediaSource Object was found in the current browser.");
        }
        log_1.default.info("Init: Creating MediaSource");
        var mediaSource = new browser_compatibility_types_1.MediaSource_();
        _this.readyState = mediaSource.readyState;
        var handle = mediaSource.handle;
        _this.handle = (0, is_null_or_undefined_1.default)(handle)
            ? { type: "media-source", value: mediaSource }
            : { type: "handle", value: handle };
        _this._mediaSource = mediaSource;
        _this._durationUpdater = new media_source_duration_updater_1.default(mediaSource);
        _this._endOfStreamCanceller = null;
        (0, event_listeners_1.onSourceOpen)(mediaSource, function () {
            _this.readyState = mediaSource.readyState;
            _this.trigger("mediaSourceOpen", null);
        }, _this._canceller.signal);
        (0, event_listeners_1.onSourceEnded)(mediaSource, function () {
            _this.readyState = mediaSource.readyState;
            _this.trigger("mediaSourceEnded", null);
        }, _this._canceller.signal);
        (0, event_listeners_1.onSourceClose)(mediaSource, function () {
            _this.readyState = mediaSource.readyState;
            _this.trigger("mediaSourceClose", null);
        }, _this._canceller.signal);
        return _this;
    }
    /** @see IMediaSourceInterface */
    MainMediaSourceInterface.prototype.addSourceBuffer = function (sbType, codec) {
        var sourceBuffer = this._mediaSource.addSourceBuffer(codec);
        var sb = new MainSourceBufferInterface(sbType, codec, sourceBuffer);
        this.sourceBuffers.push(sb);
        return sb;
    };
    /** @see IMediaSourceInterface */
    MainMediaSourceInterface.prototype.setDuration = function (newDuration, isRealEndKnown) {
        this._durationUpdater.updateDuration(newDuration, isRealEndKnown);
    };
    /** @see IMediaSourceInterface */
    MainMediaSourceInterface.prototype.interruptDurationSetting = function () {
        this._durationUpdater.stopUpdating();
    };
    /** @see IMediaSourceInterface */
    MainMediaSourceInterface.prototype.maintainEndOfStream = function () {
        if (this._endOfStreamCanceller === null) {
            this._endOfStreamCanceller = new task_canceller_1.default();
            this._endOfStreamCanceller.linkToSignal(this._canceller.signal);
            log_1.default.debug("Init: end-of-stream order received.");
            (0, end_of_stream_1.maintainEndOfStream)(this._mediaSource, this._endOfStreamCanceller.signal);
        }
    };
    /** @see IMediaSourceInterface */
    MainMediaSourceInterface.prototype.stopEndOfStream = function () {
        if (this._endOfStreamCanceller !== null) {
            log_1.default.debug("Init: resume-stream order received.");
            this._endOfStreamCanceller.cancel();
            this._endOfStreamCanceller = null;
        }
    };
    /** @see IMediaSourceInterface */
    MainMediaSourceInterface.prototype.dispose = function () {
        this.sourceBuffers.forEach(function (s) { return s.dispose(); });
        this._canceller.cancel();
        resetMediaSource(this._mediaSource);
    };
    return MainMediaSourceInterface;
}(event_emitter_1.default));
exports.default = MainMediaSourceInterface;
/**
 * `ISourceBufferInterface` object for when the MSE API are directly available.
 * @see ISourceBufferInterface
 * @class {MainSourceBufferInterface}
 */
var MainSourceBufferInterface = /** @class */ (function () {
    /**
     * Creates a new `SourceBufferInterface` linked to the given `SourceBuffer`
     * instance.
     * @param {string} sbType
     * @param {string} codec
     * @param {SourceBuffer} sourceBuffer
     */
    function MainSourceBufferInterface(sbType, codec, sourceBuffer) {
        var _this = this;
        this.type = sbType;
        this.codec = codec;
        this._canceller = new task_canceller_1.default();
        this._sourceBuffer = sourceBuffer;
        this._operationQueue = [];
        this._currentOperations = [];
        var onError = function (evt) {
            var e_1, _a;
            var error;
            if (evt instanceof Error) {
                error = evt;
            }
            else if (evt.error instanceof Error) {
                error = evt.error;
            }
            else {
                error = new Error("Unknown SourceBuffer Error");
            }
            var currentOps = _this._currentOperations;
            _this._currentOperations = [];
            if (currentOps.length === 0) {
                log_1.default.error("SBI: error for an unknown operation", error);
            }
            else {
                var rejected = new errors_1.SourceBufferError(error.name, error.message, error.name === "QuotaExceededError");
                try {
                    for (var currentOps_1 = __values(currentOps), currentOps_1_1 = currentOps_1.next(); !currentOps_1_1.done; currentOps_1_1 = currentOps_1.next()) {
                        var op = currentOps_1_1.value;
                        op.reject(rejected);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (currentOps_1_1 && !currentOps_1_1.done && (_a = currentOps_1.return)) _a.call(currentOps_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        };
        var onUpdateEnd = function () {
            var e_2, _a, e_3, _b;
            var currentOps = _this._currentOperations;
            _this._currentOperations = [];
            try {
                try {
                    for (var currentOps_2 = __values(currentOps), currentOps_2_1 = currentOps_2.next(); !currentOps_2_1.done; currentOps_2_1 = currentOps_2.next()) {
                        var op = currentOps_2_1.value;
                        op.resolve((0, ranges_1.convertToRanges)(_this._sourceBuffer.buffered));
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (currentOps_2_1 && !currentOps_2_1.done && (_a = currentOps_2.return)) _a.call(currentOps_2);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            catch (err) {
                try {
                    for (var currentOps_3 = __values(currentOps), currentOps_3_1 = currentOps_3.next(); !currentOps_3_1.done; currentOps_3_1 = currentOps_3.next()) {
                        var op = currentOps_3_1.value;
                        if (err instanceof Error && err.name === "InvalidStateError") {
                            // Most likely the SourceBuffer just has been removed from the
                            // `MediaSource`.
                            // Just return an empty buffered range.
                            op.resolve([]);
                        }
                        else {
                            op.reject(err);
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (currentOps_3_1 && !currentOps_3_1.done && (_b = currentOps_3.return)) _b.call(currentOps_3);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
            _this._performNextOperation();
        };
        sourceBuffer.addEventListener("error", onError);
        sourceBuffer.addEventListener("updateend", onUpdateEnd);
        this._canceller.signal.register(function () {
            sourceBuffer.removeEventListener("error", onError);
            sourceBuffer.removeEventListener("updateend", onUpdateEnd);
        });
    }
    /** @see ISourceBufferInterface */
    MainSourceBufferInterface.prototype.appendBuffer = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        log_1.default.debug("SBI: receiving order to push data to the SourceBuffer", this.type);
        return this._addToQueue({
            operationName: 0 /* SbiOperationName.Push */,
            params: args,
        });
    };
    /** @see ISourceBufferInterface */
    MainSourceBufferInterface.prototype.remove = function (start, end) {
        log_1.default.debug("SBI: receiving order to remove data from the SourceBuffer", this.type, start, end);
        return this._addToQueue({
            operationName: 1 /* SbiOperationName.Remove */,
            params: [start, end],
        });
    };
    /** @see ISourceBufferInterface */
    MainSourceBufferInterface.prototype.getBuffered = function () {
        try {
            return (0, ranges_1.convertToRanges)(this._sourceBuffer.buffered);
        }
        catch (err) {
            log_1.default.error("Failed to get buffered time range of SourceBuffer", this.type, err instanceof Error ? err : null);
            return [];
        }
    };
    /** @see ISourceBufferInterface */
    MainSourceBufferInterface.prototype.abort = function () {
        try {
            this._sourceBuffer.abort();
        }
        catch (err) {
            log_1.default.debug("Init: Failed to abort SourceBuffer:", err instanceof Error ? err : null);
        }
        this._emptyCurrentQueue();
    };
    /** @see ISourceBufferInterface */
    MainSourceBufferInterface.prototype.dispose = function () {
        try {
            this._sourceBuffer.abort();
        }
        catch (_) {
            // we don't care
        }
        this._emptyCurrentQueue();
    };
    MainSourceBufferInterface.prototype._emptyCurrentQueue = function () {
        var error = new task_canceller_1.CancellationError();
        if (this._currentOperations.length > 0) {
            this._currentOperations.forEach(function (op) {
                op.reject(error);
            });
            this._currentOperations = [];
        }
        if (this._operationQueue.length > 0) {
            this._operationQueue.forEach(function (op) {
                op.reject(error);
            });
            this._operationQueue = [];
        }
    };
    MainSourceBufferInterface.prototype._addToQueue = function (operation) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var shouldRestartQueue = _this._operationQueue.length === 0 && _this._currentOperations.length === 0;
            var queueItem = (0, object_assign_1.default)({ resolve: resolve, reject: reject }, operation);
            _this._operationQueue.push(queueItem);
            if (shouldRestartQueue) {
                _this._performNextOperation();
            }
        });
    };
    MainSourceBufferInterface.prototype._performNextOperation = function () {
        var _a, _b, _c, _d, _e;
        if (this._currentOperations.length !== 0 || this._sourceBuffer.updating) {
            return;
        }
        var nextElem = this._operationQueue.shift();
        if (nextElem === undefined) {
            return;
        }
        else if (nextElem.operationName === 0 /* SbiOperationName.Push */) {
            this._currentOperations = [
                {
                    operationName: 0 /* SbiOperationName.Push */,
                    resolve: nextElem.resolve,
                    reject: nextElem.reject,
                },
            ];
            var ogData = nextElem.params[0];
            var params = nextElem.params[1];
            var segmentData = ogData;
            // In some cases with very poor performances, tens of appendBuffer
            // requests could be waiting for their turn here.
            //
            // Instead of pushing each one, one by one, waiting in-between for each
            // one's `"updateend"` event (which would probably have lot of time
            // overhead involved, even more considering that we're probably
            // encountering performance issues), the idea is to concatenate all
            // similar push operations into one huge segment.
            //
            // This seems to have a very large positive effect on the more
            // extreme scenario, such as low-latency CMAF with very small chunks and
            // huge CPU usage in the thread doing the push operation.
            //
            // Because this should still be relatively rare, we pre-check here
            // the condition.
            if (this._operationQueue.length > 0 &&
                this._operationQueue[0].operationName === 0 /* SbiOperationName.Push */) {
                var prevU8 = void 0;
                if (ogData instanceof ArrayBuffer) {
                    prevU8 = new Uint8Array(ogData);
                }
                else if (ogData instanceof Uint8Array) {
                    prevU8 = ogData;
                }
                else {
                    prevU8 = new Uint8Array(ogData.buffer);
                }
                var toConcat = [prevU8];
                while (((_a = this._operationQueue[0]) === null || _a === void 0 ? void 0 : _a.operationName) === 0 /* SbiOperationName.Push */) {
                    var followingElem = this._operationQueue[0];
                    var cAw = (_b = params.appendWindow) !== null && _b !== void 0 ? _b : [undefined, undefined];
                    var fAw = (_c = followingElem.params[1].appendWindow) !== null && _c !== void 0 ? _c : [undefined, undefined];
                    var cTo = (_d = params.timestampOffset) !== null && _d !== void 0 ? _d : 0;
                    var fTo = (_e = followingElem.params[1].timestampOffset) !== null && _e !== void 0 ? _e : 0;
                    if (cAw[0] === fAw[0] &&
                        cAw[1] === fAw[1] &&
                        params.codec === followingElem.params[1].codec &&
                        cTo === fTo) {
                        var newData = followingElem.params[0];
                        var newU8 = void 0;
                        if (newData instanceof ArrayBuffer) {
                            newU8 = new Uint8Array(newData);
                        }
                        else if (newData instanceof Uint8Array) {
                            newU8 = newData;
                        }
                        else {
                            newU8 = new Uint8Array(newData.buffer);
                        }
                        toConcat.push(newU8);
                        this._operationQueue.splice(0, 1);
                        this._currentOperations.push({
                            operationName: 0 /* SbiOperationName.Push */,
                            resolve: followingElem.resolve,
                            reject: followingElem.reject,
                        });
                    }
                    else {
                        break;
                    }
                }
                if (toConcat.length > 1) {
                    log_1.default.info("MMSI: Merging ".concat(toConcat.length, " segments together for perf"), this.type);
                    segmentData = byte_parsing_1.concat.apply(void 0, __spreadArray([], __read(toConcat), false));
                }
            }
            try {
                this._appendBufferNow(segmentData, params);
            }
            catch (err) {
                var error_1 = err instanceof Error
                    ? new errors_1.SourceBufferError(err.name, err.message, err.name === "QuotaExceededError")
                    : new errors_1.SourceBufferError("Error", "Unknown SourceBuffer Error during appendBuffer", false);
                this._currentOperations.forEach(function (op) {
                    op.reject(error_1);
                });
                this._currentOperations = [];
            }
        }
        else {
            // TODO merge contiguous removes?
            this._currentOperations = [nextElem];
            var _f = __read(nextElem.params, 2), start = _f[0], end = _f[1];
            log_1.default.debug("SBI: removing data from SourceBuffer", this.type, start, end);
            try {
                this._sourceBuffer.remove(start, end);
            }
            catch (err) {
                var error = err instanceof Error
                    ? new errors_1.SourceBufferError(err.name, err.message, false)
                    : new errors_1.SourceBufferError("Error", "Unknown SourceBuffer Error during remove", false);
                nextElem.reject(error);
                this._currentOperations = [];
            }
        }
    };
    MainSourceBufferInterface.prototype._appendBufferNow = function (data, params) {
        var sourceBuffer = this._sourceBuffer;
        var codec = params.codec, timestampOffset = params.timestampOffset, _a = params.appendWindow, appendWindow = _a === void 0 ? [] : _a;
        if (codec !== undefined && codec !== this.codec) {
            log_1.default.debug("SBI: updating codec", codec);
            var hasUpdatedSourceBufferType = (0, change_source_buffer_type_1.default)(sourceBuffer, codec);
            if (hasUpdatedSourceBufferType) {
                this.codec = codec;
            }
            else {
                log_1.default.debug("SBI: could not update codec", codec, this.codec);
            }
        }
        if (timestampOffset !== undefined &&
            sourceBuffer.timestampOffset !== timestampOffset) {
            var newTimestampOffset = timestampOffset;
            log_1.default.debug("SBI: updating timestampOffset", codec, sourceBuffer.timestampOffset, newTimestampOffset);
            sourceBuffer.timestampOffset = newTimestampOffset;
        }
        if (appendWindow[0] === undefined) {
            if (sourceBuffer.appendWindowStart > 0) {
                log_1.default.debug("SBI: re-setting `appendWindowStart` to `0`");
                sourceBuffer.appendWindowStart = 0;
            }
        }
        else if (appendWindow[0] !== sourceBuffer.appendWindowStart) {
            if (appendWindow[0] >= sourceBuffer.appendWindowEnd) {
                var newTmpEnd = appendWindow[0] + 1;
                log_1.default.debug("SBI: pre-updating `appendWindowEnd`", newTmpEnd);
                sourceBuffer.appendWindowEnd = newTmpEnd;
            }
            log_1.default.debug("SBI: setting `appendWindowStart`", appendWindow[0]);
            sourceBuffer.appendWindowStart = appendWindow[0];
        }
        if (appendWindow[1] === undefined) {
            if (sourceBuffer.appendWindowEnd !== Infinity) {
                log_1.default.debug("SBI: re-setting `appendWindowEnd` to `Infinity`");
                sourceBuffer.appendWindowEnd = Infinity;
            }
        }
        else if (appendWindow[1] !== sourceBuffer.appendWindowEnd) {
            log_1.default.debug("SBI: setting `appendWindowEnd`", appendWindow[1]);
            sourceBuffer.appendWindowEnd = appendWindow[1];
        }
        log_1.default.debug("SBI: pushing segment", this.type);
        sourceBuffer.appendBuffer(data);
    };
    return MainSourceBufferInterface;
}());
exports.MainSourceBufferInterface = MainSourceBufferInterface;
function resetMediaSource(mediaSource) {
    if (mediaSource.readyState !== "closed") {
        var readyState = mediaSource.readyState, sourceBuffers = mediaSource.sourceBuffers;
        for (var i = sourceBuffers.length - 1; i >= 0; i--) {
            var sourceBuffer = sourceBuffers[i];
            try {
                if (readyState === "open") {
                    log_1.default.info("Init: Aborting SourceBuffer before removing");
                    try {
                        sourceBuffer.abort();
                    }
                    catch (_) {
                        // We actually don't care at all when resetting
                    }
                }
                log_1.default.info("Init: Removing SourceBuffer from mediaSource");
                mediaSource.removeSourceBuffer(sourceBuffer);
            }
            catch (_) {
                // We actually don't care at all when resetting
            }
        }
        if (sourceBuffers.length > 0) {
            log_1.default.info("Init: Not all SourceBuffers could have been removed.");
        }
    }
}
