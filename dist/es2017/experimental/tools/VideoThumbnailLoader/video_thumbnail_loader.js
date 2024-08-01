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
import config from "../../../config";
import createSegmentFetcher from "../../../core/fetchers/segment/segment_fetcher";
import log from "../../../log";
import Manifest from "../../../manifest/classes";
import arrayFind from "../../../utils/array_find";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import objectAssign from "../../../utils/object_assign";
import TaskCanceller, { CancellationError } from "../../../utils/task_canceller";
import loadAndPushSegment from "./load_and_push_segment";
import prepareSourceBuffer from "./prepare_source_buffer";
import removeBufferAroundTime from "./remove_buffer_around_time";
import VideoThumbnailLoaderError from "./video_thumbnail_loader_error";
const MIN_NEEDED_DATA_AFTER_TIME = 2;
const loaders = {};
/**
 * This tool, as a supplement to the RxPlayer, intent to help creating thumbnails
 * from a video source.
 *
 * The tools will extract a "thumbnail track" either from a video track (whose light
 * chunks are adapted from such use case) or direclty from the media content.
 */
export default class VideoThumbnailLoader {
    constructor(videoElement, player) {
        this._videoElement = videoElement;
        this._player = player;
        this._lastRepresentationInfo = null;
    }
    /**
     * Add imported loader to thumbnail loader loader object.
     * It allows to use it when setting time.
     * @param {function} loaderFunc
     */
    static addLoader(loaderFunc) {
        loaderFunc(loaders);
    }
    /**
     * Set time of thumbnail video media element :
     * - Remove buffer when too much buffered data
     * - Search for thumbnail track element to display
     * - Load data
     * - Append data
     * Resolves when time is set.
     * @param {number} time
     * @returns {Promise}
     */
    setTime(time) {
        // TODO cleaner way to interop than an undocumented method?
        const manifest = this._player.__priv_getManifest();
        if (manifest === null) {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            return Promise.reject(new VideoThumbnailLoaderError("NO_MANIFEST", "No manifest available."));
        }
        if (!(manifest instanceof Manifest)) {
            throw new Error("Impossible to run VideoThumbnailLoader in the current context.\n" +
                "Are you running the RxPlayer in a WebWorker?");
        }
        const content = getTrickModeInfo(time, manifest);
        if (content === null) {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            return Promise.reject(new VideoThumbnailLoaderError("NO_TRACK", "Couldn't find a trickmode track for this time."));
        }
        if (this._lastRepresentationInfo !== null &&
            !areSameRepresentation(this._lastRepresentationInfo.content, content)) {
            this._lastRepresentationInfo.cleaner.cancel();
            this._lastRepresentationInfo = null;
        }
        const neededSegments = content.representation.index.getSegments(time, MIN_NEEDED_DATA_AFTER_TIME);
        if (neededSegments.length === 0) {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            return Promise.reject(new VideoThumbnailLoaderError("NO_THUMBNAIL", "Couldn't find any thumbnail for the given time."));
        }
        // Check which of `neededSegments` are already buffered
        for (let j = 0; j < neededSegments.length; j++) {
            const { time: stime, duration, timescale } = neededSegments[j];
            const start = stime / timescale;
            const end = start + duration / timescale;
            for (let i = 0; i < this._videoElement.buffered.length; i++) {
                if (this._videoElement.buffered.start(i) - 0.001 <= start &&
                    this._videoElement.buffered.end(i) + 0.001 >= end) {
                    neededSegments.splice(j, 1);
                    j--;
                    break;
                }
            }
        }
        if (neededSegments.length === 0) {
            this._videoElement.currentTime = time;
            log.debug("VTL: Thumbnails already loaded.", time);
            return Promise.resolve(time);
        }
        if (log.hasLevel("DEBUG")) {
            log.debug("VTL: Found thumbnail for time", time, neededSegments.map((s) => `start: ${s.time} - end: ${s.end}`).join(", "));
        }
        const loader = loaders[content.manifest.transport];
        if (loader === undefined) {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            return Promise.reject(new VideoThumbnailLoaderError("NO_LOADER", "VideoThumbnailLoaderError: No imported loader for this transport type: " +
                content.manifest.transport));
        }
        let lastRepInfo;
        if (this._lastRepresentationInfo === null) {
            const lastRepInfoCleaner = new TaskCanceller();
            const segmentFetcher = createSegmentFetcher({
                bufferType: "video",
                pipeline: loader.video,
                cdnPrioritizer: null,
                cmcdDataBuilder: null,
                requestOptions: {
                    baseDelay: 0,
                    maxDelay: 0,
                    maxRetry: 0,
                    requestTimeout: config.getCurrent().DEFAULT_REQUEST_TIMEOUT,
                    connectionTimeout: config.getCurrent().DEFAULT_CONNECTION_TIMEOUT,
                },
                // We don't care about the SegmentFetcher's lifecycle events
                eventListeners: {},
            });
            const initSegment = content.representation.index.getInitSegment();
            const initSegmentUniqueId = initSegment !== null ? content.representation.uniqueId : null;
            const sourceBufferProm = prepareSourceBuffer(this._videoElement, content.representation.getMimeTypeString(), lastRepInfoCleaner.signal).then(async (sourceBufferInterface) => {
                if (initSegment === null || initSegmentUniqueId === null) {
                    lastRepInfo.initSegmentUniqueId = null;
                    return sourceBufferInterface;
                }
                const segmentInfo = objectAssign({ segment: initSegment }, content);
                await loadAndPushSegment(segmentInfo, sourceBufferInterface, lastRepInfo.segmentFetcher, lastRepInfoCleaner.signal);
                return sourceBufferInterface;
            });
            lastRepInfo = {
                cleaner: lastRepInfoCleaner,
                sourceBuffer: sourceBufferProm,
                content,
                initSegmentUniqueId,
                segmentFetcher,
                pendingRequests: [],
            };
            this._lastRepresentationInfo = lastRepInfo;
        }
        else {
            lastRepInfo = this._lastRepresentationInfo;
        }
        abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);
        const currentTaskCanceller = new TaskCanceller();
        return lastRepInfo.sourceBuffer
            .catch((err) => {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            throw new VideoThumbnailLoaderError("LOADING_ERROR", "VideoThumbnailLoaderError: Error when initializing buffers: " + String(err));
        })
            .then(async (sourceBufferInterface) => {
            abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);
            log.debug("VTL: Removing buffer around time.", time);
            await removeBufferAroundTime(this._videoElement, sourceBufferInterface, time, undefined);
            if (currentTaskCanceller.signal.cancellationError !== null) {
                throw currentTaskCanceller.signal.cancellationError;
            }
            abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);
            const promises = [];
            for (const segment of neededSegments) {
                const pending = arrayFind(lastRepInfo.pendingRequests, ({ segmentId }) => segmentId === segment.id);
                if (pending !== undefined) {
                    promises.push(pending.promise);
                }
                else {
                    const requestCanceller = new TaskCanceller();
                    const unlinkSignal = requestCanceller.linkToSignal(lastRepInfo.cleaner.signal);
                    const segmentInfo = objectAssign({ segment }, content);
                    const prom = loadAndPushSegment(segmentInfo, sourceBufferInterface, lastRepInfo.segmentFetcher, requestCanceller.signal).then(unlinkSignal, (err) => {
                        unlinkSignal();
                        throw err;
                    });
                    const newReq = {
                        segmentId: segment.id,
                        canceller: requestCanceller,
                        promise: prom,
                    };
                    lastRepInfo.pendingRequests.push(newReq);
                    const removePendingRequest = () => {
                        const indexOf = lastRepInfo.pendingRequests.indexOf(newReq);
                        if (indexOf >= 0) {
                            lastRepInfo.pendingRequests.splice(indexOf, 1);
                        }
                    };
                    prom.then(removePendingRequest, removePendingRequest);
                    promises.push(prom);
                }
            }
            await Promise.all(promises);
            this._videoElement.currentTime = time;
            return time;
        })
            .catch((err) => {
            if (err instanceof CancellationError) {
                throw new VideoThumbnailLoaderError("ABORTED", "VideoThumbnailLoaderError: Aborted job.");
            }
            throw err;
        });
    }
    /**
     * Dispose thumbnail loader.
     * @returns {void}
     */
    dispose() {
        if (this._lastRepresentationInfo !== null) {
            this._lastRepresentationInfo.cleaner.cancel();
            this._lastRepresentationInfo = null;
        }
    }
}
/**
 * @param {Object} contentInfo1
 * @param {Object} contentInfo2
 * @returns {Boolean}
 */
function areSameRepresentation(contentInfo1, contentInfo2) {
    return (contentInfo1.representation.id === contentInfo2.representation.id &&
        contentInfo1.adaptation.id === contentInfo2.adaptation.id &&
        contentInfo1.period.id === contentInfo2.period.id &&
        contentInfo1.manifest.id === contentInfo2.manifest.id);
}
/**
 * From a given time, find the trickmode representation and return
 * the content information.
 * @param {number} time
 * @param {Object} manifest
 * @returns {Object|null}
 */
function getTrickModeInfo(time, manifest) {
    var _a, _b;
    const period = manifest.getPeriodForTime(time);
    if (period === undefined ||
        period.adaptations.video === undefined ||
        period.adaptations.video.length === 0) {
        return null;
    }
    for (const videoAdaptation of period.adaptations.video) {
        const representation = (_b = (_a = videoAdaptation.trickModeTracks) === null || _a === void 0 ? void 0 : _a[0].representations) === null || _b === void 0 ? void 0 : _b[0];
        if (!isNullOrUndefined(representation)) {
            return { manifest, period, adaptation: videoAdaptation, representation };
        }
    }
    return null;
}
function abortUnlistedSegmentRequests(pendingRequests, neededSegments) {
    pendingRequests
        .filter((req) => !neededSegments.some(({ id }) => id === req.segmentId))
        .forEach((req) => {
        req.canceller.cancel();
    });
}
export { default as DASH_LOADER } from "./features/dash";
export { default as MPL_LOADER } from "./features/metaplaylist";
