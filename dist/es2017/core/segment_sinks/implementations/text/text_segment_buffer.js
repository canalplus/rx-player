import log from "../../../../log";
import getMonotonicTimeStamp from "../../../../utils/monotonic_timestamp";
import { SegmentSink, SegmentSinkOperation } from "../types";
/**
 * SegmentSink implementation to add text data, most likely subtitles.
 * @class TextSegmentSink
 */
export default class TextSegmentSink extends SegmentSink {
    /**
     * @param {Object} textDisplayerSender
     */
    constructor(textDisplayerSender) {
        log.debug("HTSB: Creating TextSegmentSink");
        super();
        this.bufferType = "text";
        this._sender = textDisplayerSender;
        this._pendingOperations = [];
        this._sender.reset();
    }
    /**
     * @param {string} uniqueId
     */
    declareInitSegment(uniqueId) {
        log.warn("HTSB: Declaring initialization segment for  Text SegmentSink", uniqueId);
    }
    /**
     * @param {string} uniqueId
     */
    freeInitSegment(uniqueId) {
        log.warn("HTSB: Freeing initialization segment for  Text SegmentSink", uniqueId);
    }
    /**
     * Push text segment to the TextSegmentSink.
     * @param {Object} infos
     * @returns {Promise}
     */
    async pushChunk(infos) {
        const { data } = infos;
        assertChunkIsTextTrackSegmentData(data.chunk);
        // Needed for TypeScript :(
        const promise = this._sender.pushTextData(Object.assign(Object.assign({}, data), { chunk: data.chunk }));
        this._addToOperationQueue(promise, {
            type: SegmentSinkOperation.Push,
            value: infos,
        });
        const ranges = await promise;
        if (infos.inventoryInfos !== null) {
            this._segmentInventory.insertChunk(infos.inventoryInfos, true, getMonotonicTimeStamp());
        }
        this._segmentInventory.synchronizeBuffered(ranges);
        return ranges;
    }
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Promise}
     */
    async removeBuffer(start, end) {
        const promise = this._sender.remove(start, end);
        this._addToOperationQueue(promise, {
            type: SegmentSinkOperation.Remove,
            value: { start, end },
        });
        const ranges = await promise;
        this._segmentInventory.synchronizeBuffered(ranges);
        return ranges;
    }
    /**
     * @param {Object} infos
     * @returns {Promise}
     */
    async signalSegmentComplete(infos) {
        if (this._pendingOperations.length > 0) {
            // Only validate after preceding operation
            const { promise } = this._pendingOperations[this._pendingOperations.length - 1];
            this._addToOperationQueue(promise, {
                type: SegmentSinkOperation.SignalSegmentComplete,
                value: infos,
            });
            try {
                await promise;
            }
            catch (_) {
                // We don't really care of what happens of the preceding operation here
            }
        }
        this._segmentInventory.completeSegment(infos);
    }
    /**
     * @returns {Array.<Object>}
     */
    getPendingOperations() {
        return this._pendingOperations.map((p) => p.operation);
    }
    dispose() {
        log.debug("HTSB: Disposing TextSegmentSink");
        this._sender.reset();
    }
    _addToOperationQueue(promise, operation) {
        const queueObject = { operation, promise };
        this._pendingOperations.push(queueObject);
        const endOperation = () => {
            const indexOf = this._pendingOperations.indexOf(queueObject);
            if (indexOf >= 0) {
                this._pendingOperations.splice(indexOf, 1);
            }
        };
        promise.then(endOperation, endOperation); // `finally` not supported everywhere
    }
}
/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} chunk
 */
function assertChunkIsTextTrackSegmentData(chunk) {
    if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 0 /* __ENVIRONMENT__.PRODUCTION */) {
        return;
    }
    if (typeof chunk !== "object" ||
        chunk === null ||
        typeof chunk.data !== "string" ||
        typeof chunk.type !== "string" ||
        (chunk.language !== undefined &&
            typeof chunk.language !== "string") ||
        (chunk.start !== undefined &&
            typeof chunk.start !== "number") ||
        (chunk.end !== undefined &&
            typeof chunk.end !== "number")) {
        throw new Error("Invalid format given to a TextSegmentSink");
    }
}
/*
 * The following ugly code is here to provide a compile-time check that an
 * `ITextTracksBufferSegmentData` (type of data pushed to a
 * `TextSegmentSink`) can be derived from a `ITextTrackSegmentData`
 * (text track data parsed from a segment).
 *
 * It doesn't correspond at all to real code that will be called. This is just
 * a hack to tell TypeScript to perform that check.
 */
if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    function _checkType(input) {
        function checkEqual(_arg) {
            /* nothing */
        }
        checkEqual(input);
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
    /* eslint-enable @typescript-eslint/ban-ts-comment */
}
