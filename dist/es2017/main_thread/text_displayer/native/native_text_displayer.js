import addTextTrack from "../../../compat/add_text_track";
import removeCue from "../../../compat/remove_cue";
import log from "../../../log";
import { convertToRanges } from "../../../utils/ranges";
import ManualTimeRanges from "../manual_time_ranges";
import parseTextTrackToCues from "./native_parsers";
/**
 * Implementation of an `ITextDisplayer` for "native" text tracks.
 * "Native" text tracks rely on a `<track>` HTMLElement and its associated
 * expected behavior to display subtitles synchronized to the video.
 * @class NativeTextDisplayer
 */
export default class NativeTextDisplayer {
    /**
     * @param {HTMLMediaElement} videoElement
     */
    constructor(videoElement) {
        log.debug("NTD: Creating NativeTextDisplayer");
        const { track, trackElement } = addTextTrack(videoElement);
        this._buffered = new ManualTimeRanges();
        this._videoElement = videoElement;
        this._track = track;
        this._trackElement = trackElement;
    }
    /**
     * Push text segment to the NativeTextDisplayer.
     * @param {Object} infos
     * @returns {Object}
     */
    pushTextData(infos) {
        var _a, _b;
        log.debug("NTD: Appending new native text tracks");
        if (infos.chunk === null) {
            return convertToRanges(this._buffered);
        }
        const { timestampOffset, appendWindow, chunk } = infos;
        const { start: startTime, end: endTime, data: dataString, type, language } = chunk;
        const appendWindowStart = (_a = appendWindow[0]) !== null && _a !== void 0 ? _a : 0;
        const appendWindowEnd = (_b = appendWindow[1]) !== null && _b !== void 0 ? _b : Infinity;
        const cues = parseTextTrackToCues(type, dataString, timestampOffset, language);
        if (appendWindowStart !== 0 && appendWindowEnd !== Infinity) {
            // Removing before window start
            let i = 0;
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
        let start;
        if (startTime !== undefined) {
            start = Math.max(appendWindowStart, startTime);
        }
        else {
            if (cues.length <= 0) {
                log.warn("NTD: Current text tracks have no cues nor start time. Aborting");
                return convertToRanges(this._buffered);
            }
            log.warn("NTD: No start time given. Guessing from cues.");
            start = cues[0].startTime;
        }
        let end;
        if (endTime !== undefined) {
            end = Math.min(appendWindowEnd, endTime);
        }
        else {
            if (cues.length <= 0) {
                log.warn("NTD: Current text tracks have no cues nor end time. Aborting");
                return convertToRanges(this._buffered);
            }
            log.warn("NTD: No end time given. Guessing from cues.");
            end = cues[cues.length - 1].endTime;
        }
        if (end <= start) {
            log.warn("NTD: Invalid text track appended: ", "the start time is inferior or equal to the end time.");
            return convertToRanges(this._buffered);
        }
        if (cues.length > 0) {
            const firstCue = cues[0];
            // NOTE(compat): cleanup all current cues if the newly added
            // ones are in the past. this is supposed to fix an issue on
            // IE/Edge.
            // TODO Move to compat
            const currentCues = this._track.cues;
            if (currentCues !== null && currentCues.length > 0) {
                if (firstCue.startTime < currentCues[currentCues.length - 1].startTime) {
                    this._removeData(firstCue.startTime, +Infinity);
                }
            }
            for (const cue of cues) {
                this._track.addCue(cue);
            }
        }
        this._buffered.insert(start, end);
        return convertToRanges(this._buffered);
    }
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Object}
     */
    removeBuffer(start, end) {
        this._removeData(start, end);
        return convertToRanges(this._buffered);
    }
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {Array.<Object>}
     */
    getBufferedRanges() {
        return convertToRanges(this._buffered);
    }
    reset() {
        log.debug("NTD: Aborting NativeTextDisplayer");
        this._removeData(0, Infinity);
        const { _trackElement, _videoElement } = this;
        if (_trackElement !== undefined && _videoElement.hasChildNodes()) {
            try {
                _videoElement.removeChild(_trackElement);
            }
            catch (e) {
                log.warn("NTD: Can't remove track element from the video");
            }
        }
        // Ugly trick to work-around browser bugs by refreshing its mode
        const oldMode = this._track.mode;
        this._track.mode = "disabled";
        this._track.mode = oldMode;
        if (this._trackElement !== undefined) {
            this._trackElement.innerHTML = "";
        }
    }
    stop() {
        log.debug("NTD: Aborting NativeTextDisplayer");
        this._removeData(0, Infinity);
        const { _trackElement, _videoElement } = this;
        if (_trackElement !== undefined && _videoElement.hasChildNodes()) {
            try {
                _videoElement.removeChild(_trackElement);
            }
            catch (e) {
                log.warn("NTD: Can't remove track element from the video");
            }
        }
        this._track.mode = "disabled";
        if (this._trackElement !== undefined) {
            this._trackElement.innerHTML = "";
        }
    }
    _removeData(start, end) {
        log.debug("NTD: Removing native text track data", start, end);
        const track = this._track;
        const cues = track.cues;
        if (cues !== null) {
            for (let i = cues.length - 1; i >= 0; i--) {
                const cue = cues[i];
                const { startTime, endTime } = cue;
                if (startTime >= start && startTime <= end && endTime <= end) {
                    removeCue(track, cue);
                }
            }
        }
        this._buffered.remove(start, end);
    }
}
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
