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
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTextTrackRemoved = exports.onTextTrackAdded = exports.onSourceBufferUpdate = exports.onTimeUpdate = exports.onSourceOpen = exports.onSourceEnded = exports.onSourceClose = exports.onSeeking = exports.onSeeked = exports.onRemoveSourceBuffers = exports.onLoadedMetadata = exports.onKeyStatusesChange = exports.onKeyMessage = exports.onKeyError = exports.onKeyAdded = exports.onEnded = exports.getScreenResolutionRef = exports.getElementResolutionRef = exports.getVideoVisibilityRef = exports.getPictureOnPictureStateRef = exports.createCompatibleEventListener = exports.addEventListener = void 0;
var config_1 = require("../config");
var log_1 = require("../log");
var global_scope_1 = require("../utils/global_scope");
var is_non_empty_string_1 = require("../utils/is_non_empty_string");
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
var noop_1 = require("../utils/noop");
var reference_1 = require("../utils/reference");
var BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];
/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {string} eventNameSuffix
 * @returns {Boolean}
 */
function isEventSupported(element, eventNameSuffix) {
    var clone = document.createElement(element.tagName);
    var eventName = "on" + eventNameSuffix;
    if (eventName in clone) {
        return true;
    }
    else {
        clone.setAttribute(eventName, "return;");
        return (typeof clone[eventName] ===
            "function");
    }
}
/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {Array.<string>} eventNames
 * @returns {string|undefined}
 */
function findSupportedEvent(element, eventNames) {
    return eventNames.filter(function (name) { return isEventSupported(element, name); })[0];
}
/**
 * @param {Array.<string>} eventNames
 * @param {Array.<string>|undefined} prefixes
 * @returns {Array.<string>}
 */
function eventPrefixed(eventNames, prefixes) {
    return eventNames.reduce(function (parent, name) {
        return parent.concat((prefixes === undefined ? BROWSER_PREFIXES : prefixes).map(function (p) { return p + name; }));
    }, []);
}
/**
 * Returns a function allowing to add event listeners for particular event(s)
 * optionally automatically adding browser prefixes if needed.
 * @param {Array.<string>} eventNames - The event(s) to listen to. If multiple
 * events are set, the event listener will be triggered when any of them emits.
 * @param {Array.<string>|undefined} [prefixes] - Optional vendor prefixes with
 * which the event might also be sent. If not defined, default prefixes might be
 * tested.
 * @returns {Function} - Returns function allowing to easily add a callback to
 * be triggered when that event is emitted on a given event target.
 */
function createCompatibleEventListener(eventNames, prefixes) {
    var mem;
    var prefixedEvents = eventPrefixed(eventNames, prefixes);
    return function (element, listener, cancelSignal) {
        if (cancelSignal.isCancelled()) {
            return;
        }
        // if the element is a HTMLElement we can detect
        // the supported event, and memoize it in `mem`
        if (typeof HTMLElement !== "undefined" && element instanceof HTMLElement) {
            if (typeof mem === "undefined") {
                mem = findSupportedEvent(element, prefixedEvents);
            }
            if ((0, is_non_empty_string_1.default)(mem)) {
                element.addEventListener(mem, listener);
                cancelSignal.register(function () {
                    if (mem !== undefined) {
                        element.removeEventListener(mem, listener);
                    }
                });
            }
            else {
                if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
                    log_1.default.warn("compat: element ".concat(element.tagName) +
                        " does not support any of these events: " +
                        prefixedEvents.join(", "));
                }
                return;
            }
        }
        prefixedEvents.forEach(function (eventName) {
            var hasSetOnFn = false;
            if (typeof element.addEventListener === "function") {
                element.addEventListener(eventName, listener);
            }
            else {
                hasSetOnFn = true;
                /* eslint-disable @typescript-eslint/no-unsafe-member-access */
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                element["on" + eventName] = listener;
                /* eslint-enable @typescript-eslint/no-unsafe-member-access */
            }
            cancelSignal.register(function () {
                if (typeof element.removeEventListener === "function") {
                    element.removeEventListener(eventName, listener);
                }
                if (hasSetOnFn) {
                    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    delete element["on" + eventName];
                    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
                }
            });
        });
    };
}
exports.createCompatibleEventListener = createCompatibleEventListener;
/**
 * Returns a reference:
 *   - set to `true` when the document is visible
 *   - set to `false` when the document is hidden
 * @param {Object} stopListening - `CancellationSignal` allowing to free the
 * ressources allocated to update this value.
 * @returns {Object}
 */
function getDocumentVisibilityRef(stopListening) {
    var prefix;
    var doc = document;
    if (!(0, is_null_or_undefined_1.default)(doc.hidden)) {
        prefix = "";
    }
    else if (!(0, is_null_or_undefined_1.default)(doc.mozHidden)) {
        prefix = "moz";
    }
    else if (!(0, is_null_or_undefined_1.default)(doc.msHidden)) {
        prefix = "ms";
    }
    else if (!(0, is_null_or_undefined_1.default)(doc.webkitHidden)) {
        prefix = "webkit";
    }
    var hidden = (0, is_non_empty_string_1.default)(prefix) ? (prefix + "Hidden") : "hidden";
    var visibilityChangeEvent = (0, is_non_empty_string_1.default)(prefix)
        ? prefix + "visibilitychange"
        : "visibilitychange";
    var isHidden = document[hidden];
    var ref = new reference_1.default(!isHidden, stopListening);
    addEventListener(document, visibilityChangeEvent, function () {
        var isVisible = !document[hidden];
        ref.setValueIfChanged(isVisible);
    }, stopListening);
    return ref;
}
/**
 * Emit when video enters and leaves Picture-In-Picture mode.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} stopListening
 * @returns {Object}
 */
function getPictureOnPictureStateRef(mediaElement, stopListening) {
    if (mediaElement.webkitSupportsPresentationMode === true &&
        typeof mediaElement.webkitSetPresentationMode === "function") {
        var isWebKitPIPEnabled = mediaElement.webkitPresentationMode === "picture-in-picture";
        var ref_1 = new reference_1.default({
            isEnabled: isWebKitPIPEnabled,
            pipWindow: null,
        }, stopListening);
        addEventListener(mediaElement, "webkitpresentationmodechanged", function () {
            var isEnabled = mediaElement.webkitPresentationMode === "picture-in-picture";
            ref_1.setValue({ isEnabled: isEnabled, pipWindow: null });
        }, stopListening);
        return ref_1;
    }
    var isPIPEnabled = document.pictureInPictureElement === mediaElement;
    var ref = new reference_1.default({ isEnabled: isPIPEnabled, pipWindow: null }, stopListening);
    addEventListener(mediaElement, "enterpictureinpicture", function (evt) {
        var _a;
        ref.setValue({
            isEnabled: true,
            pipWindow: (_a = evt.pictureInPictureWindow) !== null && _a !== void 0 ? _a : null,
        });
    }, stopListening);
    addEventListener(mediaElement, "leavepictureinpicture", function () {
        ref.setValue({ isEnabled: false, pipWindow: null });
    }, stopListening);
    return ref;
}
exports.getPictureOnPictureStateRef = getPictureOnPictureStateRef;
/**
 * Returns a reference:
 *   - Set to `true` when video is considered as visible (the page is visible
 *     and/or the Picture-In-Picture is activated).
 *   - Set to `false` otherwise.
 * @param {Object} pipStatus
 * @param {Object} stopListening - `CancellationSignal` allowing to free the
 * resources reserved to listen to video visibility change.
 * @returns {Object}
 */
function getVideoVisibilityRef(pipStatus, stopListening) {
    var isDocVisibleRef = getDocumentVisibilityRef(stopListening);
    var currentTimeout;
    var ref = new reference_1.default(true, stopListening);
    stopListening.register(function () {
        clearTimeout(currentTimeout);
        currentTimeout = undefined;
    });
    isDocVisibleRef.onUpdate(checkCurrentVisibility, {
        clearSignal: stopListening,
    });
    pipStatus.onUpdate(checkCurrentVisibility, { clearSignal: stopListening });
    checkCurrentVisibility();
    return ref;
    function checkCurrentVisibility() {
        clearTimeout(currentTimeout);
        currentTimeout = undefined;
        if (pipStatus.getValue().isEnabled || isDocVisibleRef.getValue()) {
            ref.setValueIfChanged(true);
        }
        else {
            var INACTIVITY_DELAY = config_1.default.getCurrent().INACTIVITY_DELAY;
            currentTimeout = setTimeout(function () {
                ref.setValueIfChanged(false);
            }, INACTIVITY_DELAY);
        }
    }
}
exports.getVideoVisibilityRef = getVideoVisibilityRef;
/**
 * Get video width and height from the screen dimensions.
 * @param {Object} stopListening
 * @returns {Object}
 */
function getScreenResolutionRef(stopListening) {
    var _a, _b;
    var pixelRatio = (0, is_null_or_undefined_1.default)(global_scope_1.default.devicePixelRatio) || global_scope_1.default.devicePixelRatio === 0
        ? 1
        : global_scope_1.default.devicePixelRatio;
    var ref = new reference_1.default({
        width: (_a = global_scope_1.default.screen) === null || _a === void 0 ? void 0 : _a.width,
        height: (_b = global_scope_1.default.screen) === null || _b === void 0 ? void 0 : _b.height,
        pixelRatio: pixelRatio,
    }, stopListening);
    var interval = setInterval(checkScreenResolution, 20000);
    stopListening.register(function stopUpdating() {
        clearInterval(interval);
    });
    return ref;
    function checkScreenResolution() {
        var oldVal = ref.getValue();
        if (oldVal.width !== screen.width ||
            oldVal.height !== screen.height ||
            oldVal.pixelRatio !== pixelRatio) {
            ref.setValue({ width: screen.width, height: screen.height, pixelRatio: pixelRatio });
        }
    }
}
exports.getScreenResolutionRef = getScreenResolutionRef;
/**
 * Get video width and height from HTML media element, or video estimated
 * dimensions when Picture-in-Picture is activated.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} pipStatusRef
 * @param {Object} stopListening
 * @returns {Object}
 */
function getElementResolutionRef(mediaElement, pipStatusRef, stopListening) {
    var pixelRatio = (0, is_null_or_undefined_1.default)(global_scope_1.default.devicePixelRatio) || global_scope_1.default.devicePixelRatio === 0
        ? 1
        : global_scope_1.default.devicePixelRatio;
    var ref = new reference_1.default({
        width: mediaElement.clientWidth,
        height: mediaElement.clientHeight,
        pixelRatio: pixelRatio,
    }, stopListening);
    var clearPreviousEventListener = noop_1.default;
    pipStatusRef.onUpdate(checkElementResolution, { clearSignal: stopListening });
    addEventListener(global_scope_1.default, "resize", checkElementResolution, stopListening);
    addEventListener(mediaElement, "enterpictureinpicture", checkElementResolution, stopListening);
    addEventListener(mediaElement, "leavepictureinpicture", checkElementResolution, stopListening);
    var interval = setInterval(checkElementResolution, 20000);
    checkElementResolution();
    stopListening.register(function stopUpdating() {
        clearPreviousEventListener();
        clearInterval(interval);
    });
    return ref;
    function checkElementResolution() {
        clearPreviousEventListener();
        var pipStatus = pipStatusRef.getValue();
        var pipWindow = pipStatus.pipWindow;
        if (!pipStatus.isEnabled) {
            var oldVal = ref.getValue();
            if (oldVal.width !== mediaElement.clientWidth ||
                oldVal.height !== mediaElement.clientHeight ||
                oldVal.pixelRatio !== pixelRatio) {
                ref.setValue({
                    width: mediaElement.clientWidth,
                    height: mediaElement.clientHeight,
                    pixelRatio: pixelRatio,
                });
            }
        }
        else if (!(0, is_null_or_undefined_1.default)(pipWindow)) {
            var onPipResize_1 = function () {
                updateToPipWindowResolution();
            };
            pipWindow.addEventListener("resize", onPipResize_1);
            clearPreviousEventListener = function () {
                pipWindow.removeEventListener("resize", onPipResize_1);
                clearPreviousEventListener = noop_1.default;
            };
            updateToPipWindowResolution();
        }
        else {
            var oldVal = ref.getValue();
            if (oldVal.width !== undefined ||
                oldVal.height !== undefined ||
                oldVal.pixelRatio !== pixelRatio) {
                ref.setValue({ width: undefined, height: undefined, pixelRatio: pixelRatio });
            }
        }
        function updateToPipWindowResolution() {
            var oldVal = ref.getValue();
            if (oldVal.width !== (pipWindow === null || pipWindow === void 0 ? void 0 : pipWindow.width) ||
                oldVal.height !== (pipWindow === null || pipWindow === void 0 ? void 0 : pipWindow.height) ||
                oldVal.pixelRatio !== pixelRatio) {
                ref.setValue({
                    width: pipWindow === null || pipWindow === void 0 ? void 0 : pipWindow.width,
                    height: pipWindow === null || pipWindow === void 0 ? void 0 : pipWindow.height,
                    pixelRatio: pixelRatio,
                });
            }
        }
    }
}
exports.getElementResolutionRef = getElementResolutionRef;
/**
 * @param {HTMLMediaElement} mediaElement
 */
var onLoadedMetadata = createCompatibleEventListener(["loadedmetadata"]);
exports.onLoadedMetadata = onLoadedMetadata;
/**
 * @param {HTMLMediaElement} mediaElement
 */
var onTimeUpdate = createCompatibleEventListener(["timeupdate"]);
exports.onTimeUpdate = onTimeUpdate;
/**
 * @param {TextTrackList} mediaElement
 */
var onTextTrackAdded = createCompatibleEventListener(["addtrack"]);
exports.onTextTrackAdded = onTextTrackAdded;
/**
 * @param {TextTrackList} textTrackList
 */
var onTextTrackRemoved = createCompatibleEventListener(["removetrack"]);
exports.onTextTrackRemoved = onTextTrackRemoved;
/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
var onSourceOpen = createCompatibleEventListener(["sourceopen", "webkitsourceopen"]);
exports.onSourceOpen = onSourceOpen;
/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
var onSourceClose = createCompatibleEventListener(["sourceclose", "webkitsourceclose"]);
exports.onSourceClose = onSourceClose;
/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
var onSourceEnded = createCompatibleEventListener(["sourceended", "webkitsourceended"]);
exports.onSourceEnded = onSourceEnded;
/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
var onSourceBufferUpdate = createCompatibleEventListener(["update"]);
exports.onSourceBufferUpdate = onSourceBufferUpdate;
/**
 * @param {SourceBufferList} sourceBuffers
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
var onRemoveSourceBuffers = createCompatibleEventListener(["removesourcebuffer"]);
exports.onRemoveSourceBuffers = onRemoveSourceBuffers;
/**
 * @param {MediaKeySession} mediaKeySession
 */
var onKeyMessage = createCompatibleEventListener(["keymessage", "message"]);
exports.onKeyMessage = onKeyMessage;
/**
 * @param {MediaKeySession} mediaKeySession
 */
var onKeyAdded = createCompatibleEventListener(["keyadded", "ready"]);
exports.onKeyAdded = onKeyAdded;
/**
 * @param {MediaKeySession} mediaKeySession
 */
var onKeyError = createCompatibleEventListener(["keyerror", "error"]);
exports.onKeyError = onKeyError;
/**
 * @param {MediaKeySession} mediaKeySession
 */
var onKeyStatusesChange = createCompatibleEventListener(["keystatuseschange"]);
exports.onKeyStatusesChange = onKeyStatusesChange;
/**
 * @param {HTMLMediaElement} mediaElement
 */
var onSeeking = createCompatibleEventListener(["seeking"]);
exports.onSeeking = onSeeking;
/**
 * @param {HTMLMediaElement} mediaElement
 */
var onSeeked = createCompatibleEventListener(["seeked"]);
exports.onSeeked = onSeeked;
/**
 * @param {HTMLMediaElement} mediaElement
 */
var onEnded = createCompatibleEventListener(["ended"]);
exports.onEnded = onEnded;
/**
 * Utilitary function allowing to add an event listener and remove it
 * automatically once the given `CancellationSignal` emits.
 * @param {EventTarget} elt - The element on which should be attached the event
 * listener.
 * @param {string} evt - The event you wish to listen to
 * @param {Function} listener - The listener function
 * @param {Object} stopListening - Removes the event listener once this signal
 * emits
 */
function addEventListener(elt, evt, listener, stopListening) {
    elt.addEventListener(evt, listener);
    stopListening.register(function () {
        elt.removeEventListener(evt, listener);
    });
}
exports.addEventListener = addEventListener;
