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
import config from "../../config";
import arrayIncludes from "../../utils/array_includes";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import SharedReference from "../../utils/reference";
/**
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} playbackObserver - Observes playback conditions on
 * `mediaElement`.
 * @param {function} onSeeking - Callback called when a seeking operation starts
 * on `mediaElement`.
 * @param {function} onSeeked - Callback called when a seeking operation ends
 * on `mediaElement`.
 * @param {Object} cancelSignal - When triggered, stop calling callbacks and
 * remove all listeners this function has registered.
 */
export function emitSeekEvents(mediaElement, playbackObserver, onSeeking, onSeeked, cancelSignal) {
    if (cancelSignal.isCancelled() || mediaElement === null) {
        return;
    }
    let wasSeeking = playbackObserver.getReference().getValue().seeking === 2 /* SeekingState.External */;
    if (wasSeeking) {
        onSeeking();
        if (cancelSignal.isCancelled()) {
            return;
        }
    }
    playbackObserver.listen((obs) => {
        if (obs.event === "seeking") {
            wasSeeking = true;
            onSeeking();
        }
        else if (wasSeeking && obs.event === "seeked") {
            wasSeeking = false;
            onSeeked();
        }
    }, { includeLastObservation: true, clearSignal: cancelSignal });
}
/**
 * @param {HTMLMediaElement} mediaElement
 * @param {function} onPlay - Callback called when a play operation has started
 * on `mediaElement`.
 * @param {function} onPause - Callback called when a pause operation has
 * started on `mediaElement`.
 * @param {Object} cancelSignal - When triggered, stop calling callbacks and
 * remove all listeners this function has registered.
 */
export function emitPlayPauseEvents(mediaElement, onPlay, onPause, cancelSignal) {
    if (cancelSignal.isCancelled() || mediaElement === null) {
        return;
    }
    mediaElement.addEventListener("play", onPlay);
    mediaElement.addEventListener("pause", onPause);
    cancelSignal.register(() => {
        mediaElement.removeEventListener("play", onPlay);
        mediaElement.removeEventListener("pause", onPause);
    });
}
export function constructPlayerStateReference(initializer, mediaElement, playbackObserver, cancelSignal) {
    const playerStateRef = new SharedReference("LOADING" /* PLAYER_STATES.LOADING */, cancelSignal);
    initializer.addEventListener("loaded", () => {
        if (playerStateRef.getValue() === "LOADING" /* PLAYER_STATES.LOADING */) {
            playerStateRef.setValue("LOADED" /* PLAYER_STATES.LOADED */);
            if (!cancelSignal.isCancelled()) {
                const newState = getLoadedContentState(mediaElement, null);
                if (newState !== "PAUSED" /* PLAYER_STATES.PAUSED */) {
                    playerStateRef.setValue(newState);
                }
            }
        }
        else if (playerStateRef.getValue() === "RELOADING" /* PLAYER_STATES.RELOADING */) {
            playerStateRef.setValue(getLoadedContentState(mediaElement, null));
        }
        else {
            updateStateIfLoaded(null);
        }
    }, cancelSignal);
    initializer.addEventListener("reloadingMediaSource", () => {
        if (isLoadedState(playerStateRef.getValue())) {
            playerStateRef.setValueIfChanged("RELOADING" /* PLAYER_STATES.RELOADING */);
        }
    }, cancelSignal);
    /**
     * Keep track of the last known stalling situation.
     * `null` if playback is not stalled.
     */
    let prevStallReason = null;
    initializer.addEventListener("stalled", (s) => {
        if (s !== prevStallReason) {
            updateStateIfLoaded(s);
            prevStallReason = s;
        }
    }, cancelSignal);
    initializer.addEventListener("unstalled", () => {
        if (prevStallReason !== null) {
            updateStateIfLoaded(null);
            prevStallReason = null;
        }
    }, cancelSignal);
    playbackObserver.listen((observation) => {
        if (arrayIncludes(["seeking", "ended", "play", "pause"], observation.event)) {
            updateStateIfLoaded(prevStallReason);
        }
    }, { clearSignal: cancelSignal });
    return playerStateRef;
    function updateStateIfLoaded(stallRes) {
        if (!isLoadedState(playerStateRef.getValue())) {
            return;
        }
        const newState = getLoadedContentState(mediaElement, stallRes);
        const prevState = playerStateRef.getValue();
        // Some safety checks to avoid having nonsense state switches
        if (prevState === "LOADED" /* PLAYER_STATES.LOADED */ && newState === "PAUSED" /* PLAYER_STATES.PAUSED */) {
            return;
        }
        playerStateRef.setValueIfChanged(newState);
    }
}
/**
 * Get state string for a _loaded_ content.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} stalledStatus - Current stalled state:
 *   - null when not stalled
 *   - a description of the situation if stalled.
 * @returns {string}
 */
export function getLoadedContentState(mediaElement, stalledStatus) {
    const { FORCED_ENDED_THRESHOLD } = config.getCurrent();
    if (mediaElement.ended) {
        return "ENDED" /* PLAYER_STATES.ENDED */;
    }
    if (stalledStatus !== null) {
        // On some old browsers (e.g. Chrome 54), the browser does not
        // emit an 'ended' event in some conditions. Detect if we
        // reached the end by comparing the current position and the
        // duration instead.
        const gapBetweenDurationAndCurrentTime = Math.abs(mediaElement.duration - mediaElement.currentTime);
        if (!isNullOrUndefined(FORCED_ENDED_THRESHOLD) &&
            gapBetweenDurationAndCurrentTime < FORCED_ENDED_THRESHOLD) {
            return "ENDED" /* PLAYER_STATES.ENDED */;
        }
        if (stalledStatus === "seeking") {
            return "SEEKING" /* PLAYER_STATES.SEEKING */;
        }
        if (stalledStatus === "freezing") {
            return "FREEZING" /* PLAYER_STATES.FREEZING */;
        }
        return "BUFFERING" /* PLAYER_STATES.BUFFERING */;
    }
    return mediaElement.paused ? "PAUSED" /* PLAYER_STATES.PAUSED */ : "PLAYING" /* PLAYER_STATES.PLAYING */;
}
export function isLoadedState(state) {
    return (state !== "LOADING" /* PLAYER_STATES.LOADING */ &&
        state !== "RELOADING" /* PLAYER_STATES.RELOADING */ &&
        state !== "STOPPED" /* PLAYER_STATES.STOPPED */);
}
