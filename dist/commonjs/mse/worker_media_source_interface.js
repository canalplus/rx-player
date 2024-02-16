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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerSourceBufferInterface = void 0;
var errors_1 = require("../errors");
var log_1 = require("../log");
var event_emitter_1 = require("../utils/event_emitter");
var id_generator_1 = require("../utils/id_generator");
var task_canceller_1 = require("../utils/task_canceller");
var generateMediaSourceId = (0, id_generator_1.default)();
var generateSourceBufferOperationId = (0, id_generator_1.default)();
/**
 * We may maintain a worker-side queue to avoid overwhelming the main thread
 * with sent media segments. This queue maximum size if stored in that value.
 *
 * To set to `Infinity` to disable.
 */
var MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE = Infinity;
/**
 * Interface to the MediaSource browser APIs of the Media Source Extentions for
 * a WebWorker environment where MSE API are not available (if MSE API are
 * available in WebWorker in the current environment you don't have to rely on
 * this class).
 *
 * What this class actually does for most MSE API is to post a message
 * corresponding to the wanted action - which will have to be processed on the
 * main thread.
 * @class {WorkerMediaSourceInterface}
 */
var WorkerMediaSourceInterface = /** @class */ (function (_super) {
    __extends(WorkerMediaSourceInterface, _super);
    function WorkerMediaSourceInterface(id, contentId, messageSender) {
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.sourceBuffers = [];
        _this._canceller = new task_canceller_1.default();
        _this.readyState = "closed";
        _this._messageSender = messageSender;
        var mediaSourceId = generateMediaSourceId();
        _this._messageSender({
            type: "create-media-source" /* WorkerMessageType.CreateMediaSource */,
            contentId: contentId,
            mediaSourceId: mediaSourceId,
        });
        return _this;
    }
    WorkerMediaSourceInterface.prototype.onMediaSourceReadyStateChanged = function (readyState) {
        switch (readyState) {
            case "closed":
                this.readyState = "closed";
                this.trigger("mediaSourceClose", null);
                break;
            case "open":
                this.readyState = "open";
                this.trigger("mediaSourceOpen", null);
                break;
            case "ended":
                this.readyState = "ended";
                this.trigger("mediaSourceEnded", null);
                break;
        }
    };
    WorkerMediaSourceInterface.prototype.addSourceBuffer = function (sbType, codec) {
        this._messageSender({
            type: "add-source-buffer" /* WorkerMessageType.AddSourceBuffer */,
            mediaSourceId: this.id,
            value: {
                sourceBufferType: sbType,
                codec: codec,
            },
        });
        var sb = new WorkerSourceBufferInterface(sbType, codec, this.id, this._messageSender);
        this.sourceBuffers.push(sb);
        return sb;
    };
    WorkerMediaSourceInterface.prototype.setDuration = function (newDuration, isRealEndKnown) {
        this._messageSender({
            type: "update-media-source-duration" /* WorkerMessageType.UpdateMediaSourceDuration */,
            mediaSourceId: this.id,
            value: {
                duration: newDuration,
                isRealEndKnown: isRealEndKnown,
            },
        });
    };
    WorkerMediaSourceInterface.prototype.interruptDurationSetting = function () {
        this._messageSender({
            type: "stop-media-source-duration" /* WorkerMessageType.InterruptMediaSourceDurationUpdate */,
            mediaSourceId: this.id,
            value: null,
        });
    };
    WorkerMediaSourceInterface.prototype.maintainEndOfStream = function () {
        this._messageSender({
            type: "end-of-stream" /* WorkerMessageType.EndOfStream */,
            mediaSourceId: this.id,
            value: null,
        });
    };
    WorkerMediaSourceInterface.prototype.stopEndOfStream = function () {
        this._messageSender({
            type: "stop-end-of-stream" /* WorkerMessageType.InterruptEndOfStream */,
            mediaSourceId: this.id,
            value: null,
        });
    };
    WorkerMediaSourceInterface.prototype.dispose = function () {
        this.sourceBuffers.forEach(function (s) { return s.dispose(); });
        this._canceller.cancel();
        this._messageSender({
            type: "dispose-media-source" /* WorkerMessageType.DisposeMediaSource */,
            mediaSourceId: this.id,
            value: null,
        });
    };
    return WorkerMediaSourceInterface;
}(event_emitter_1.default));
exports.default = WorkerMediaSourceInterface;
var WorkerSourceBufferInterface = /** @class */ (function () {
    function WorkerSourceBufferInterface(sbType, codec, mediaSourceId, messageSender) {
        this.type = sbType;
        this.codec = codec;
        this._canceller = new task_canceller_1.default();
        this._mediaSourceId = mediaSourceId;
        this._queuedOperations = [];
        this._pendingOperations = new Map();
        this._messageSender = messageSender;
    }
    WorkerSourceBufferInterface.prototype.onOperationSuccess = function (operationId, ranges) {
        var mapElt = this._pendingOperations.get(operationId);
        if (mapElt === undefined) {
            log_1.default.warn("SBI: unknown SourceBuffer operation succeeded");
        }
        else {
            this._pendingOperations.delete(operationId);
            mapElt.resolve(ranges);
        }
        this._performNextQueuedOperationIfItExists();
    };
    WorkerSourceBufferInterface.prototype.onOperationFailure = function (operationId, error) {
        var e_1, _a;
        var formattedErr = error.errorName === "CancellationError"
            ? new task_canceller_1.CancellationError()
            : new errors_1.SourceBufferError(error.errorName, error.message, error.isBufferFull);
        var mapElt = this._pendingOperations.get(operationId);
        if (mapElt === undefined) {
            log_1.default.info("SBI: unknown SourceBuffer operation failed", formattedErr);
        }
        else {
            this._pendingOperations.delete(operationId);
            mapElt.reject(formattedErr);
        }
        var cancellationError = new task_canceller_1.CancellationError();
        try {
            for (var _b = __values(this._queuedOperations), _c = _b.next(); !_c.done; _c = _b.next()) {
                var operation = _c.value;
                operation.reject(cancellationError);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this._queuedOperations = [];
    };
    WorkerSourceBufferInterface.prototype.appendBuffer = function (data, params) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this._queuedOperations.length > 0 ||
                _this._pendingOperations.size >= MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE) {
                _this._queuedOperations.push({
                    operationName: 0 /* SbiOperationName.Push */,
                    params: [data, params],
                    resolve: resolve,
                    reject: reject,
                });
                return;
            }
            try {
                var segmentSinkPushed = void 0;
                if (data instanceof ArrayBuffer) {
                    segmentSinkPushed = data;
                }
                else if (data.byteLength === data.buffer.byteLength) {
                    segmentSinkPushed = data.buffer;
                }
                else {
                    segmentSinkPushed = data.buffer.slice(data.byteOffset, data.byteLength + data.byteOffset);
                }
                var operationId = generateSourceBufferOperationId();
                _this._messageSender({
                    type: "source-buffer-append" /* WorkerMessageType.SourceBufferAppend */,
                    mediaSourceId: _this._mediaSourceId,
                    sourceBufferType: _this.type,
                    operationId: operationId,
                    value: {
                        data: segmentSinkPushed,
                        params: params,
                    },
                }, [segmentSinkPushed]);
                _this._addOperationToQueue(operationId, resolve, reject);
            }
            catch (err) {
                reject(err);
            }
        });
    };
    WorkerSourceBufferInterface.prototype.remove = function (start, end) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this._queuedOperations.length > 0 ||
                _this._pendingOperations.size >= MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE) {
                _this._queuedOperations.push({
                    operationName: 1 /* SbiOperationName.Remove */,
                    params: [start, end],
                    resolve: resolve,
                    reject: reject,
                });
                return;
            }
            try {
                var operationId = generateSourceBufferOperationId();
                _this._messageSender({
                    type: "source-buffer-remove" /* WorkerMessageType.SourceBufferRemove */,
                    mediaSourceId: _this._mediaSourceId,
                    sourceBufferType: _this.type,
                    operationId: operationId,
                    value: {
                        start: start,
                        end: end,
                    },
                });
                _this._addOperationToQueue(operationId, resolve, reject);
            }
            catch (err) {
                reject(err);
            }
        });
    };
    WorkerSourceBufferInterface.prototype.abort = function () {
        this._messageSender({
            type: "abort-source-buffer" /* WorkerMessageType.AbortSourceBuffer */,
            mediaSourceId: this._mediaSourceId,
            sourceBufferType: this.type,
            value: null,
        });
    };
    WorkerSourceBufferInterface.prototype.dispose = function () {
        this.abort();
        this._canceller.cancel();
    };
    WorkerSourceBufferInterface.prototype.getBuffered = function () {
        return;
    };
    WorkerSourceBufferInterface.prototype._addOperationToQueue = function (operationId, resolve, reject) {
        var _this = this;
        this._pendingOperations.set(operationId, {
            resolve: onResolve,
            reject: onReject,
        });
        var unbindCanceller = this._canceller.signal.register(function (error) {
            _this._pendingOperations.delete(operationId);
            reject(error);
        });
        function onResolve(ranges) {
            unbindCanceller();
            resolve(ranges);
        }
        function onReject(err) {
            unbindCanceller();
            reject(err);
        }
    };
    WorkerSourceBufferInterface.prototype._performNextQueuedOperationIfItExists = function () {
        var nextOp = this._queuedOperations.shift();
        if (nextOp !== undefined) {
            try {
                if (nextOp.operationName === 0 /* SbiOperationName.Push */) {
                    var _a = __read(nextOp.params, 2), data = _a[0], params = _a[1];
                    var segmentSinkPushed = void 0;
                    if (data instanceof ArrayBuffer) {
                        segmentSinkPushed = data;
                    }
                    else if (data.byteLength === data.buffer.byteLength) {
                        segmentSinkPushed = data.buffer;
                    }
                    else {
                        segmentSinkPushed = data.buffer.slice(data.byteOffset, data.byteLength + data.byteOffset);
                    }
                    var nOpId = generateSourceBufferOperationId();
                    this._messageSender({
                        type: "source-buffer-append" /* WorkerMessageType.SourceBufferAppend */,
                        mediaSourceId: this._mediaSourceId,
                        sourceBufferType: this.type,
                        operationId: nOpId,
                        value: {
                            data: segmentSinkPushed,
                            params: params,
                        },
                    }, [segmentSinkPushed]);
                    this._addOperationToQueue(nOpId, nextOp.resolve, nextOp.reject);
                }
                else {
                    var _b = __read(nextOp.params, 2), start = _b[0], end = _b[1];
                    var nOpId = generateSourceBufferOperationId();
                    this._messageSender({
                        type: "source-buffer-remove" /* WorkerMessageType.SourceBufferRemove */,
                        mediaSourceId: this._mediaSourceId,
                        sourceBufferType: this.type,
                        operationId: nOpId,
                        value: {
                            start: start,
                            end: end,
                        },
                    });
                    this._addOperationToQueue(nOpId, nextOp.resolve, nextOp.reject);
                }
            }
            catch (err) {
                nextOp.reject(err);
            }
        }
    };
    return WorkerSourceBufferInterface;
}());
exports.WorkerSourceBufferInterface = WorkerSourceBufferInterface;
