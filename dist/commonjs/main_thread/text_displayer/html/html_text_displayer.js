"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var event_listeners_1 = require("../../../compat/event_listeners");
var on_height_width_change_1 = require("../../../compat/on_height_width_change");
var config_1 = require("../../../config");
var log_1 = require("../../../log");
var ranges_1 = require("../../../utils/ranges");
var task_canceller_1 = require("../../../utils/task_canceller");
var manual_time_ranges_1 = require("../manual_time_ranges");
var html_parsers_1 = require("./html_parsers");
var text_track_cues_store_1 = require("./text_track_cues_store");
var update_proportional_elements_1 = require("./update_proportional_elements");
/**
 * @param {Element} element
 * @param {Element} child
 */
function safelyRemoveChild(element, child) {
    try {
        element.removeChild(child);
    }
    catch (_error) {
        log_1.default.warn("HTD: Can't remove text track: not in the element.");
    }
}
/**
 * @param {HTMLElement} element
 * @returns {Object|null}
 */
function getElementResolution(element) {
    var strRows = element.getAttribute("data-resolution-rows");
    var strColumns = element.getAttribute("data-resolution-columns");
    if (strRows === null || strColumns === null) {
        return null;
    }
    var rows = parseInt(strRows, 10);
    var columns = parseInt(strColumns, 10);
    if (rows === null || columns === null) {
        return null;
    }
    return { rows: rows, columns: columns };
}
/**
 * TextDisplayer implementation which display buffered TextTracks in the given
 * HTML element.
 * @class HTMLTextDisplayer
 */
var HTMLTextDisplayer = /** @class */ (function () {
    /**
     * @param {HTMLMediaElement} videoElement
     * @param {HTMLElement} textTrackElement
     */
    function HTMLTextDisplayer(videoElement, textTrackElement) {
        log_1.default.debug("HTD: Creating HTMLTextDisplayer");
        this._buffered = new manual_time_ranges_1.default();
        this._videoElement = videoElement;
        this._textTrackElement = textTrackElement;
        this._sizeUpdateCanceller = new task_canceller_1.default();
        this._subtitlesIntervalCanceller = new task_canceller_1.default();
        this._buffer = new text_track_cues_store_1.default();
        this._currentCues = [];
        this._isAutoRefreshing = false;
    }
    /**
     * Push text segment to the HTMLTextDisplayer.
     * @param {Object} infos
     * @returns {Object}
     */
    HTMLTextDisplayer.prototype.pushTextData = function (infos) {
        var _a, _b;
        log_1.default.debug("HTD: Appending new html text tracks");
        var timestampOffset = infos.timestampOffset, appendWindow = infos.appendWindow, chunk = infos.chunk;
        if (chunk === null) {
            return (0, ranges_1.convertToRanges)(this._buffered);
        }
        var startTime = chunk.start, endTime = chunk.end, dataString = chunk.data, type = chunk.type, language = chunk.language;
        var appendWindowStart = (_a = appendWindow[0]) !== null && _a !== void 0 ? _a : 0;
        var appendWindowEnd = (_b = appendWindow[1]) !== null && _b !== void 0 ? _b : Infinity;
        var cues = (0, html_parsers_1.default)(type, dataString, timestampOffset, language);
        if (appendWindowStart !== 0 && appendWindowEnd !== Infinity) {
            // Removing before window start
            var i = 0;
            while (i < cues.length && cues[i].end <= appendWindowStart) {
                i++;
            }
            cues.splice(0, i);
            i = 0;
            while (i < cues.length && cues[i].start < appendWindowStart) {
                cues[i].start = appendWindowStart;
                i++;
            }
            // Removing after window end
            i = cues.length - 1;
            while (i >= 0 && cues[i].start >= appendWindowEnd) {
                i--;
            }
            cues.splice(i, cues.length);
            i = cues.length - 1;
            while (i >= 0 && cues[i].end > appendWindowEnd) {
                cues[i].end = appendWindowEnd;
                i--;
            }
        }
        var start;
        if (startTime !== undefined) {
            start = Math.max(appendWindowStart, startTime);
        }
        else {
            if (cues.length <= 0) {
                log_1.default.warn("HTD: Current text tracks have no cues nor start time. Aborting");
                return (0, ranges_1.convertToRanges)(this._buffered);
            }
            log_1.default.warn("HTD: No start time given. Guessing from cues.");
            start = cues[0].start;
        }
        var end;
        if (endTime !== undefined) {
            end = Math.min(appendWindowEnd, endTime);
        }
        else {
            if (cues.length <= 0) {
                log_1.default.warn("HTD: Current text tracks have no cues nor end time. Aborting");
                return (0, ranges_1.convertToRanges)(this._buffered);
            }
            log_1.default.warn("HTD: No end time given. Guessing from cues.");
            end = cues[cues.length - 1].end;
        }
        if (end <= start) {
            log_1.default.warn("HTD: Invalid text track appended: ", "the start time is inferior or equal to the end time.");
            return (0, ranges_1.convertToRanges)(this._buffered);
        }
        this._buffer.insert(cues, start, end);
        this._buffered.insert(start, end);
        if (!this._isAutoRefreshing && !this._buffer.isEmpty()) {
            this.autoRefreshSubtitles(this._subtitlesIntervalCanceller.signal);
        }
        return (0, ranges_1.convertToRanges)(this._buffered);
    };
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Object}
     */
    HTMLTextDisplayer.prototype.removeBuffer = function (start, end) {
        log_1.default.debug("HTD: Removing html text track data", start, end);
        this._buffer.remove(start, end);
        this._buffered.remove(start, end);
        if (this._isAutoRefreshing && this._buffer.isEmpty()) {
            this.refreshSubtitles();
            this._isAutoRefreshing = false;
            this._subtitlesIntervalCanceller.cancel();
            this._subtitlesIntervalCanceller = new task_canceller_1.default();
        }
        return (0, ranges_1.convertToRanges)(this._buffered);
    };
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {TimeRanges}
     */
    HTMLTextDisplayer.prototype.getBufferedRanges = function () {
        return (0, ranges_1.convertToRanges)(this._buffered);
    };
    HTMLTextDisplayer.prototype.reset = function () {
        log_1.default.debug("HTD: Resetting HTMLTextDisplayer");
        this.stop();
        this._subtitlesIntervalCanceller = new task_canceller_1.default();
    };
    HTMLTextDisplayer.prototype.stop = function () {
        if (this._subtitlesIntervalCanceller.isUsed()) {
            return;
        }
        log_1.default.debug("HTD: Stopping HTMLTextDisplayer");
        this._disableCurrentCues();
        this._buffer.remove(0, Infinity);
        this._buffered.remove(0, Infinity);
        this._isAutoRefreshing = false;
        this._subtitlesIntervalCanceller.cancel();
    };
    /**
     * Remove the current cue from being displayed.
     */
    HTMLTextDisplayer.prototype._disableCurrentCues = function () {
        this._sizeUpdateCanceller.cancel();
        if (this._currentCues.length > 0) {
            for (var i = 0; i < this._currentCues.length; i++) {
                safelyRemoveChild(this._textTrackElement, this._currentCues[i].element);
            }
            this._currentCues = [];
        }
    };
    /**
     * Display a new Cue. If one was already present, it will be replaced.
     * @param {HTMLElement} elements
     */
    HTMLTextDisplayer.prototype._displayCues = function (elements) {
        var nothingChanged = this._currentCues.length === elements.length &&
            this._currentCues.every(function (current, index) { return current.element === elements[index]; });
        if (nothingChanged) {
            return;
        }
        // Remove and re-display everything
        // TODO More intelligent handling
        this._sizeUpdateCanceller.cancel();
        for (var i = 0; i < this._currentCues.length; i++) {
            safelyRemoveChild(this._textTrackElement, this._currentCues[i].element);
        }
        this._currentCues = [];
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            var resolution = getElementResolution(element);
            this._currentCues.push({ element: element, resolution: resolution });
            this._textTrackElement.appendChild(element);
        }
        var proportionalCues = this._currentCues.filter(function (cue) { return cue.resolution !== null; });
        if (proportionalCues.length > 0) {
            this._sizeUpdateCanceller = new task_canceller_1.default();
            this._sizeUpdateCanceller.linkToSignal(this._subtitlesIntervalCanceller.signal);
            var TEXT_TRACK_SIZE_CHECKS_INTERVAL = config_1.default.getCurrent().TEXT_TRACK_SIZE_CHECKS_INTERVAL;
            // update propertionally-sized elements periodically
            var heightWidthRef = (0, on_height_width_change_1.default)(this._textTrackElement, TEXT_TRACK_SIZE_CHECKS_INTERVAL, this._sizeUpdateCanceller.signal);
            heightWidthRef.onUpdate(function (_a) {
                var height = _a.height, width = _a.width;
                for (var i = 0; i < proportionalCues.length; i++) {
                    var _b = proportionalCues[i], resolution = _b.resolution, element = _b.element;
                    (0, update_proportional_elements_1.default)(height, width, resolution, element);
                }
            }, {
                clearSignal: this._sizeUpdateCanceller.signal,
                emitCurrentValue: true,
            });
        }
    };
    /**
     * Auto-refresh the display of subtitles according to the media element's
     * position and events.
     * @param {Object} cancellationSignal
     */
    HTMLTextDisplayer.prototype.autoRefreshSubtitles = function (cancellationSignal) {
        var _this = this;
        if (this._isAutoRefreshing || cancellationSignal.isCancelled()) {
            return;
        }
        var autoRefreshCanceller = null;
        var MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL = config_1.default.getCurrent().MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL;
        var stopAutoRefresh = function () {
            _this._isAutoRefreshing = false;
            if (autoRefreshCanceller !== null) {
                autoRefreshCanceller.cancel();
                autoRefreshCanceller = null;
            }
        };
        var startAutoRefresh = function () {
            stopAutoRefresh();
            _this._isAutoRefreshing = true;
            autoRefreshCanceller = new task_canceller_1.default();
            autoRefreshCanceller.linkToSignal(cancellationSignal);
            var intervalId = setInterval(function () { return _this.refreshSubtitles(); }, MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL);
            autoRefreshCanceller.signal.register(function () {
                clearInterval(intervalId);
            });
            _this.refreshSubtitles();
        };
        (0, event_listeners_1.onSeeking)(this._videoElement, function () {
            stopAutoRefresh();
            _this._disableCurrentCues();
        }, cancellationSignal);
        (0, event_listeners_1.onSeeked)(this._videoElement, startAutoRefresh, cancellationSignal);
        (0, event_listeners_1.onEnded)(this._videoElement, startAutoRefresh, cancellationSignal);
        startAutoRefresh();
    };
    /**
     * Refresh current subtitles according to the current media element's
     * position.
     */
    HTMLTextDisplayer.prototype.refreshSubtitles = function () {
        var MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL = config_1.default.getCurrent().MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL;
        var time;
        if (this._videoElement.paused || this._videoElement.playbackRate <= 0) {
            time = this._videoElement.currentTime;
        }
        else {
            // to spread the time error, we divide the regular chosen interval.
            time = Math.max(this._videoElement.currentTime +
                MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL / 1000 / 2, 0);
        }
        var cues = this._buffer.get(time);
        if (cues.length === 0) {
            this._disableCurrentCues();
        }
        else {
            this._displayCues(cues);
        }
    };
    return HTMLTextDisplayer;
}());
exports.default = HTMLTextDisplayer;
/*
 * The following ugly code is here to provide a compile-time check that an
 * `IHTMLTextTracksBufferSegmentData` (type of data pushed to a
 * `HTMLTextDisplayer`) can be derived from a `ITextTrackSegmentData`
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
