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
exports.MPL_LOADER = exports.DASH_LOADER = void 0;
var config_1 = require("../../../config");
var segment_fetcher_1 = require("../../../core/fetchers/segment/segment_fetcher");
var log_1 = require("../../../log");
var classes_1 = require("../../../manifest/classes");
var array_find_1 = require("../../../utils/array_find");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var object_assign_1 = require("../../../utils/object_assign");
var task_canceller_1 = require("../../../utils/task_canceller");
var load_and_push_segment_1 = require("./load_and_push_segment");
var prepare_source_buffer_1 = require("./prepare_source_buffer");
var remove_buffer_around_time_1 = require("./remove_buffer_around_time");
var video_thumbnail_loader_error_1 = require("./video_thumbnail_loader_error");
var MIN_NEEDED_DATA_AFTER_TIME = 2;
var loaders = {};
/**
 * This tool, as a supplement to the RxPlayer, intent to help creating thumbnails
 * from a video source.
 *
 * The tools will extract a "thumbnail track" either from a video track (whose light
 * chunks are adapted from such use case) or direclty from the media content.
 */
var VideoThumbnailLoader = /** @class */ (function () {
    function VideoThumbnailLoader(videoElement, player) {
        this._videoElement = videoElement;
        this._player = player;
        this._lastRepresentationInfo = null;
    }
    /**
     * Add imported loader to thumbnail loader loader object.
     * It allows to use it when setting time.
     * @param {function} loaderFunc
     */
    VideoThumbnailLoader.addLoader = function (loaderFunc) {
        loaderFunc(loaders);
    };
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
    VideoThumbnailLoader.prototype.setTime = function (time) {
        var _this = this;
        // TODO cleaner way to interop than an undocumented method?
        var manifest = this._player.__priv_getManifest();
        if (manifest === null) {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            return Promise.reject(new video_thumbnail_loader_error_1.default("NO_MANIFEST", "No manifest available."));
        }
        if (!(manifest instanceof classes_1.default)) {
            throw new Error("Impossible to run VideoThumbnailLoader in the current context.\n" +
                "Are you running the RxPlayer in a WebWorker?");
        }
        var content = getTrickModeInfo(time, manifest);
        if (content === null) {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            return Promise.reject(new video_thumbnail_loader_error_1.default("NO_TRACK", "Couldn't find a trickmode track for this time."));
        }
        if (this._lastRepresentationInfo !== null &&
            !areSameRepresentation(this._lastRepresentationInfo.content, content)) {
            this._lastRepresentationInfo.cleaner.cancel();
            this._lastRepresentationInfo = null;
        }
        var neededSegments = content.representation.index.getSegments(time, MIN_NEEDED_DATA_AFTER_TIME);
        if (neededSegments.length === 0) {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            return Promise.reject(new video_thumbnail_loader_error_1.default("NO_THUMBNAIL", "Couldn't find any thumbnail for the given time."));
        }
        // Check which of `neededSegments` are already buffered
        for (var j = 0; j < neededSegments.length; j++) {
            var _a = neededSegments[j], stime = _a.time, duration = _a.duration, timescale = _a.timescale;
            var start = stime / timescale;
            var end = start + duration / timescale;
            for (var i = 0; i < this._videoElement.buffered.length; i++) {
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
            log_1.default.debug("VTL: Thumbnails already loaded.", time);
            return Promise.resolve(time);
        }
        if (log_1.default.hasLevel("DEBUG")) {
            log_1.default.debug("VTL: Found thumbnail for time", time, neededSegments.map(function (s) { return "start: ".concat(s.time, " - end: ").concat(s.end); }).join(", "));
        }
        var loader = loaders[content.manifest.transport];
        if (loader === undefined) {
            if (this._lastRepresentationInfo !== null) {
                this._lastRepresentationInfo.cleaner.cancel();
                this._lastRepresentationInfo = null;
            }
            return Promise.reject(new video_thumbnail_loader_error_1.default("NO_LOADER", "VideoThumbnailLoaderError: No imported loader for this transport type: " +
                content.manifest.transport));
        }
        var lastRepInfo;
        if (this._lastRepresentationInfo === null) {
            var lastRepInfoCleaner_1 = new task_canceller_1.default();
            var segmentFetcher = (0, segment_fetcher_1.default)("video", loader.video, null, 
            // We don't care about the SegmentFetcher's lifecycle events
            {}, {
                baseDelay: 0,
                maxDelay: 0,
                maxRetry: 0,
                requestTimeout: config_1.default.getCurrent().DEFAULT_REQUEST_TIMEOUT,
                connectionTimeout: config_1.default.getCurrent().DEFAULT_CONNECTION_TIMEOUT,
            });
            var initSegment_1 = content.representation.index.getInitSegment();
            var initSegmentUniqueId_1 = initSegment_1 !== null ? content.representation.uniqueId : null;
            var sourceBufferProm = (0, prepare_source_buffer_1.default)(this._videoElement, content.representation.getMimeTypeString(), lastRepInfoCleaner_1.signal).then(function (sourceBufferInterface) { return __awaiter(_this, void 0, void 0, function () {
                var segmentInfo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (initSegment_1 === null || initSegmentUniqueId_1 === null) {
                                lastRepInfo.initSegmentUniqueId = null;
                                return [2 /*return*/, sourceBufferInterface];
                            }
                            segmentInfo = (0, object_assign_1.default)({ segment: initSegment_1 }, content);
                            return [4 /*yield*/, (0, load_and_push_segment_1.default)(segmentInfo, sourceBufferInterface, lastRepInfo.segmentFetcher, lastRepInfoCleaner_1.signal)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, sourceBufferInterface];
                    }
                });
            }); });
            lastRepInfo = {
                cleaner: lastRepInfoCleaner_1,
                sourceBuffer: sourceBufferProm,
                content: content,
                initSegmentUniqueId: initSegmentUniqueId_1,
                segmentFetcher: segmentFetcher,
                pendingRequests: [],
            };
            this._lastRepresentationInfo = lastRepInfo;
        }
        else {
            lastRepInfo = this._lastRepresentationInfo;
        }
        abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);
        var currentTaskCanceller = new task_canceller_1.default();
        return lastRepInfo.sourceBuffer
            .catch(function (err) {
            if (_this._lastRepresentationInfo !== null) {
                _this._lastRepresentationInfo.cleaner.cancel();
                _this._lastRepresentationInfo = null;
            }
            throw new video_thumbnail_loader_error_1.default("LOADING_ERROR", "VideoThumbnailLoaderError: Error when initializing buffers: " + String(err));
        })
            .then(function (sourceBufferInterface) { return __awaiter(_this, void 0, void 0, function () {
            var promises, _loop_1, neededSegments_1, neededSegments_1_1, segment;
            var e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);
                        log_1.default.debug("VTL: Removing buffer around time.", time);
                        return [4 /*yield*/, (0, remove_buffer_around_time_1.default)(this._videoElement, sourceBufferInterface, time, undefined)];
                    case 1:
                        _b.sent();
                        if (currentTaskCanceller.signal.cancellationError !== null) {
                            throw currentTaskCanceller.signal.cancellationError;
                        }
                        abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);
                        promises = [];
                        _loop_1 = function (segment) {
                            var pending = (0, array_find_1.default)(lastRepInfo.pendingRequests, function (_a) {
                                var segmentId = _a.segmentId;
                                return segmentId === segment.id;
                            });
                            if (pending !== undefined) {
                                promises.push(pending.promise);
                            }
                            else {
                                var requestCanceller = new task_canceller_1.default();
                                var unlinkSignal_1 = requestCanceller.linkToSignal(lastRepInfo.cleaner.signal);
                                var segmentInfo = (0, object_assign_1.default)({ segment: segment }, content);
                                var prom = (0, load_and_push_segment_1.default)(segmentInfo, sourceBufferInterface, lastRepInfo.segmentFetcher, requestCanceller.signal).then(unlinkSignal_1, function (err) {
                                    unlinkSignal_1();
                                    throw err;
                                });
                                var newReq_1 = {
                                    segmentId: segment.id,
                                    canceller: requestCanceller,
                                    promise: prom,
                                };
                                lastRepInfo.pendingRequests.push(newReq_1);
                                var removePendingRequest = function () {
                                    var indexOf = lastRepInfo.pendingRequests.indexOf(newReq_1);
                                    if (indexOf >= 0) {
                                        lastRepInfo.pendingRequests.splice(indexOf, 1);
                                    }
                                };
                                prom.then(removePendingRequest, removePendingRequest);
                                promises.push(prom);
                            }
                        };
                        try {
                            for (neededSegments_1 = __values(neededSegments), neededSegments_1_1 = neededSegments_1.next(); !neededSegments_1_1.done; neededSegments_1_1 = neededSegments_1.next()) {
                                segment = neededSegments_1_1.value;
                                _loop_1(segment);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (neededSegments_1_1 && !neededSegments_1_1.done && (_a = neededSegments_1.return)) _a.call(neededSegments_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 2:
                        _b.sent();
                        this._videoElement.currentTime = time;
                        return [2 /*return*/, time];
                }
            });
        }); })
            .catch(function (err) {
            if (err instanceof task_canceller_1.CancellationError) {
                throw new video_thumbnail_loader_error_1.default("ABORTED", "VideoThumbnailLoaderError: Aborted job.");
            }
            throw err;
        });
    };
    /**
     * Dispose thumbnail loader.
     * @returns {void}
     */
    VideoThumbnailLoader.prototype.dispose = function () {
        if (this._lastRepresentationInfo !== null) {
            this._lastRepresentationInfo.cleaner.cancel();
            this._lastRepresentationInfo = null;
        }
    };
    return VideoThumbnailLoader;
}());
exports.default = VideoThumbnailLoader;
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
    var e_2, _a;
    var _b, _c;
    var period = manifest.getPeriodForTime(time);
    if (period === undefined ||
        period.adaptations.video === undefined ||
        period.adaptations.video.length === 0) {
        return null;
    }
    try {
        for (var _d = __values(period.adaptations.video), _e = _d.next(); !_e.done; _e = _d.next()) {
            var videoAdaptation = _e.value;
            var representation = (_c = (_b = videoAdaptation.trickModeTracks) === null || _b === void 0 ? void 0 : _b[0].representations) === null || _c === void 0 ? void 0 : _c[0];
            if (!(0, is_null_or_undefined_1.default)(representation)) {
                return { manifest: manifest, period: period, adaptation: videoAdaptation, representation: representation };
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return null;
}
function abortUnlistedSegmentRequests(pendingRequests, neededSegments) {
    pendingRequests
        .filter(function (req) { return !neededSegments.some(function (_a) {
        var id = _a.id;
        return id === req.segmentId;
    }); })
        .forEach(function (req) {
        req.canceller.cancel();
    });
}
var dash_1 = require("./features/dash");
Object.defineProperty(exports, "DASH_LOADER", { enumerable: true, get: function () { return dash_1.default; } });
var metaplaylist_1 = require("./features/metaplaylist");
Object.defineProperty(exports, "MPL_LOADER", { enumerable: true, get: function () { return metaplaylist_1.default; } });
