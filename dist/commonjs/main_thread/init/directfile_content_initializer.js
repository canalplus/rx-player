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
Object.defineProperty(exports, "__esModule", { value: true });
var clear_element_src_1 = require("../../compat/clear_element_src");
var log_1 = require("../../log");
var assert_1 = require("../../utils/assert");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var noop_1 = require("../../utils/noop");
var reference_1 = require("../../utils/reference");
var task_canceller_1 = require("../../utils/task_canceller");
var types_1 = require("./types");
var get_loaded_reference_1 = require("./utils/get_loaded_reference");
var initial_seek_and_play_1 = require("./utils/initial_seek_and_play");
var initialize_content_decryption_1 = require("./utils/initialize_content_decryption");
var rebuffering_controller_1 = require("./utils/rebuffering_controller");
var throw_on_media_error_1 = require("./utils/throw_on_media_error");
/**
 * `ContentIntializer` which will load contents by putting their URL in the
 * `src` attribute of the given HTMLMediaElement.
 *
 * Because such contents are mainly loaded by the browser, those (called
 * "directfile" contents in the RxPlayer) needs a simpler logic in-JS when
 * compared to a content that relies on the MSE API.
 *
 * @class DirectFileContentInitializer
 */
var DirectFileContentInitializer = /** @class */ (function (_super) {
    __extends(DirectFileContentInitializer, _super);
    /**
     * Creates a new `DirectFileContentInitializer` linked to the given settings.
     * @param {Object} settings
     */
    function DirectFileContentInitializer(settings) {
        var _this = _super.call(this) || this;
        _this._settings = settings;
        _this._initCanceller = new task_canceller_1.default();
        return _this;
    }
    /**
     * "Prepare" content so it can later be played by calling `start`.
     */
    DirectFileContentInitializer.prototype.prepare = function () {
        return; // Directfile contents do not have any preparation
    };
    /**
     * Start playback of the content linked to this `DirectFileContentInitializer`
     * on the given `HTMLMediaElement` and its associated `PlaybackObserver`.
     * @param {HTMLMediaElement} mediaElement - HTMLMediaElement on which the
     * content will be played.
     * @param {Object} playbackObserver - Object regularly emitting playback
     * information.
     */
    DirectFileContentInitializer.prototype.start = function (mediaElement, playbackObserver) {
        var _this = this;
        var cancelSignal = this._initCanceller.signal;
        var _a = this._settings, keySystems = _a.keySystems, speed = _a.speed, url = _a.url;
        (0, clear_element_src_1.default)(mediaElement);
        /**
         * Create dummy encryption data emitter, as those are not sent from the
         * RxPlayer for directfile contents.
         */
        var decryptionRef = new reference_1.default(null);
        decryptionRef.finish();
        var drmInitRef = (0, initialize_content_decryption_1.default)(mediaElement, keySystems, decryptionRef, {
            onError: function (err) { return _this._onFatalError(err); },
            onWarning: function (err) { return _this.trigger("warning", err); },
            onBlackListProtectionData: noop_1.default,
            onKeyIdsCompatibilityUpdate: noop_1.default,
        }, cancelSignal);
        /** Translate errors coming from the media element into RxPlayer errors. */
        (0, throw_on_media_error_1.default)(mediaElement, function (error) { return _this._onFatalError(error); }, cancelSignal);
        /**
         * Class trying to avoid various stalling situations, emitting "stalled"
         * events when it cannot, as well as "unstalled" events when it get out of one.
         */
        var rebufferingController = new rebuffering_controller_1.default(playbackObserver, null, speed);
        rebufferingController.addEventListener("stalled", function (evt) {
            return _this.trigger("stalled", evt);
        });
        rebufferingController.addEventListener("unstalled", function () {
            return _this.trigger("unstalled", null);
        });
        rebufferingController.addEventListener("warning", function (err) {
            return _this.trigger("warning", err);
        });
        cancelSignal.register(function () {
            rebufferingController.destroy();
        });
        rebufferingController.start();
        drmInitRef.onUpdate(function (evt, stopListeningToDrmUpdates) {
            if (evt.type === "uninitialized") {
                return; // nothing done yet
            }
            stopListeningToDrmUpdates();
            // Start everything! (Just put the URL in the element's src).
            log_1.default.info("Setting URL to HTMLMediaElement", url);
            mediaElement.src = url;
            cancelSignal.register(function () {
                log_1.default.info("Init: Removing directfile src from media element", mediaElement.src);
                (0, clear_element_src_1.default)(mediaElement);
            });
            if (evt.type === "awaiting-media-link") {
                evt.value.isMediaLinked.setValue(true);
                drmInitRef.onUpdate(function (newDrmStatus, stopListeningToDrmUpdatesAgain) {
                    if (newDrmStatus.type === "initialized") {
                        stopListeningToDrmUpdatesAgain();
                        _this._seekAndPlay(mediaElement, playbackObserver);
                    }
                }, { emitCurrentValue: true, clearSignal: cancelSignal });
            }
            else {
                (0, assert_1.default)(evt.type === "initialized");
                _this._seekAndPlay(mediaElement, playbackObserver);
            }
        }, { emitCurrentValue: true, clearSignal: cancelSignal });
    };
    /**
     * Update URL this `ContentIntializer` depends on.
     * @param {Array.<string>|undefined} _urls
     * @param {boolean} _refreshNow
     */
    DirectFileContentInitializer.prototype.updateContentUrls = function (_urls, _refreshNow) {
        throw new Error("Cannot update content URL of directfile contents");
    };
    /**
     * Stop content and free all resources linked to this `ContentIntializer`.
     */
    DirectFileContentInitializer.prototype.dispose = function () {
        this._initCanceller.cancel();
    };
    /**
     * Logic performed when a fatal error was triggered.
     * @param {*} err - The fatal error in question.
     */
    DirectFileContentInitializer.prototype._onFatalError = function (err) {
        this._initCanceller.cancel();
        this.trigger("error", err);
    };
    /**
     * Perform the initial seek (to begin playback at an initially-calculated
     * position based on settings) and auto-play if needed when loaded.
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    DirectFileContentInitializer.prototype._seekAndPlay = function (mediaElement, playbackObserver) {
        var _this = this;
        var cancelSignal = this._initCanceller.signal;
        var _a = this._settings, autoPlay = _a.autoPlay, startAt = _a.startAt;
        var initialTime = function () {
            log_1.default.debug("Init: Calculating initial time");
            var initTime = getDirectFileInitialTime(mediaElement, startAt);
            log_1.default.debug("Init: Initial time calculated:", initTime);
            return initTime;
        };
        (0, initial_seek_and_play_1.default)({
            mediaElement: mediaElement,
            playbackObserver: playbackObserver,
            startTime: initialTime,
            mustAutoPlay: autoPlay,
            onWarning: function (err) { return _this.trigger("warning", err); },
            isDirectfile: true,
        }, cancelSignal)
            .autoPlayResult.then(function () {
            return (0, get_loaded_reference_1.default)(playbackObserver, mediaElement, true, cancelSignal).onUpdate(function (isLoaded, stopListening) {
                if (isLoaded) {
                    stopListening();
                    _this.trigger("loaded", {
                        getSegmentSinkMetrics: null,
                    });
                }
            }, { emitCurrentValue: true, clearSignal: cancelSignal });
        })
            .catch(function (err) {
            if (!cancelSignal.isCancelled()) {
                _this._onFatalError(err);
            }
        });
    };
    return DirectFileContentInitializer;
}(types_1.ContentInitializer));
exports.default = DirectFileContentInitializer;
/**
 * calculate initial time as a position in seconds.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object|undefined} [startAt]
 * @returns {number}
 */
function getDirectFileInitialTime(mediaElement, startAt) {
    if ((0, is_null_or_undefined_1.default)(startAt)) {
        return 0;
    }
    if (!(0, is_null_or_undefined_1.default)(startAt.position)) {
        return startAt.position;
    }
    else if (!(0, is_null_or_undefined_1.default)(startAt.wallClockTime)) {
        return startAt.wallClockTime;
    }
    else if (!(0, is_null_or_undefined_1.default)(startAt.fromFirstPosition)) {
        return startAt.fromFirstPosition;
    }
    var duration = mediaElement.duration;
    if (typeof startAt.fromLastPosition === "number") {
        if ((0, is_null_or_undefined_1.default)(duration) || !isFinite(duration)) {
            log_1.default.warn("startAt.fromLastPosition set but no known duration, " + "beginning at 0.");
            return 0;
        }
        return Math.max(0, duration + startAt.fromLastPosition);
    }
    else if (typeof startAt.fromLivePosition === "number") {
        var livePosition = mediaElement.seekable.length > 0 ? mediaElement.seekable.end(0) : duration;
        if ((0, is_null_or_undefined_1.default)(livePosition)) {
            log_1.default.warn("startAt.fromLivePosition set but no known live position, " + "beginning at 0.");
            return 0;
        }
        return Math.max(0, livePosition + startAt.fromLivePosition);
    }
    else if (!(0, is_null_or_undefined_1.default)(startAt.percentage)) {
        if ((0, is_null_or_undefined_1.default)(duration) || !isFinite(duration)) {
            log_1.default.warn("startAt.percentage set but no known duration, " + "beginning at 0.");
            return 0;
        }
        var percentage = startAt.percentage;
        if (percentage >= 100) {
            return duration;
        }
        else if (percentage <= 0) {
            return 0;
        }
        var ratio = +percentage / 100;
        return duration * ratio;
    }
    return 0;
}
