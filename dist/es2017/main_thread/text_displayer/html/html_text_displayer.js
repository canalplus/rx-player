import { onEnded, onSeeked, onSeeking } from "../../../compat/event_listeners";
import onHeightWidthChange from "../../../compat/on_height_width_change";
import config from "../../../config";
import log from "../../../log";
import { convertToRanges } from "../../../utils/ranges";
import TaskCanceller from "../../../utils/task_canceller";
import ManualTimeRanges from "../manual_time_ranges";
import parseTextTrackToElements from "./html_parsers";
import TextTrackCuesStore from "./text_track_cues_store";
import updateProportionalElements from "./update_proportional_elements";
/**
 * @param {Element} element
 * @param {Element} child
 */
function safelyRemoveChild(element, child) {
    try {
        element.removeChild(child);
    }
    catch (_error) {
        log.warn("HTD: Can't remove text track: not in the element.");
    }
}
/**
 * @param {HTMLElement} element
 * @returns {Object|null}
 */
function getElementResolution(element) {
    const strRows = element.getAttribute("data-resolution-rows");
    const strColumns = element.getAttribute("data-resolution-columns");
    if (strRows === null || strColumns === null) {
        return null;
    }
    const rows = parseInt(strRows, 10);
    const columns = parseInt(strColumns, 10);
    if (rows === null || columns === null) {
        return null;
    }
    return { rows, columns };
}
/**
 * TextDisplayer implementation which display buffered TextTracks in the given
 * HTML element.
 * @class HTMLTextDisplayer
 */
export default class HTMLTextDisplayer {
    /**
     * @param {HTMLMediaElement} videoElement
     * @param {HTMLElement} textTrackElement
     */
    constructor(videoElement, textTrackElement) {
        log.debug("HTD: Creating HTMLTextDisplayer");
        this._buffered = new ManualTimeRanges();
        this._videoElement = videoElement;
        this._textTrackElement = textTrackElement;
        this._sizeUpdateCanceller = new TaskCanceller();
        this._subtitlesIntervalCanceller = new TaskCanceller();
        this._buffer = new TextTrackCuesStore();
        this._currentCues = [];
        this._isAutoRefreshing = false;
    }
    /**
     * Push text segment to the HTMLTextDisplayer.
     * @param {Object} infos
     * @returns {Object}
     */
    pushTextData(infos) {
        var _a, _b;
        log.debug("HTD: Appending new html text tracks");
        const { timestampOffset, appendWindow, chunk } = infos;
        if (chunk === null) {
            return convertToRanges(this._buffered);
        }
        const { start: startTime, end: endTime, data: dataString, type, language } = chunk;
        const appendWindowStart = (_a = appendWindow[0]) !== null && _a !== void 0 ? _a : 0;
        const appendWindowEnd = (_b = appendWindow[1]) !== null && _b !== void 0 ? _b : Infinity;
        const cues = parseTextTrackToElements(type, dataString, timestampOffset, language);
        if (appendWindowStart !== 0 && appendWindowEnd !== Infinity) {
            // Removing before window start
            let i = 0;
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
        let start;
        if (startTime !== undefined) {
            start = Math.max(appendWindowStart, startTime);
        }
        else {
            if (cues.length <= 0) {
                log.warn("HTD: Current text tracks have no cues nor start time. Aborting");
                return convertToRanges(this._buffered);
            }
            log.warn("HTD: No start time given. Guessing from cues.");
            start = cues[0].start;
        }
        let end;
        if (endTime !== undefined) {
            end = Math.min(appendWindowEnd, endTime);
        }
        else {
            if (cues.length <= 0) {
                log.warn("HTD: Current text tracks have no cues nor end time. Aborting");
                return convertToRanges(this._buffered);
            }
            log.warn("HTD: No end time given. Guessing from cues.");
            end = cues[cues.length - 1].end;
        }
        if (end <= start) {
            log.warn("HTD: Invalid text track appended: ", "the start time is inferior or equal to the end time.");
            return convertToRanges(this._buffered);
        }
        this._buffer.insert(cues, start, end);
        this._buffered.insert(start, end);
        if (!this._isAutoRefreshing && !this._buffer.isEmpty()) {
            this.autoRefreshSubtitles(this._subtitlesIntervalCanceller.signal);
        }
        return convertToRanges(this._buffered);
    }
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Object}
     */
    removeBuffer(start, end) {
        log.debug("HTD: Removing html text track data", start, end);
        this._buffer.remove(start, end);
        this._buffered.remove(start, end);
        if (this._isAutoRefreshing && this._buffer.isEmpty()) {
            this.refreshSubtitles();
            this._isAutoRefreshing = false;
            this._subtitlesIntervalCanceller.cancel();
            this._subtitlesIntervalCanceller = new TaskCanceller();
        }
        return convertToRanges(this._buffered);
    }
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {TimeRanges}
     */
    getBufferedRanges() {
        return convertToRanges(this._buffered);
    }
    reset() {
        log.debug("HTD: Resetting HTMLTextDisplayer");
        this.stop();
        this._subtitlesIntervalCanceller = new TaskCanceller();
    }
    stop() {
        if (this._subtitlesIntervalCanceller.isUsed()) {
            return;
        }
        log.debug("HTD: Stopping HTMLTextDisplayer");
        this._disableCurrentCues();
        this._buffer.remove(0, Infinity);
        this._buffered.remove(0, Infinity);
        this._isAutoRefreshing = false;
        this._subtitlesIntervalCanceller.cancel();
    }
    /**
     * Remove the current cue from being displayed.
     */
    _disableCurrentCues() {
        this._sizeUpdateCanceller.cancel();
        if (this._currentCues.length > 0) {
            for (let i = 0; i < this._currentCues.length; i++) {
                safelyRemoveChild(this._textTrackElement, this._currentCues[i].element);
            }
            this._currentCues = [];
        }
    }
    /**
     * Display a new Cue. If one was already present, it will be replaced.
     * @param {HTMLElement} elements
     */
    _displayCues(elements) {
        const nothingChanged = this._currentCues.length === elements.length &&
            this._currentCues.every((current, index) => current.element === elements[index]);
        if (nothingChanged) {
            return;
        }
        // Remove and re-display everything
        // TODO More intelligent handling
        this._sizeUpdateCanceller.cancel();
        for (let i = 0; i < this._currentCues.length; i++) {
            safelyRemoveChild(this._textTrackElement, this._currentCues[i].element);
        }
        this._currentCues = [];
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const resolution = getElementResolution(element);
            this._currentCues.push({ element, resolution });
            this._textTrackElement.appendChild(element);
        }
        const proportionalCues = this._currentCues.filter((cue) => cue.resolution !== null);
        if (proportionalCues.length > 0) {
            this._sizeUpdateCanceller = new TaskCanceller();
            this._sizeUpdateCanceller.linkToSignal(this._subtitlesIntervalCanceller.signal);
            const { TEXT_TRACK_SIZE_CHECKS_INTERVAL } = config.getCurrent();
            // update propertionally-sized elements periodically
            const heightWidthRef = onHeightWidthChange(this._textTrackElement, TEXT_TRACK_SIZE_CHECKS_INTERVAL, this._sizeUpdateCanceller.signal);
            heightWidthRef.onUpdate(({ height, width }) => {
                for (let i = 0; i < proportionalCues.length; i++) {
                    const { resolution, element } = proportionalCues[i];
                    updateProportionalElements(height, width, resolution, element);
                }
            }, {
                clearSignal: this._sizeUpdateCanceller.signal,
                emitCurrentValue: true,
            });
        }
    }
    /**
     * Auto-refresh the display of subtitles according to the media element's
     * position and events.
     * @param {Object} cancellationSignal
     */
    autoRefreshSubtitles(cancellationSignal) {
        if (this._isAutoRefreshing || cancellationSignal.isCancelled()) {
            return;
        }
        let autoRefreshCanceller = null;
        const { MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL } = config.getCurrent();
        const stopAutoRefresh = () => {
            this._isAutoRefreshing = false;
            if (autoRefreshCanceller !== null) {
                autoRefreshCanceller.cancel();
                autoRefreshCanceller = null;
            }
        };
        const startAutoRefresh = () => {
            stopAutoRefresh();
            this._isAutoRefreshing = true;
            autoRefreshCanceller = new TaskCanceller();
            autoRefreshCanceller.linkToSignal(cancellationSignal);
            const intervalId = setInterval(() => this.refreshSubtitles(), MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL);
            autoRefreshCanceller.signal.register(() => {
                clearInterval(intervalId);
            });
            this.refreshSubtitles();
        };
        onSeeking(this._videoElement, () => {
            stopAutoRefresh();
            this._disableCurrentCues();
        }, cancellationSignal);
        onSeeked(this._videoElement, startAutoRefresh, cancellationSignal);
        onEnded(this._videoElement, startAutoRefresh, cancellationSignal);
        startAutoRefresh();
    }
    /**
     * Refresh current subtitles according to the current media element's
     * position.
     */
    refreshSubtitles() {
        const { MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL } = config.getCurrent();
        let time;
        if (this._videoElement.paused || this._videoElement.playbackRate <= 0) {
            time = this._videoElement.currentTime;
        }
        else {
            // to spread the time error, we divide the regular chosen interval.
            time = Math.max(this._videoElement.currentTime +
                MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL / 1000 / 2, 0);
        }
        const cues = this._buffer.get(time);
        if (cues.length === 0) {
            this._disableCurrentCues();
        }
        else {
            this._displayCues(cues);
        }
    }
}
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
