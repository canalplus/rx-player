import { SourceBufferError } from "../errors";
import log from "../log";
import EventEmitter from "../utils/event_emitter";
import idGenerator from "../utils/id_generator";
import TaskCanceller, { CancellationError } from "../utils/task_canceller";
const generateMediaSourceId = idGenerator();
const generateSourceBufferOperationId = idGenerator();
/**
 * We may maintain a worker-side queue to avoid overwhelming the main thread
 * with sent media segments. This queue maximum size if stored in that value.
 *
 * To set to `Infinity` to disable.
 */
const MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE = Infinity;
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
export default class WorkerMediaSourceInterface extends EventEmitter {
    constructor(id, contentId, messageSender) {
        super();
        this.id = id;
        this.sourceBuffers = [];
        this._canceller = new TaskCanceller();
        this.readyState = "closed";
        this._messageSender = messageSender;
        const mediaSourceId = generateMediaSourceId();
        this._messageSender({
            type: "create-media-source" /* WorkerMessageType.CreateMediaSource */,
            contentId,
            mediaSourceId,
        });
    }
    onMediaSourceReadyStateChanged(readyState) {
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
    }
    addSourceBuffer(sbType, codec) {
        this._messageSender({
            type: "add-source-buffer" /* WorkerMessageType.AddSourceBuffer */,
            mediaSourceId: this.id,
            value: {
                sourceBufferType: sbType,
                codec,
            },
        });
        const sb = new WorkerSourceBufferInterface(sbType, codec, this.id, this._messageSender);
        this.sourceBuffers.push(sb);
        return sb;
    }
    setDuration(newDuration, isRealEndKnown) {
        this._messageSender({
            type: "update-media-source-duration" /* WorkerMessageType.UpdateMediaSourceDuration */,
            mediaSourceId: this.id,
            value: {
                duration: newDuration,
                isRealEndKnown,
            },
        });
    }
    interruptDurationSetting() {
        this._messageSender({
            type: "stop-media-source-duration" /* WorkerMessageType.InterruptMediaSourceDurationUpdate */,
            mediaSourceId: this.id,
            value: null,
        });
    }
    maintainEndOfStream() {
        this._messageSender({
            type: "end-of-stream" /* WorkerMessageType.EndOfStream */,
            mediaSourceId: this.id,
            value: null,
        });
    }
    stopEndOfStream() {
        this._messageSender({
            type: "stop-end-of-stream" /* WorkerMessageType.InterruptEndOfStream */,
            mediaSourceId: this.id,
            value: null,
        });
    }
    dispose() {
        this.sourceBuffers.forEach((s) => s.dispose());
        this._canceller.cancel();
        this._messageSender({
            type: "dispose-media-source" /* WorkerMessageType.DisposeMediaSource */,
            mediaSourceId: this.id,
            value: null,
        });
    }
}
export class WorkerSourceBufferInterface {
    constructor(sbType, codec, mediaSourceId, messageSender) {
        this.type = sbType;
        this.codec = codec;
        this._canceller = new TaskCanceller();
        this._mediaSourceId = mediaSourceId;
        this._queuedOperations = [];
        this._pendingOperations = new Map();
        this._messageSender = messageSender;
    }
    onOperationSuccess(operationId, ranges) {
        const mapElt = this._pendingOperations.get(operationId);
        if (mapElt === undefined) {
            log.warn("SBI: unknown SourceBuffer operation succeeded");
        }
        else {
            this._pendingOperations.delete(operationId);
            mapElt.resolve(ranges);
        }
        this._performNextQueuedOperationIfItExists();
    }
    onOperationFailure(operationId, error) {
        const formattedErr = error.errorName === "CancellationError"
            ? new CancellationError()
            : new SourceBufferError(error.errorName, error.message, error.isBufferFull);
        const mapElt = this._pendingOperations.get(operationId);
        if (mapElt === undefined) {
            log.info("SBI: unknown SourceBuffer operation failed", formattedErr);
        }
        else {
            this._pendingOperations.delete(operationId);
            mapElt.reject(formattedErr);
        }
        const cancellationError = new CancellationError();
        for (const operation of this._queuedOperations) {
            operation.reject(cancellationError);
        }
        this._queuedOperations = [];
    }
    appendBuffer(data, params) {
        return new Promise((resolve, reject) => {
            if (this._queuedOperations.length > 0 ||
                this._pendingOperations.size >= MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE) {
                this._queuedOperations.push({
                    operationName: 0 /* SbiOperationName.Push */,
                    params: [data, params],
                    resolve,
                    reject,
                });
                return;
            }
            try {
                let segmentSinkPushed;
                if (data instanceof ArrayBuffer) {
                    segmentSinkPushed = data;
                }
                else if (data.byteLength === data.buffer.byteLength) {
                    segmentSinkPushed = data.buffer;
                }
                else {
                    segmentSinkPushed = data.buffer.slice(data.byteOffset, data.byteLength + data.byteOffset);
                }
                const operationId = generateSourceBufferOperationId();
                this._messageSender({
                    type: "source-buffer-append" /* WorkerMessageType.SourceBufferAppend */,
                    mediaSourceId: this._mediaSourceId,
                    sourceBufferType: this.type,
                    operationId,
                    value: {
                        data: segmentSinkPushed,
                        params,
                    },
                }, [segmentSinkPushed]);
                this._addOperationToQueue(operationId, resolve, reject);
            }
            catch (err) {
                reject(err);
            }
        });
    }
    remove(start, end) {
        return new Promise((resolve, reject) => {
            if (this._queuedOperations.length > 0 ||
                this._pendingOperations.size >= MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE) {
                this._queuedOperations.push({
                    operationName: 1 /* SbiOperationName.Remove */,
                    params: [start, end],
                    resolve,
                    reject,
                });
                return;
            }
            try {
                const operationId = generateSourceBufferOperationId();
                this._messageSender({
                    type: "source-buffer-remove" /* WorkerMessageType.SourceBufferRemove */,
                    mediaSourceId: this._mediaSourceId,
                    sourceBufferType: this.type,
                    operationId,
                    value: {
                        start,
                        end,
                    },
                });
                this._addOperationToQueue(operationId, resolve, reject);
            }
            catch (err) {
                reject(err);
            }
        });
    }
    abort() {
        this._messageSender({
            type: "abort-source-buffer" /* WorkerMessageType.AbortSourceBuffer */,
            mediaSourceId: this._mediaSourceId,
            sourceBufferType: this.type,
            value: null,
        });
    }
    dispose() {
        this.abort();
        this._canceller.cancel();
    }
    getBuffered() {
        return;
    }
    _addOperationToQueue(operationId, resolve, reject) {
        this._pendingOperations.set(operationId, {
            resolve: onResolve,
            reject: onReject,
        });
        const unbindCanceller = this._canceller.signal.register((error) => {
            this._pendingOperations.delete(operationId);
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
    }
    _performNextQueuedOperationIfItExists() {
        const nextOp = this._queuedOperations.shift();
        if (nextOp !== undefined) {
            try {
                if (nextOp.operationName === 0 /* SbiOperationName.Push */) {
                    const [data, params] = nextOp.params;
                    let segmentSinkPushed;
                    if (data instanceof ArrayBuffer) {
                        segmentSinkPushed = data;
                    }
                    else if (data.byteLength === data.buffer.byteLength) {
                        segmentSinkPushed = data.buffer;
                    }
                    else {
                        segmentSinkPushed = data.buffer.slice(data.byteOffset, data.byteLength + data.byteOffset);
                    }
                    const nOpId = generateSourceBufferOperationId();
                    this._messageSender({
                        type: "source-buffer-append" /* WorkerMessageType.SourceBufferAppend */,
                        mediaSourceId: this._mediaSourceId,
                        sourceBufferType: this.type,
                        operationId: nOpId,
                        value: {
                            data: segmentSinkPushed,
                            params,
                        },
                    }, [segmentSinkPushed]);
                    this._addOperationToQueue(nOpId, nextOp.resolve, nextOp.reject);
                }
                else {
                    const [start, end] = nextOp.params;
                    const nOpId = generateSourceBufferOperationId();
                    this._messageSender({
                        type: "source-buffer-remove" /* WorkerMessageType.SourceBufferRemove */,
                        mediaSourceId: this._mediaSourceId,
                        sourceBufferType: this.type,
                        operationId: nOpId,
                        value: {
                            start,
                            end,
                        },
                    });
                    this._addOperationToQueue(nOpId, nextOp.resolve, nextOp.reject);
                }
            }
            catch (err) {
                nextOp.reject(err);
            }
        }
    }
}
