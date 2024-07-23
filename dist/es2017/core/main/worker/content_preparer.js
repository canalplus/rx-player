import features from "../../../features";
import log from "../../../log";
import { createRepresentationFilterFromFnString } from "../../../manifest";
import MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import WorkerMediaSourceInterface from "../../../mse/worker_media_source_interface";
import assert from "../../../utils/assert";
import idGenerator from "../../../utils/id_generator";
import objectAssign from "../../../utils/object_assign";
import TaskCanceller from "../../../utils/task_canceller";
import createAdaptiveRepresentationSelector from "../../adaptive";
import { ManifestFetcher, SegmentFetcherCreator } from "../../fetchers";
import SegmentSinksStore from "../../segment_sinks";
import DecipherabilityFreezeDetector from "../common/DecipherabilityFreezeDetector";
import { limitVideoResolution, throttleVideoBitrate } from "./globals";
import sendMessage, { formatErrorForSender } from "./send_message";
import TrackChoiceSetter from "./track_choice_setter";
import WorkerTextDisplayerInterface from "./worker_text_displayer_interface";
const generateMediaSourceId = idGenerator();
export default class ContentPreparer {
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
    constructor({ hasMseInWorker, hasVideo, }) {
        this._currentContent = null;
        this._currentMediaSourceCanceller = new TaskCanceller();
        this._hasVideo = hasVideo;
        this._hasMseInWorker = hasMseInWorker;
        const contentCanceller = new TaskCanceller();
        this._contentCanceller = contentCanceller;
    }
    initializeNewContent(context) {
        return new Promise((res, rej) => {
            var _a, _b;
            this.disposeCurrentContent();
            const contentCanceller = this._contentCanceller;
            const currentMediaSourceCanceller = new TaskCanceller();
            this._currentMediaSourceCanceller = currentMediaSourceCanceller;
            currentMediaSourceCanceller.linkToSignal(contentCanceller.signal);
            const { contentId, url, hasText, transportOptions } = context;
            let manifest = null;
            // TODO better way
            assert(features.transports.dash !== undefined, "Multithread RxPlayer should have access to the DASH feature");
            const representationFilter = typeof transportOptions.representationFilter === "string"
                ? createRepresentationFilterFromFnString(transportOptions.representationFilter)
                : undefined;
            const dashPipelines = features.transports.dash(Object.assign(Object.assign({}, transportOptions), { representationFilter }));
            const manifestFetcher = new ManifestFetcher(url === undefined ? undefined : [url], dashPipelines, context.manifestRetryOptions);
            const representationEstimator = createAdaptiveRepresentationSelector({
                initialBitrates: {
                    audio: (_a = context.initialAudioBitrate) !== null && _a !== void 0 ? _a : 0,
                    video: (_b = context.initialVideoBitrate) !== null && _b !== void 0 ? _b : 0,
                },
                lowLatencyMode: transportOptions.lowLatencyMode,
                throttlers: {
                    limitResolution: { video: limitVideoResolution },
                    throttleBitrate: { video: throttleVideoBitrate },
                },
            });
            const unbindRejectOnCancellation = currentMediaSourceCanceller.signal.register((error) => {
                rej(error);
            });
            const segmentFetcherCreator = new SegmentFetcherCreator(dashPipelines, context.segmentRetryOptions, contentCanceller.signal);
            const trackChoiceSetter = new TrackChoiceSetter();
            const [mediaSource, segmentSinksStore, workerTextSender] = createMediaSourceAndBuffersStore(contentId, {
                hasMseInWorker: this._hasMseInWorker,
                hasVideo: this._hasVideo,
                hasText,
            }, currentMediaSourceCanceller.signal);
            const decipherabilityFreezeDetector = new DecipherabilityFreezeDetector(segmentSinksStore);
            this._currentContent = {
                contentId,
                decipherabilityFreezeDetector,
                mediaSource,
                manifest: null,
                manifestFetcher,
                representationEstimator,
                segmentSinksStore,
                segmentFetcherCreator,
                workerTextSender,
                trackChoiceSetter,
            };
            mediaSource.addEventListener("mediaSourceOpen", function () {
                checkIfReadyAndValidate();
            }, currentMediaSourceCanceller.signal);
            contentCanceller.signal.register(() => {
                manifestFetcher.dispose();
            });
            manifestFetcher.addEventListener("warning", (err) => {
                sendMessage({
                    type: "warning" /* WorkerMessageType.Warning */,
                    contentId,
                    value: formatErrorForSender(err),
                });
            }, contentCanceller.signal);
            manifestFetcher.addEventListener("manifestReady", (man) => {
                if (manifest !== null) {
                    log.warn("WP: Multiple `manifestReady` events, ignoring");
                    return;
                }
                manifest = man;
                if (this._currentContent !== null) {
                    this._currentContent.manifest = manifest;
                }
                checkIfReadyAndValidate();
            }, currentMediaSourceCanceller.signal);
            manifestFetcher.addEventListener("error", (err) => {
                rej(err);
            }, contentCanceller.signal);
            manifestFetcher.start();
            function checkIfReadyAndValidate() {
                if (manifest === null ||
                    mediaSource.readyState === "closed" ||
                    currentMediaSourceCanceller.isUsed()) {
                    return;
                }
                const sentManifest = manifest.getMetadataSnapshot();
                manifest.addEventListener("manifestUpdate", (updates) => {
                    if (manifest === null) {
                        // TODO log warn?
                        return;
                    }
                    // Remove `periods` key to reduce cost of an unnecessary manifest
                    // clone.
                    const snapshot = objectAssign(manifest.getMetadataSnapshot(), {
                        periods: [],
                    });
                    sendMessage({
                        type: "manifest-update" /* WorkerMessageType.ManifestUpdate */,
                        contentId,
                        value: { manifest: snapshot, updates },
                    });
                }, contentCanceller.signal);
                unbindRejectOnCancellation();
                res(sentManifest);
            }
        });
    }
    getCurrentContent() {
        return this._currentContent;
    }
    scheduleManifestRefresh(settings) {
        var _a;
        (_a = this._currentContent) === null || _a === void 0 ? void 0 : _a.manifestFetcher.scheduleManualRefresh(settings);
    }
    reloadMediaSource(reloadInfo) {
        this._currentMediaSourceCanceller.cancel();
        if (this._currentContent === null) {
            return Promise.reject(new Error("CP: No content anymore"));
        }
        this._currentContent.trackChoiceSetter.reset();
        this._currentMediaSourceCanceller = new TaskCanceller();
        sendMessage({
            type: "reloading-media-source" /* WorkerMessageType.ReloadingMediaSource */,
            contentId: this._currentContent.contentId,
            value: reloadInfo,
        }, []);
        const [mediaSource, segmentSinksStore, workerTextSender] = createMediaSourceAndBuffersStore(this._currentContent.contentId, {
            hasMseInWorker: this._hasMseInWorker,
            hasVideo: this._hasVideo,
            hasText: this._currentContent.workerTextSender !== null,
        }, this._currentMediaSourceCanceller.signal);
        this._currentContent.mediaSource = mediaSource;
        this._currentContent.segmentSinksStore = segmentSinksStore;
        this._currentContent.workerTextSender = workerTextSender;
        return new Promise((res, rej) => {
            mediaSource.addEventListener("mediaSourceOpen", function () {
                res();
            }, this._currentMediaSourceCanceller.signal);
            mediaSource.addEventListener("mediaSourceClose", function () {
                rej(new Error("MediaSource ReadyState changed to close during init."));
            }, this._currentMediaSourceCanceller.signal);
            this._currentMediaSourceCanceller.signal.register((error) => {
                rej(error);
            });
        });
    }
    disposeCurrentContent() {
        this._contentCanceller.cancel();
        this._contentCanceller = new TaskCanceller();
    }
}
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
    let mediaSource;
    if (capabilities.hasMseInWorker) {
        const mainMediaSource = new MainMediaSourceInterface(generateMediaSourceId());
        mediaSource = mainMediaSource;
        let sentMediaSourceLink;
        const handle = mainMediaSource.handle;
        if (handle.type === "handle") {
            sentMediaSourceLink = { type: "handle", value: handle.value };
        }
        else {
            const url = URL.createObjectURL(handle.value);
            sentMediaSourceLink = { type: "url", value: url };
            cancelSignal.register(() => {
                URL.revokeObjectURL(url);
            });
        }
        sendMessage({
            type: "attach-media-source" /* WorkerMessageType.AttachMediaSource */,
            contentId,
            value: sentMediaSourceLink,
            mediaSourceId: mediaSource.id,
        }, [handle.value]);
    }
    else {
        mediaSource = new WorkerMediaSourceInterface(generateMediaSourceId(), contentId, sendMessage);
    }
    const textSender = capabilities.hasText
        ? new WorkerTextDisplayerInterface(contentId, sendMessage)
        : null;
    const { hasVideo } = capabilities;
    const segmentSinksStore = new SegmentSinksStore(mediaSource, hasVideo, textSender);
    cancelSignal.register(() => {
        segmentSinksStore.disposeAll();
        textSender === null || textSender === void 0 ? void 0 : textSender.stop();
        mediaSource.dispose();
    });
    return [mediaSource, segmentSinksStore, textSender];
}
