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
/**
 * This file allows to create RepresentationStreams.
 *
 * A RepresentationStream downloads and push segment for a single
 * Representation (e.g. a single video stream of a given quality).
 * It chooses which segments should be downloaded according to the current
 * position and what is currently buffered.
 */
var config_1 = require("../../../config");
var log_1 = require("../../../log");
var object_assign_1 = require("../../../utils/object_assign");
var reference_1 = require("../../../utils/reference");
var task_canceller_1 = require("../../../utils/task_canceller");
var downloading_queue_1 = require("./utils/downloading_queue");
var get_buffer_status_1 = require("./utils/get_buffer_status");
var get_segment_priority_1 = require("./utils/get_segment_priority");
var push_init_segment_1 = require("./utils/push_init_segment");
var push_media_segment_1 = require("./utils/push_media_segment");
/**
 * Perform the logic to load the right segments for the given Representation and
 * push them to the given `SegmentSink`.
 *
 * In essence, this is the entry point of the core streaming logic of the
 * RxPlayer, the one actually responsible for finding which are the current
 * right segments to load, loading them, and pushing them so they can be decoded.
 *
 * Multiple RepresentationStream can run on the same SegmentSink.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} args - Various arguments allowing to know which segments to
 * load, loading them and pushing them.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `RepresentationStream` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `RepresentationStream` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `RepresentationStream`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, until the `terminating` callback has been triggered AND all loaded
 * segments have been pushed, or until the `error` callback is called, whichever
 * comes first.
 * @param {Object} parentCancelSignal - `CancellationSignal` allowing, when
 * triggered, to immediately stop all operations the `RepresentationStream` is
 * doing.
 */
function RepresentationStream(_a, callbacks, parentCancelSignal) {
    var content = _a.content, options = _a.options, playbackObserver = _a.playbackObserver, segmentSink = _a.segmentSink, segmentFetcher = _a.segmentFetcher, terminate = _a.terminate;
    var period = content.period, adaptation = content.adaptation, representation = content.representation;
    var bufferGoal = options.bufferGoal, maxBufferSize = options.maxBufferSize, drmSystemId = options.drmSystemId, canFilterProtectionData = options.canFilterProtectionData, fastSwitchThreshold = options.fastSwitchThreshold;
    var bufferType = adaptation.type;
    /** `TaskCanceller` stopping ALL operations performed by the `RepresentationStream` */
    var globalCanceller = new task_canceller_1.default();
    globalCanceller.linkToSignal(parentCancelSignal);
    /**
     * `TaskCanceller` allowing to only stop segment loading and checking operations.
     * This allows to stop only tasks linked to network resource usage, which is
     * often a limited resource, while still letting buffer operations to finish.
     */
    var segmentsLoadingCanceller = new task_canceller_1.default();
    segmentsLoadingCanceller.linkToSignal(globalCanceller.signal);
    /** Saved initialization segment state for this representation. */
    var initSegmentState = {
        segment: representation.index.getInitSegment(),
        uniqueId: null,
        isLoaded: false,
    };
    globalCanceller.signal.register(function () {
        // Free initialization segment if one has been declared
        if (initSegmentState.uniqueId !== null) {
            segmentSink.freeInitSegment(initSegmentState.uniqueId);
        }
    });
    /** Emit the last scheduled downloading queue for segments. */
    var lastSegmentQueue = new reference_1.default({
        initSegment: null,
        segmentQueue: [],
    }, segmentsLoadingCanceller.signal);
    /** If `true`, the current Representation has a linked initialization segment. */
    var hasInitSegment = initSegmentState.segment !== null;
    if (!hasInitSegment) {
        initSegmentState.isLoaded = true;
    }
    /**
     * `true` if the event notifying about encryption data has already been
     * constructed.
     * Allows to avoid sending multiple times protection events.
     */
    var hasSentEncryptionData = false;
    // If the DRM system id is already known, and if we already have encryption data
    // for it, we may not need to wait until the initialization segment is loaded to
    // signal required protection data, thus performing License negotiations sooner
    if (canFilterProtectionData && drmSystemId !== undefined) {
        var encryptionData = representation.getEncryptionData(drmSystemId);
        // If some key ids are not known yet, it may be safer to wait for this initialization
        // segment to be loaded first
        if (encryptionData.length > 0 &&
            encryptionData.every(function (e) { return e.keyIds !== undefined; })) {
            hasSentEncryptionData = true;
            callbacks.encryptionDataEncountered(encryptionData.map(function (d) { return (0, object_assign_1.default)({ content: content }, d); }));
            if (globalCanceller.isUsed()) {
                return; // previous callback has stopped everything by side-effect
            }
        }
    }
    /** Will load every segments in `lastSegmentQueue` */
    var downloadingQueue = new downloading_queue_1.default(content, lastSegmentQueue, segmentFetcher, hasInitSegment);
    downloadingQueue.addEventListener("error", function (err) {
        if (segmentsLoadingCanceller.signal.isCancelled()) {
            return; // ignore post requests-cancellation loading-related errors,
        }
        globalCanceller.cancel(); // Stop every operations
        callbacks.error(err);
    });
    downloadingQueue.addEventListener("parsedInitSegment", onParsedChunk);
    downloadingQueue.addEventListener("parsedMediaSegment", onParsedChunk);
    downloadingQueue.addEventListener("emptyQueue", checkStatus);
    downloadingQueue.addEventListener("requestRetry", function (payload) {
        callbacks.warning(payload.error);
        if (segmentsLoadingCanceller.signal.isCancelled()) {
            return; // If the previous callback led to loading operations being stopped, skip
        }
        var retriedSegment = payload.segment;
        var index = representation.index;
        if (index.isSegmentStillAvailable(retriedSegment) === false) {
            checkStatus();
        }
        else if (index.canBeOutOfSyncError(payload.error, retriedSegment)) {
            callbacks.manifestMightBeOufOfSync();
        }
    });
    downloadingQueue.addEventListener("fullyLoadedSegment", function (segment) {
        segmentSink
            .signalSegmentComplete((0, object_assign_1.default)({ segment: segment }, content))
            .catch(onFatalBufferError);
    });
    downloadingQueue.start();
    segmentsLoadingCanceller.signal.register(function () {
        downloadingQueue.removeEventListener();
        downloadingQueue.stop();
    });
    playbackObserver.listen(checkStatus, {
        includeLastObservation: false,
        clearSignal: segmentsLoadingCanceller.signal,
    });
    content.manifest.addEventListener("manifestUpdate", checkStatus, segmentsLoadingCanceller.signal);
    bufferGoal.onUpdate(checkStatus, {
        emitCurrentValue: false,
        clearSignal: segmentsLoadingCanceller.signal,
    });
    maxBufferSize.onUpdate(checkStatus, {
        emitCurrentValue: false,
        clearSignal: segmentsLoadingCanceller.signal,
    });
    terminate.onUpdate(checkStatus, {
        emitCurrentValue: false,
        clearSignal: segmentsLoadingCanceller.signal,
    });
    checkStatus();
    return;
    /**
     * Produce a buffer status update synchronously on call, update the list
     * of current segments to update and check various buffer and manifest related
     * issues at the current time, calling the right callbacks if necessary.
     */
    function checkStatus() {
        if (segmentsLoadingCanceller.isUsed()) {
            return; // Stop all buffer status checking if load operations are stopped
        }
        var observation = playbackObserver.getReference().getValue();
        var initialWantedTime = observation.position.getWanted();
        var status = (0, get_buffer_status_1.default)(content, initialWantedTime, playbackObserver, fastSwitchThreshold.getValue(), bufferGoal.getValue(), maxBufferSize.getValue(), segmentSink);
        var neededSegments = status.neededSegments;
        var neededInitSegment = null;
        // Add initialization segment if required
        if (!representation.index.isInitialized()) {
            if (initSegmentState.segment === null) {
                log_1.default.warn("Stream: Uninitialized index without an initialization segment");
            }
            else if (initSegmentState.isLoaded) {
                log_1.default.warn("Stream: Uninitialized index with an already loaded " +
                    "initialization segment");
            }
            else {
                var wantedStart = observation.position.getWanted();
                neededInitSegment = {
                    segment: initSegmentState.segment,
                    priority: (0, get_segment_priority_1.default)(period.start, wantedStart),
                };
            }
        }
        else if (neededSegments.length > 0 &&
            !initSegmentState.isLoaded &&
            initSegmentState.segment !== null) {
            var initSegmentPriority = neededSegments[0].priority;
            neededInitSegment = {
                segment: initSegmentState.segment,
                priority: initSegmentPriority,
            };
        }
        var terminateVal = terminate.getValue();
        if (terminateVal === null) {
            lastSegmentQueue.setValue({
                initSegment: neededInitSegment,
                segmentQueue: neededSegments,
            });
        }
        else if (terminateVal.urgent) {
            log_1.default.debug("Stream: Urgent switch, terminate now.", bufferType);
            lastSegmentQueue.setValue({ initSegment: null, segmentQueue: [] });
            lastSegmentQueue.finish();
            segmentsLoadingCanceller.cancel();
            callbacks.terminating();
            return;
        }
        else {
            // Non-urgent termination wanted:
            // End the download of the current media segment if pending and
            // terminate once either that request is finished or another segment
            // is wanted instead, whichever comes first.
            var mostNeededSegment = neededSegments[0];
            var initSegmentRequest = downloadingQueue.getRequestedInitSegment();
            var currentSegmentRequest = downloadingQueue.getRequestedMediaSegment();
            var nextQueue = currentSegmentRequest === null ||
                mostNeededSegment === undefined ||
                currentSegmentRequest.id !== mostNeededSegment.segment.id
                ? []
                : [mostNeededSegment];
            var nextInit = initSegmentRequest === null ? null : neededInitSegment;
            lastSegmentQueue.setValue({
                initSegment: nextInit,
                segmentQueue: nextQueue,
            });
            if (nextQueue.length === 0 && nextInit === null) {
                log_1.default.debug("Stream: No request left, terminate", bufferType);
                lastSegmentQueue.finish();
                segmentsLoadingCanceller.cancel();
                callbacks.terminating();
                return;
            }
        }
        callbacks.streamStatusUpdate({
            period: period,
            position: observation.position.getWanted(),
            bufferType: bufferType,
            imminentDiscontinuity: status.imminentDiscontinuity,
            isEmptyStream: false,
            hasFinishedLoading: status.hasFinishedLoading,
            neededSegments: status.neededSegments,
        });
        if (segmentsLoadingCanceller.signal.isCancelled()) {
            return; // previous callback has stopped loading operations by side-effect
        }
        var UPTO_CURRENT_POSITION_CLEANUP = config_1.default.getCurrent().UPTO_CURRENT_POSITION_CLEANUP;
        if (status.isBufferFull) {
            var gcedPosition = Math.max(0, initialWantedTime - UPTO_CURRENT_POSITION_CLEANUP);
            if (gcedPosition > 0) {
                segmentSink.removeBuffer(0, gcedPosition).catch(onFatalBufferError);
            }
        }
        if (status.shouldRefreshManifest) {
            callbacks.needsManifestRefresh();
        }
    }
    /**
     * Process a chunk that has just been parsed by pushing it to the
     * SegmentSink and emitting the right events.
     * @param {Object} evt
     */
    function onParsedChunk(evt) {
        var e_1, _a;
        if (globalCanceller.isUsed()) {
            // We should not do anything with segments if the `RepresentationStream`
            // is not running anymore.
            return;
        }
        try {
            // Supplementary encryption information might have been parsed.
            for (var _b = __values(evt.protectionData), _c = _b.next(); !_c.done; _c = _b.next()) {
                var protInfo = _c.value;
                // TODO better handle use cases like key rotation by not always grouping
                // every protection data together? To check.
                representation.addProtectionData(protInfo.initDataType, protInfo.keyId, protInfo.initData);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Now that the initialization segment has been parsed - which may have
        // included encryption information - take care of the encryption event
        // if not already done.
        if (!hasSentEncryptionData) {
            var allEncryptionData = representation.getAllEncryptionData();
            if (allEncryptionData.length > 0) {
                callbacks.encryptionDataEncountered(allEncryptionData.map(function (p) { return (0, object_assign_1.default)({ content: content }, p); }));
                hasSentEncryptionData = true;
                // previous callback could have lead to cancellation
                if (globalCanceller.isUsed()) {
                    return;
                }
            }
        }
        if (evt.segmentType === "init") {
            if (!representation.index.isInitialized() && evt.segmentList !== undefined) {
                representation.index.initialize(evt.segmentList);
            }
            initSegmentState.isLoaded = true;
            if (evt.initializationData !== null) {
                var initSegmentUniqueId = representation.uniqueId;
                initSegmentState.uniqueId = initSegmentUniqueId;
                segmentSink.declareInitSegment(initSegmentUniqueId, evt.initializationData);
                (0, push_init_segment_1.default)({
                    playbackObserver: playbackObserver,
                    bufferGoal: bufferGoal,
                    content: content,
                    initSegmentUniqueId: initSegmentUniqueId,
                    segment: evt.segment,
                    segmentData: evt.initializationData,
                    segmentSink: segmentSink,
                }, globalCanceller.signal)
                    .then(function (result) {
                    if (result !== null) {
                        callbacks.addedSegment(result);
                    }
                })
                    .catch(onFatalBufferError);
            }
            // Sometimes the segment list is only known once the initialization segment
            // is parsed. Thus we immediately re-check if there's new segments to load.
            checkStatus();
            return;
        }
        else {
            var inbandEvents = evt.inbandEvents, predictedSegments = evt.predictedSegments, needsManifestRefresh = evt.needsManifestRefresh;
            if (predictedSegments !== undefined) {
                representation.index.addPredictedSegments(predictedSegments, evt.segment);
            }
            if (needsManifestRefresh === true) {
                callbacks.needsManifestRefresh();
                if (globalCanceller.isUsed()) {
                    return; // previous callback has stopped everything by side-effect
                }
            }
            if (inbandEvents !== undefined && inbandEvents.length > 0) {
                callbacks.inbandEvent(inbandEvents);
                if (globalCanceller.isUsed()) {
                    return; // previous callback has stopped everything by side-effect
                }
            }
            var initSegmentUniqueId = initSegmentState.uniqueId;
            (0, push_media_segment_1.default)({
                playbackObserver: playbackObserver,
                bufferGoal: bufferGoal,
                content: content,
                initSegmentUniqueId: initSegmentUniqueId,
                parsedSegment: evt,
                segment: evt.segment,
                segmentSink: segmentSink,
            }, globalCanceller.signal)
                .then(function (result) {
                if (result !== null) {
                    callbacks.addedSegment(result);
                }
            })
                .catch(onFatalBufferError);
        }
    }
    /**
     * Handle Buffer-related fatal errors by cancelling everything the
     * `RepresentationStream` is doing and calling the error callback with the
     * corresponding error.
     * @param {*} err
     */
    function onFatalBufferError(err) {
        if (globalCanceller.isUsed() && err instanceof task_canceller_1.CancellationError) {
            // The error is linked to cancellation AND we explicitely cancelled buffer
            // operations.
            // We can thus ignore it, it is very unlikely to lead to true buffer issues.
            return;
        }
        globalCanceller.cancel();
        callbacks.error(err);
    }
}
exports.default = RepresentationStream;
