import { MediaSource_ } from "../compat/browser_compatibility_types";
import tryToChangeSourceBufferType from "../compat/change_source_buffer_type";
import { onSourceClose, onSourceEnded, onSourceOpen } from "../compat/event_listeners";
import { MediaError, SourceBufferError } from "../errors";
import log from "../log";
import { concat } from "../utils/byte_parsing";
import EventEmitter from "../utils/event_emitter";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import objectAssign from "../utils/object_assign";
import { convertToRanges } from "../utils/ranges";
import TaskCanceller, { CancellationError } from "../utils/task_canceller";
import { maintainEndOfStream } from "./utils/end_of_stream";
import MediaSourceDurationUpdater from "./utils/media_source_duration_updater";
/**
 * `IMediaSourceInterface` object for when the MSE API are directly available.
 * @see IMediaSourceInterface
 * @class {MainMediaSourceInterface}
 */
export default class MainMediaSourceInterface extends EventEmitter {
    /**
     * Creates a new `MainMediaSourceInterface` alongside its `MediaSource` MSE
     * object.
     *
     * You can then obtain a link to that `MediaSource`, for example to link it
     * to an `HTMLMediaElement`, through the `handle` property.
     */
    constructor(id) {
        super();
        this.id = id;
        this.sourceBuffers = [];
        this._canceller = new TaskCanceller();
        if (isNullOrUndefined(MediaSource_)) {
            throw new MediaError("MEDIA_SOURCE_NOT_SUPPORTED", "No MediaSource Object was found in the current browser.");
        }
        log.info("Init: Creating MediaSource");
        const mediaSource = new MediaSource_();
        const handle = mediaSource.handle;
        this.handle = isNullOrUndefined(handle)
            ? /* eslint-disable-next-line @typescript-eslint/ban-types */
                { type: "media-source", value: mediaSource }
            : { type: "handle", value: handle };
        this._mediaSource = mediaSource;
        this.readyState = mediaSource.readyState;
        this._durationUpdater = new MediaSourceDurationUpdater(mediaSource);
        this._endOfStreamCanceller = null;
        onSourceOpen(mediaSource, () => {
            this.readyState = mediaSource.readyState;
            this.trigger("mediaSourceOpen", null);
        }, this._canceller.signal);
        onSourceEnded(mediaSource, () => {
            this.readyState = mediaSource.readyState;
            this.trigger("mediaSourceEnded", null);
        }, this._canceller.signal);
        onSourceClose(mediaSource, () => {
            this.readyState = mediaSource.readyState;
            this.trigger("mediaSourceClose", null);
        }, this._canceller.signal);
    }
    /** @see IMediaSourceInterface */
    addSourceBuffer(sbType, codec) {
        const sourceBuffer = this._mediaSource.addSourceBuffer(codec);
        const sb = new MainSourceBufferInterface(sbType, codec, sourceBuffer);
        this.sourceBuffers.push(sb);
        return sb;
    }
    /** @see IMediaSourceInterface */
    setDuration(newDuration, isRealEndKnown) {
        this._durationUpdater.updateDuration(newDuration, isRealEndKnown);
    }
    /** @see IMediaSourceInterface */
    interruptDurationSetting() {
        this._durationUpdater.stopUpdating();
    }
    /** @see IMediaSourceInterface */
    maintainEndOfStream() {
        if (this._endOfStreamCanceller === null) {
            this._endOfStreamCanceller = new TaskCanceller();
            this._endOfStreamCanceller.linkToSignal(this._canceller.signal);
            log.debug("Init: end-of-stream order received.");
            maintainEndOfStream(this._mediaSource, this._endOfStreamCanceller.signal);
        }
    }
    /** @see IMediaSourceInterface */
    stopEndOfStream() {
        if (this._endOfStreamCanceller !== null) {
            log.debug("Init: resume-stream order received.");
            this._endOfStreamCanceller.cancel();
            this._endOfStreamCanceller = null;
        }
    }
    /** @see IMediaSourceInterface */
    dispose() {
        this.sourceBuffers.forEach((s) => s.dispose());
        this._canceller.cancel();
        resetMediaSource(this._mediaSource);
    }
}
/**
 * `ISourceBufferInterface` object for when the MSE API are directly available.
 * @see ISourceBufferInterface
 * @class {MainSourceBufferInterface}
 */
export class MainSourceBufferInterface {
    /**
     * Creates a new `SourceBufferInterface` linked to the given `SourceBuffer`
     * instance.
     * @param {string} sbType
     * @param {string} codec
     * @param {SourceBuffer} sourceBuffer
     */
    constructor(sbType, codec, sourceBuffer) {
        this.type = sbType;
        this.codec = codec;
        this._canceller = new TaskCanceller();
        this._sourceBuffer = sourceBuffer;
        this._operationQueue = [];
        this._currentOperations = [];
        const onError = (evt) => {
            let error;
            if (evt instanceof Error) {
                error = evt;
            }
            else if (evt.error instanceof Error) {
                error = evt.error;
            }
            else {
                error = new Error("Unknown SourceBuffer Error");
            }
            const currentOps = this._currentOperations;
            this._currentOperations = [];
            if (currentOps.length === 0) {
                log.error("SBI: error for an unknown operation", error);
            }
            else {
                const rejected = new SourceBufferError(error.name, error.message, error.name === "QuotaExceededError");
                for (const op of currentOps) {
                    op.reject(rejected);
                }
            }
        };
        const onUpdateEnd = () => {
            const currentOps = this._currentOperations;
            this._currentOperations = [];
            try {
                for (const op of currentOps) {
                    op.resolve(convertToRanges(this._sourceBuffer.buffered));
                }
            }
            catch (err) {
                for (const op of currentOps) {
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
            this._performNextOperation();
        };
        sourceBuffer.addEventListener("updateend", onUpdateEnd);
        sourceBuffer.addEventListener("error", onError);
        this._canceller.signal.register(() => {
            sourceBuffer.removeEventListener("updateend", onUpdateEnd);
            sourceBuffer.removeEventListener("error", onError);
        });
    }
    /** @see ISourceBufferInterface */
    appendBuffer(...args) {
        log.debug("SBI: receiving order to push data to the SourceBuffer", this.type);
        return this._addToQueue({
            operationName: 0 /* SbiOperationName.Push */,
            params: args,
        });
    }
    /** @see ISourceBufferInterface */
    remove(start, end) {
        log.debug("SBI: receiving order to remove data from the SourceBuffer", this.type, start, end);
        return this._addToQueue({
            operationName: 1 /* SbiOperationName.Remove */,
            params: [start, end],
        });
    }
    /** @see ISourceBufferInterface */
    getBuffered() {
        try {
            return convertToRanges(this._sourceBuffer.buffered);
        }
        catch (err) {
            log.error("Failed to get buffered time range of SourceBuffer", this.type, err instanceof Error ? err : null);
            return [];
        }
    }
    /** @see ISourceBufferInterface */
    abort() {
        try {
            this._sourceBuffer.abort();
        }
        catch (err) {
            log.debug("Init: Failed to abort SourceBuffer:", err instanceof Error ? err : null);
        }
        this._emptyCurrentQueue();
    }
    /** @see ISourceBufferInterface */
    dispose() {
        try {
            this._sourceBuffer.abort();
        }
        catch (_) {
            // we don't care
        }
        this._emptyCurrentQueue();
    }
    _emptyCurrentQueue() {
        const error = new CancellationError();
        if (this._currentOperations.length > 0) {
            this._currentOperations.forEach((op) => {
                op.reject(error);
            });
            this._currentOperations = [];
        }
        if (this._operationQueue.length > 0) {
            this._operationQueue.forEach((op) => {
                op.reject(error);
            });
            this._operationQueue = [];
        }
    }
    _addToQueue(operation) {
        return new Promise((resolve, reject) => {
            const shouldRestartQueue = this._operationQueue.length === 0 && this._currentOperations.length === 0;
            const queueItem = objectAssign({ resolve, reject }, operation);
            this._operationQueue.push(queueItem);
            if (shouldRestartQueue) {
                this._performNextOperation();
            }
        });
    }
    _performNextOperation() {
        var _a, _b, _c, _d, _e;
        if (this._currentOperations.length !== 0 || this._sourceBuffer.updating) {
            return;
        }
        const nextElem = this._operationQueue.shift();
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
            const ogData = nextElem.params[0];
            const params = nextElem.params[1];
            let segmentData = ogData;
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
                let prevU8;
                if (ogData instanceof ArrayBuffer) {
                    prevU8 = new Uint8Array(ogData);
                }
                else if (ogData instanceof Uint8Array) {
                    prevU8 = ogData;
                }
                else {
                    prevU8 = new Uint8Array(ogData.buffer);
                }
                const toConcat = [prevU8];
                while (((_a = this._operationQueue[0]) === null || _a === void 0 ? void 0 : _a.operationName) === 0 /* SbiOperationName.Push */) {
                    const followingElem = this._operationQueue[0];
                    const cAw = (_b = params.appendWindow) !== null && _b !== void 0 ? _b : [undefined, undefined];
                    const fAw = (_c = followingElem.params[1].appendWindow) !== null && _c !== void 0 ? _c : [undefined, undefined];
                    const cTo = (_d = params.timestampOffset) !== null && _d !== void 0 ? _d : 0;
                    const fTo = (_e = followingElem.params[1].timestampOffset) !== null && _e !== void 0 ? _e : 0;
                    if (cAw[0] === fAw[0] &&
                        cAw[1] === fAw[1] &&
                        params.codec === followingElem.params[1].codec &&
                        cTo === fTo) {
                        const newData = followingElem.params[0];
                        let newU8;
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
                    log.info(`MMSI: Merging ${toConcat.length} segments together for perf`, this.type);
                    segmentData = concat(...toConcat);
                }
            }
            try {
                this._appendBufferNow(segmentData, params);
            }
            catch (err) {
                const error = err instanceof Error
                    ? new SourceBufferError(err.name, err.message, err.name === "QuotaExceededError")
                    : new SourceBufferError("Error", "Unknown SourceBuffer Error during appendBuffer", false);
                this._currentOperations.forEach((op) => {
                    op.reject(error);
                });
                this._currentOperations = [];
            }
        }
        else {
            // TODO merge contiguous removes?
            this._currentOperations = [nextElem];
            const [start, end] = nextElem.params;
            log.debug("SBI: removing data from SourceBuffer", this.type, start, end);
            try {
                this._sourceBuffer.remove(start, end);
            }
            catch (err) {
                const error = err instanceof Error
                    ? new SourceBufferError(err.name, err.message, false)
                    : new SourceBufferError("Error", "Unknown SourceBuffer Error during remove", false);
                nextElem.reject(error);
                this._currentOperations = [];
            }
        }
    }
    _appendBufferNow(data, params) {
        const sourceBuffer = this._sourceBuffer;
        const { codec, timestampOffset, appendWindow = [] } = params;
        if (codec !== undefined && codec !== this.codec) {
            log.debug("SBI: updating codec", codec);
            const hasUpdatedSourceBufferType = tryToChangeSourceBufferType(sourceBuffer, codec);
            if (hasUpdatedSourceBufferType) {
                this.codec = codec;
            }
            else {
                log.debug("SBI: could not update codec", codec, this.codec);
            }
        }
        if (timestampOffset !== undefined &&
            sourceBuffer.timestampOffset !== timestampOffset) {
            const newTimestampOffset = timestampOffset;
            log.debug("SBI: updating timestampOffset", codec, sourceBuffer.timestampOffset, newTimestampOffset);
            sourceBuffer.timestampOffset = newTimestampOffset;
        }
        if (appendWindow[0] === undefined) {
            if (sourceBuffer.appendWindowStart > 0) {
                log.debug("SBI: re-setting `appendWindowStart` to `0`");
                sourceBuffer.appendWindowStart = 0;
            }
        }
        else if (appendWindow[0] !== sourceBuffer.appendWindowStart) {
            if (appendWindow[0] >= sourceBuffer.appendWindowEnd) {
                const newTmpEnd = appendWindow[0] + 1;
                log.debug("SBI: pre-updating `appendWindowEnd`", newTmpEnd);
                sourceBuffer.appendWindowEnd = newTmpEnd;
            }
            log.debug("SBI: setting `appendWindowStart`", appendWindow[0]);
            sourceBuffer.appendWindowStart = appendWindow[0];
        }
        if (appendWindow[1] === undefined) {
            if (sourceBuffer.appendWindowEnd !== Infinity) {
                log.debug("SBI: re-setting `appendWindowEnd` to `Infinity`");
                sourceBuffer.appendWindowEnd = Infinity;
            }
        }
        else if (appendWindow[1] !== sourceBuffer.appendWindowEnd) {
            log.debug("SBI: setting `appendWindowEnd`", appendWindow[1]);
            sourceBuffer.appendWindowEnd = appendWindow[1];
        }
        log.debug("SBI: pushing segment", this.type);
        sourceBuffer.appendBuffer(data);
    }
}
function resetMediaSource(mediaSource) {
    if (mediaSource.readyState !== "closed") {
        const { readyState, sourceBuffers } = mediaSource;
        for (let i = sourceBuffers.length - 1; i >= 0; i--) {
            const sourceBuffer = sourceBuffers[i];
            try {
                if (readyState === "open") {
                    log.info("Init: Aborting SourceBuffer before removing");
                    try {
                        sourceBuffer.abort();
                    }
                    catch (_) {
                        // We actually don't care at all when resetting
                    }
                }
                log.info("Init: Removing SourceBuffer from mediaSource");
                mediaSource.removeSourceBuffer(sourceBuffer);
            }
            catch (_) {
                // We actually don't care at all when resetting
            }
        }
        if (sourceBuffers.length > 0) {
            log.info("Init: Not all SourceBuffers could have been removed.");
        }
    }
}
