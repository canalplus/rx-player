"use strict";
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
var add_text_track_1 = require("../../../compat/add_text_track");
var remove_cue_1 = require("../../../compat/remove_cue");
var log_1 = require("../../../log");
var ranges_1 = require("../../../utils/ranges");
var manual_time_ranges_1 = require("../manual_time_ranges");
var native_parsers_1 = require("./native_parsers");
/**
 * Implementation of an `ITextDisplayer` for "native" text tracks.
 * "Native" text tracks rely on a `<track>` HTMLElement and its associated
 * expected behavior to display subtitles synchronized to the video.
 * @class NativeTextDisplayer
 */
var NativeTextDisplayer = /** @class */ (function () {
    /**
     * @param {HTMLMediaElement} videoElement
     */
    function NativeTextDisplayer(videoElement) {
        log_1.default.debug("NTD: Creating NativeTextDisplayer");
        var _a = (0, add_text_track_1.default)(videoElement), track = _a.track, trackElement = _a.trackElement;
        this._buffered = new manual_time_ranges_1.default();
        this._videoElement = videoElement;
        this._track = track;
        this._trackElement = trackElement;
    }
    /**
     * Push text segment to the NativeTextDisplayer.
     * @param {Object} infos
     * @returns {Object}
     */
    NativeTextDisplayer.prototype.pushTextData = function (infos) {
        var e_1, _a;
        var _b, _c;
        log_1.default.debug("NTD: Appending new native text tracks");
        if (infos.chunk === null) {
            return (0, ranges_1.convertToRanges)(this._buffered);
        }
        var timestampOffset = infos.timestampOffset, appendWindow = infos.appendWindow, chunk = infos.chunk;
        var startTime = chunk.start, endTime = chunk.end, dataString = chunk.data, type = chunk.type, language = chunk.language;
        var appendWindowStart = (_b = appendWindow[0]) !== null && _b !== void 0 ? _b : 0;
        var appendWindowEnd = (_c = appendWindow[1]) !== null && _c !== void 0 ? _c : Infinity;
        var cues = (0, native_parsers_1.default)(type, dataString, timestampOffset, language);
        if (appendWindowStart !== 0 && appendWindowEnd !== Infinity) {
            // Removing before window start
            var i = 0;
            while (i < cues.length && cues[i].endTime <= appendWindowStart) {
                i++;
            }
            cues.splice(0, i);
            i = 0;
            while (i < cues.length && cues[i].startTime < appendWindowStart) {
                cues[i].startTime = appendWindowStart;
                i++;
            }
            // Removing after window end
            i = cues.length - 1;
            while (i >= 0 && cues[i].startTime >= appendWindowEnd) {
                i--;
            }
            cues.splice(i, cues.length);
            i = cues.length - 1;
            while (i >= 0 && cues[i].endTime > appendWindowEnd) {
                cues[i].endTime = appendWindowEnd;
                i--;
            }
        }
        var start;
        if (startTime !== undefined) {
            start = Math.max(appendWindowStart, startTime);
        }
        else {
            if (cues.length <= 0) {
                log_1.default.warn("NTD: Current text tracks have no cues nor start time. Aborting");
                return (0, ranges_1.convertToRanges)(this._buffered);
            }
            log_1.default.warn("NTD: No start time given. Guessing from cues.");
            start = cues[0].startTime;
        }
        var end;
        if (endTime !== undefined) {
            end = Math.min(appendWindowEnd, endTime);
        }
        else {
            if (cues.length <= 0) {
                log_1.default.warn("NTD: Current text tracks have no cues nor end time. Aborting");
                return (0, ranges_1.convertToRanges)(this._buffered);
            }
            log_1.default.warn("NTD: No end time given. Guessing from cues.");
            end = cues[cues.length - 1].endTime;
        }
        if (end <= start) {
            log_1.default.warn("NTD: Invalid text track appended: ", "the start time is inferior or equal to the end time.");
            return (0, ranges_1.convertToRanges)(this._buffered);
        }
        if (cues.length > 0) {
            var firstCue = cues[0];
            // NOTE(compat): cleanup all current cues if the newly added
            // ones are in the past. this is supposed to fix an issue on
            // IE/Edge.
            // TODO Move to compat
            var currentCues = this._track.cues;
            if (currentCues !== null && currentCues.length > 0) {
                if (firstCue.startTime < currentCues[currentCues.length - 1].startTime) {
                    this._removeData(firstCue.startTime, +Infinity);
                }
            }
            try {
                for (var cues_1 = __values(cues), cues_1_1 = cues_1.next(); !cues_1_1.done; cues_1_1 = cues_1.next()) {
                    var cue = cues_1_1.value;
                    this._track.addCue(cue);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (cues_1_1 && !cues_1_1.done && (_a = cues_1.return)) _a.call(cues_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        this._buffered.insert(start, end);
        return (0, ranges_1.convertToRanges)(this._buffered);
    };
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Object}
     */
    NativeTextDisplayer.prototype.removeBuffer = function (start, end) {
        this._removeData(start, end);
        return (0, ranges_1.convertToRanges)(this._buffered);
    };
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {Array.<Object>}
     */
    NativeTextDisplayer.prototype.getBufferedRanges = function () {
        return (0, ranges_1.convertToRanges)(this._buffered);
    };
    NativeTextDisplayer.prototype.reset = function () {
        log_1.default.debug("NTD: Aborting NativeTextDisplayer");
        this._removeData(0, Infinity);
        var _a = this, _trackElement = _a._trackElement, _videoElement = _a._videoElement;
        if (_trackElement !== undefined && _videoElement.hasChildNodes()) {
            try {
                _videoElement.removeChild(_trackElement);
            }
            catch (e) {
                log_1.default.warn("NTD: Can't remove track element from the video");
            }
        }
        // Ugly trick to work-around browser bugs by refreshing its mode
        var oldMode = this._track.mode;
        this._track.mode = "disabled";
        this._track.mode = oldMode;
        if (this._trackElement !== undefined) {
            this._trackElement.innerHTML = "";
        }
    };
    NativeTextDisplayer.prototype.stop = function () {
        log_1.default.debug("NTD: Aborting NativeTextDisplayer");
        this._removeData(0, Infinity);
        var _a = this, _trackElement = _a._trackElement, _videoElement = _a._videoElement;
        if (_trackElement !== undefined && _videoElement.hasChildNodes()) {
            try {
                _videoElement.removeChild(_trackElement);
            }
            catch (e) {
                log_1.default.warn("NTD: Can't remove track element from the video");
            }
        }
        this._track.mode = "disabled";
        if (this._trackElement !== undefined) {
            this._trackElement.innerHTML = "";
        }
    };
    NativeTextDisplayer.prototype._removeData = function (start, end) {
        log_1.default.debug("NTD: Removing native text track data", start, end);
        var track = this._track;
        var cues = track.cues;
        if (cues !== null) {
            for (var i = cues.length - 1; i >= 0; i--) {
                var cue = cues[i];
                var startTime = cue.startTime, endTime = cue.endTime;
                if (startTime >= start && startTime <= end && endTime <= end) {
                    (0, remove_cue_1.default)(track, cue);
                }
            }
        }
        this._buffered.remove(start, end);
    };
    return NativeTextDisplayer;
}());
exports.default = NativeTextDisplayer;
/*
 * The following ugly code is here to provide a compile-time check that an
 * `INativeTextTracksBufferSegmentData` (type of data pushed to a
 * `NativeTextDisplayer`) can be derived from a `ITextTrackSegmentData`
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
