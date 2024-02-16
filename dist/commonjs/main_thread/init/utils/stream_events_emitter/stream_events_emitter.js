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
var config_1 = require("../../../../config");
var event_emitter_1 = require("../../../../utils/event_emitter");
var reference_1 = require("../../../../utils/reference");
var task_canceller_1 = require("../../../../utils/task_canceller");
var refresh_scheduled_events_list_1 = require("./refresh_scheduled_events_list");
/**
 * Get events from manifest and emit each time an event has to be emitted
 */
var StreamEventsEmitter = /** @class */ (function (_super) {
    __extends(StreamEventsEmitter, _super);
    /**
     * @param {Object} manifest
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    function StreamEventsEmitter(manifest, mediaElement, playbackObserver) {
        var _this = _super.call(this) || this;
        _this._manifest = manifest;
        _this._mediaElement = mediaElement;
        _this._playbackObserver = playbackObserver;
        _this._canceller = null;
        _this._scheduledEventsRef = new reference_1.default([]);
        _this._eventsBeingPlayed = new WeakMap();
        return _this;
    }
    StreamEventsEmitter.prototype.start = function () {
        var _this = this;
        if (this._canceller !== null) {
            return;
        }
        this._canceller = new task_canceller_1.default();
        var cancelSignal = this._canceller.signal;
        var playbackObserver = this._playbackObserver;
        var mediaElement = this._mediaElement;
        var isPollingEvents = false;
        var cancelCurrentPolling = new task_canceller_1.default();
        cancelCurrentPolling.linkToSignal(cancelSignal);
        this._scheduledEventsRef.setValue((0, refresh_scheduled_events_list_1.default)([], this._manifest));
        this._scheduledEventsRef.onUpdate(function (_a) {
            var scheduledEventsLength = _a.length;
            if (scheduledEventsLength === 0) {
                if (isPollingEvents) {
                    cancelCurrentPolling.cancel();
                    cancelCurrentPolling = new task_canceller_1.default();
                    cancelCurrentPolling.linkToSignal(cancelSignal);
                    isPollingEvents = false;
                }
                return;
            }
            else if (isPollingEvents) {
                return;
            }
            isPollingEvents = true;
            var oldObservation = constructObservation();
            var checkStreamEvents = function () {
                var newObservation = constructObservation();
                _this._emitStreamEvents(_this._scheduledEventsRef.getValue(), oldObservation, newObservation, cancelCurrentPolling.signal);
                oldObservation = newObservation;
            };
            var STREAM_EVENT_EMITTER_POLL_INTERVAL = config_1.default.getCurrent().STREAM_EVENT_EMITTER_POLL_INTERVAL;
            var intervalId = setInterval(checkStreamEvents, STREAM_EVENT_EMITTER_POLL_INTERVAL);
            playbackObserver.listen(checkStreamEvents, {
                includeLastObservation: false,
                clearSignal: cancelCurrentPolling.signal,
            });
            cancelCurrentPolling.signal.register(function () {
                clearInterval(intervalId);
            });
            function constructObservation() {
                var lastObservation = playbackObserver.getReference().getValue();
                var currentTime = mediaElement.currentTime;
                var isSeeking = lastObservation.seeking !== 0 /* SeekingState.None */;
                return { currentTime: currentTime, isSeeking: isSeeking };
            }
        }, { emitCurrentValue: true, clearSignal: cancelSignal });
    };
    StreamEventsEmitter.prototype.onManifestUpdate = function (man) {
        var prev = this._scheduledEventsRef.getValue();
        this._scheduledEventsRef.setValue((0, refresh_scheduled_events_list_1.default)(prev, man));
    };
    StreamEventsEmitter.prototype.stop = function () {
        if (this._canceller !== null) {
            this._canceller.cancel();
            this._canceller = null;
        }
    };
    /**
     * Examine playback situation from playback observations to emit stream events and
     * prepare set onExit callbacks if needed.
     * @param {Array.<Object>} scheduledEvents
     * @param {Object} oldObservation
     * @param {Object} newObservation
     * @param {Object} stopSignal
     */
    StreamEventsEmitter.prototype._emitStreamEvents = function (scheduledEvents, oldObservation, newObservation, stopSignal) {
        var e_1, _a, e_2, _b;
        var previousTime = oldObservation.currentTime;
        var isSeeking = newObservation.isSeeking, currentTime = newObservation.currentTime;
        var eventsToSend = [];
        var eventsToExit = [];
        for (var i = 0; i < scheduledEvents.length; i++) {
            var event_1 = scheduledEvents[i];
            var start = event_1.start;
            var end = isFiniteStreamEvent(event_1) ? event_1.end : undefined;
            var isBeingPlayed = this._eventsBeingPlayed.has(event_1);
            if (isBeingPlayed) {
                if (start > currentTime || (end !== undefined && currentTime >= end)) {
                    if (isFiniteStreamEvent(event_1)) {
                        eventsToExit.push(event_1.publicEvent);
                    }
                    this._eventsBeingPlayed.delete(event_1);
                }
            }
            else if (start <= currentTime && end !== undefined && currentTime < end) {
                eventsToSend.push({ type: "stream-event", value: event_1.publicEvent });
                this._eventsBeingPlayed.set(event_1, true);
            }
            else if (previousTime < start && currentTime >= (end !== null && end !== void 0 ? end : start)) {
                if (isSeeking) {
                    eventsToSend.push({
                        type: "stream-event-skip",
                        value: event_1.publicEvent,
                    });
                }
                else {
                    eventsToSend.push({ type: "stream-event", value: event_1.publicEvent });
                    if (isFiniteStreamEvent(event_1)) {
                        eventsToExit.push(event_1.publicEvent);
                    }
                }
            }
        }
        if (eventsToSend.length > 0) {
            try {
                for (var eventsToSend_1 = __values(eventsToSend), eventsToSend_1_1 = eventsToSend_1.next(); !eventsToSend_1_1.done; eventsToSend_1_1 = eventsToSend_1.next()) {
                    var event_2 = eventsToSend_1_1.value;
                    if (event_2.type === "stream-event") {
                        this.trigger("event", event_2.value);
                    }
                    else {
                        this.trigger("eventSkip", event_2.value);
                    }
                    if (stopSignal.isCancelled()) {
                        return;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (eventsToSend_1_1 && !eventsToSend_1_1.done && (_a = eventsToSend_1.return)) _a.call(eventsToSend_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        if (eventsToExit.length > 0) {
            try {
                for (var eventsToExit_1 = __values(eventsToExit), eventsToExit_1_1 = eventsToExit_1.next(); !eventsToExit_1_1.done; eventsToExit_1_1 = eventsToExit_1.next()) {
                    var event_3 = eventsToExit_1_1.value;
                    if (typeof event_3.onExit === "function") {
                        event_3.onExit();
                    }
                    if (stopSignal.isCancelled()) {
                        return;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (eventsToExit_1_1 && !eventsToExit_1_1.done && (_b = eventsToExit_1.return)) _b.call(eventsToExit_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    };
    return StreamEventsEmitter;
}(event_emitter_1.default));
exports.default = StreamEventsEmitter;
/**
 * Tells if a stream event has a duration
 * @param {Object} evt
 * @returns {Boolean}
 */
function isFiniteStreamEvent(evt) {
    return evt.end !== undefined;
}
