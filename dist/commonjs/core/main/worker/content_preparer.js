"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var features_1 = require("../../../features");
var log_1 = require("../../../log");
var manifest_1 = require("../../../manifest");
var main_media_source_interface_1 = require("../../../mse/main_media_source_interface");
var worker_media_source_interface_1 = require("../../../mse/worker_media_source_interface");
var assert_1 = require("../../../utils/assert");
var id_generator_1 = require("../../../utils/id_generator");
var object_assign_1 = require("../../../utils/object_assign");
var task_canceller_1 = require("../../../utils/task_canceller");
var adaptive_1 = require("../../adaptive");
var fetchers_1 = require("../../fetchers");
var segment_sinks_1 = require("../../segment_sinks");
var DecipherabilityFreezeDetector_1 = require("../common/DecipherabilityFreezeDetector");
var globals_1 = require("./globals");
var send_message_1 = require("./send_message");
var track_choice_setter_1 = require("./track_choice_setter");
var worker_text_displayer_interface_1 = require("./worker_text_displayer_interface");
var generateMediaSourceId = (0, id_generator_1.default)();
var ContentPreparer = /** @class */ (function () {
    /**
     * @param {Object} capabilities
     * @param {boolean} capabilities.hasMseInWorker - If `true`, the current
     * environment has access to MediaSource API in a WebWorker context (so,
     * here).
     * If `false`, we have to go through the main thread to rely on all MSE API.
     * @param {boolean} capabilities.hasVideo - If `true`, we're playing on an
     * element which has video capabilities.
     * If `false`, we're only able to play audio, optionally with subtitles.
     *
     * Typically this boolean is `true` for `<video>` HTMLElement and `false` for
     * `<audio>` HTMLElement.
     */
    function ContentPreparer(_a) {
        var hasMseInWorker = _a.hasMseInWorker, hasVideo = _a.hasVideo;
        this._currentContent = null;
        this._currentMediaSourceCanceller = new task_canceller_1.default();
        this._hasVideo = hasVideo;
        this._hasMseInWorker = hasMseInWorker;
        var contentCanceller = new task_canceller_1.default();
        this._contentCanceller = contentCanceller;
    }
    ContentPreparer.prototype.initializeNewContent = function (context) {
        var _this = this;
        return new Promise(function (res, rej) {
            var _a, _b;
            _this.disposeCurrentContent();
            var contentCanceller = _this._contentCanceller;
            var currentMediaSourceCanceller = new task_canceller_1.default();
            _this._currentMediaSourceCanceller = currentMediaSourceCanceller;
            currentMediaSourceCanceller.linkToSignal(contentCanceller.signal);
            var contentId = context.contentId, url = context.url, hasText = context.hasText, transportOptions = context.transportOptions;
            var manifest = null;
            // TODO better way
            (0, assert_1.default)(features_1.default.transports.dash !== undefined, "Multithread RxPlayer should have access to the DASH feature");
            var representationFilter = typeof transportOptions.representationFilter === "string"
                ? (0, manifest_1.createRepresentationFilterFromFnString)(transportOptions.representationFilter)
                : undefined;
            var dashPipelines = features_1.default.transports.dash(__assign(__assign({}, transportOptions), { representationFilter: representationFilter }));
            var manifestFetcher = new fetchers_1.ManifestFetcher(url === undefined ? undefined : [url], dashPipelines, context.manifestRetryOptions);
            var representationEstimator = (0, adaptive_1.default)({
                initialBitrates: {
                    audio: (_a = context.initialAudioBitrate) !== null && _a !== void 0 ? _a : 0,
                    video: (_b = context.initialVideoBitrate) !== null && _b !== void 0 ? _b : 0,
                },
                lowLatencyMode: transportOptions.lowLatencyMode,
                throttlers: {
                    limitResolution: { video: globals_1.limitVideoResolution },
                    throttleBitrate: { video: globals_1.throttleVideoBitrate },
                },
            });
            var unbindRejectOnCancellation = currentMediaSourceCanceller.signal.register(function (error) {
                rej(error);
            });
            var segmentFetcherCreator = new fetchers_1.SegmentFetcherCreator(dashPipelines, context.segmentRetryOptions, contentCanceller.signal);
            var trackChoiceSetter = new track_choice_setter_1.default();
            var _c = __read(createMediaSourceAndBuffersStore(contentId, {
                hasMseInWorker: _this._hasMseInWorker,
                hasVideo: _this._hasVideo,
                hasText: hasText,
            }, currentMediaSourceCanceller.signal), 3), mediaSource = _c[0], segmentSinksStore = _c[1], workerTextSender = _c[2];
            var decipherabilityFreezeDetector = new DecipherabilityFreezeDetector_1.default(segmentSinksStore);
            _this._currentContent = {
                contentId: contentId,
                decipherabilityFreezeDetector: decipherabilityFreezeDetector,
                mediaSource: mediaSource,
                manifest: null,
                manifestFetcher: manifestFetcher,
                representationEstimator: representationEstimator,
                segmentSinksStore: segmentSinksStore,
                segmentFetcherCreator: segmentFetcherCreator,
                workerTextSender: workerTextSender,
                trackChoiceSetter: trackChoiceSetter,
            };
            mediaSource.addEventListener("mediaSourceOpen", function () {
                checkIfReadyAndValidate();
            }, currentMediaSourceCanceller.signal);
            contentCanceller.signal.register(function () {
                manifestFetcher.dispose();
            });
            manifestFetcher.addEventListener("warning", function (err) {
                (0, send_message_1.default)({
                    type: "warning" /* WorkerMessageType.Warning */,
                    contentId: contentId,
                    value: (0, send_message_1.formatErrorForSender)(err),
                });
            }, contentCanceller.signal);
            manifestFetcher.addEventListener("manifestReady", function (man) {
                if (manifest !== null) {
                    log_1.default.warn("WP: Multiple `manifestReady` events, ignoring");
                    return;
                }
                manifest = man;
                if (_this._currentContent !== null) {
                    _this._currentContent.manifest = manifest;
                }
                checkIfReadyAndValidate();
            }, currentMediaSourceCanceller.signal);
            manifestFetcher.addEventListener("error", function (err) {
                rej(err);
            }, contentCanceller.signal);
            manifestFetcher.start();
            function checkIfReadyAndValidate() {
                if (manifest === null ||
                    mediaSource.readyState === "closed" ||
                    currentMediaSourceCanceller.isUsed()) {
                    return;
                }
                var sentManifest = manifest.getMetadataSnapshot();
                manifest.addEventListener("manifestUpdate", function (updates) {
                    if (manifest === null) {
                        // TODO log warn?
                        return;
                    }
                    // Remove `periods` key to reduce cost of an unnecessary manifest
                    // clone.
                    var snapshot = (0, object_assign_1.default)(manifest.getMetadataSnapshot(), {
                        periods: [],
                    });
                    (0, send_message_1.default)({
                        type: "manifest-update" /* WorkerMessageType.ManifestUpdate */,
                        contentId: contentId,
                        value: { manifest: snapshot, updates: updates },
                    });
                }, contentCanceller.signal);
                unbindRejectOnCancellation();
                res(sentManifest);
            }
        });
    };
    ContentPreparer.prototype.getCurrentContent = function () {
        return this._currentContent;
    };
    ContentPreparer.prototype.scheduleManifestRefresh = function (settings) {
        var _a;
        (_a = this._currentContent) === null || _a === void 0 ? void 0 : _a.manifestFetcher.scheduleManualRefresh(settings);
    };
    ContentPreparer.prototype.reloadMediaSource = function (reloadInfo) {
        var _this = this;
        this._currentMediaSourceCanceller.cancel();
        if (this._currentContent === null) {
            return Promise.reject(new Error("CP: No content anymore"));
        }
        this._currentContent.trackChoiceSetter.reset();
        this._currentMediaSourceCanceller = new task_canceller_1.default();
        (0, send_message_1.default)({
            type: "reloading-media-source" /* WorkerMessageType.ReloadingMediaSource */,
            contentId: this._currentContent.contentId,
            value: reloadInfo,
        }, []);
        var _a = __read(createMediaSourceAndBuffersStore(this._currentContent.contentId, {
            hasMseInWorker: this._hasMseInWorker,
            hasVideo: this._hasVideo,
            hasText: this._currentContent.workerTextSender !== null,
        }, this._currentMediaSourceCanceller.signal), 3), mediaSource = _a[0], segmentSinksStore = _a[1], workerTextSender = _a[2];
        this._currentContent.mediaSource = mediaSource;
        this._currentContent.segmentSinksStore = segmentSinksStore;
        this._currentContent.workerTextSender = workerTextSender;
        return new Promise(function (res, rej) {
            mediaSource.addEventListener("mediaSourceOpen", function () {
                res();
            }, _this._currentMediaSourceCanceller.signal);
            mediaSource.addEventListener("mediaSourceClose", function () {
                rej(new Error("MediaSource ReadyState changed to close during init."));
            }, _this._currentMediaSourceCanceller.signal);
            _this._currentMediaSourceCanceller.signal.register(function (error) {
                rej(error);
            });
        });
    };
    ContentPreparer.prototype.disposeCurrentContent = function () {
        this._contentCanceller.cancel();
        this._contentCanceller = new task_canceller_1.default();
    };
    return ContentPreparer;
}());
exports.default = ContentPreparer;
/**
 * @param {string} contentId
 * @param {Object} capabilities
 * @param {boolean} capabilities.hasMseInWorker
 * @param {boolean} capabilities.hasVideo
 * @param {boolean} capabilities.hasText
 * @param {Object} cancelSignal
 * @returns {Array.<Object>}
 */
function createMediaSourceAndBuffersStore(contentId, capabilities, cancelSignal) {
    var mediaSource;
    if (capabilities.hasMseInWorker) {
        var mainMediaSource = new main_media_source_interface_1.default(generateMediaSourceId());
        mediaSource = mainMediaSource;
        var sentMediaSourceLink = void 0;
        var handle = mainMediaSource.handle;
        if (handle.type === "handle") {
            sentMediaSourceLink = { type: "handle", value: handle.value };
        }
        else {
            var url_1 = URL.createObjectURL(handle.value);
            sentMediaSourceLink = { type: "url", value: url_1 };
            cancelSignal.register(function () {
                URL.revokeObjectURL(url_1);
            });
        }
        (0, send_message_1.default)({
            type: "attach-media-source" /* WorkerMessageType.AttachMediaSource */,
            contentId: contentId,
            value: sentMediaSourceLink,
            mediaSourceId: mediaSource.id,
        }, [handle.value]);
    }
    else {
        mediaSource = new worker_media_source_interface_1.default(generateMediaSourceId(), contentId, send_message_1.default);
    }
    var textSender = capabilities.hasText
        ? new worker_text_displayer_interface_1.default(contentId, send_message_1.default)
        : null;
    var hasVideo = capabilities.hasVideo;
    var segmentSinksStore = new segment_sinks_1.default(mediaSource, hasVideo, textSender);
    cancelSignal.register(function () {
        segmentSinksStore.disposeAll();
        textSender === null || textSender === void 0 ? void 0 : textSender.stop();
        mediaSource.dispose();
    });
    return [mediaSource, segmentSinksStore, textSender];
}
