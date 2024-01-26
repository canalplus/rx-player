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
import type {
  IPlaybackObservation,
  IReadOnlyPlaybackObserver,
} from "../../playback_observer";
import { SeekingState } from "../../playback_observer";
import type { IPlayerState } from "../../public_types";
import arrayIncludes from "../../utils/array_includes";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import type { IReadOnlySharedReference } from "../../utils/reference";
import SharedReference from "../../utils/reference";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { ContentInitializer, IStallingSituation } from "../init";

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
export function emitSeekEvents(
  mediaElement: HTMLMediaElement | null,
  playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>,
  onSeeking: () => void,
  onSeeked: () => void,
  cancelSignal: CancellationSignal,
): void {
  if (cancelSignal.isCancelled() || mediaElement === null) {
    return;
  }

  let wasSeeking =
    playbackObserver.getReference().getValue().seeking === SeekingState.External;
  if (wasSeeking) {
    onSeeking();
    if (cancelSignal.isCancelled()) {
      return;
    }
  }
  playbackObserver.listen(
    (obs) => {
      if (obs.event === "seeking") {
        wasSeeking = true;
        onSeeking();
      } else if (wasSeeking && obs.event === "seeked") {
        wasSeeking = false;
        onSeeked();
      }
    },
    { includeLastObservation: true, clearSignal: cancelSignal },
  );
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
export function emitPlayPauseEvents(
  mediaElement: HTMLMediaElement | null,
  onPlay: () => void,
  onPause: () => void,
  cancelSignal: CancellationSignal,
): void {
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

/** Player state dictionnary. */
export const enum PLAYER_STATES {
  STOPPED = "STOPPED",
  LOADED = "LOADED",
  LOADING = "LOADING",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  ENDED = "ENDED",
  BUFFERING = "BUFFERING",
  SEEKING = "SEEKING",
  FREEZING = "FREEZING",
  RELOADING = "RELOADING",
}

export function constructPlayerStateReference(
  initializer: ContentInitializer,
  mediaElement: HTMLMediaElement,
  playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>,
  cancelSignal: CancellationSignal,
): IReadOnlySharedReference<IPlayerState> {
  const playerStateRef = new SharedReference<IPlayerState>(
    PLAYER_STATES.LOADING,
    cancelSignal,
  );
  initializer.addEventListener(
    "loaded",
    () => {
      if (playerStateRef.getValue() === PLAYER_STATES.LOADING) {
        playerStateRef.setValue(PLAYER_STATES.LOADED);
        if (!cancelSignal.isCancelled()) {
          const newState = getLoadedContentState(mediaElement, null);
          if (newState !== PLAYER_STATES.PAUSED) {
            playerStateRef.setValue(newState);
          }
        }
      } else if (playerStateRef.getValue() === PLAYER_STATES.RELOADING) {
        playerStateRef.setValue(getLoadedContentState(mediaElement, null));
      } else {
        updateStateIfLoaded(null);
      }
    },
    cancelSignal,
  );

  initializer.addEventListener(
    "reloadingMediaSource",
    () => {
      if (isLoadedState(playerStateRef.getValue())) {
        playerStateRef.setValueIfChanged(PLAYER_STATES.RELOADING);
      }
    },
    cancelSignal,
  );

  /**
   * Keep track of the last known stalling situation.
   * `null` if playback is not stalled.
   */
  let prevStallReason: IStallingSituation | null = null;
  initializer.addEventListener(
    "stalled",
    (s) => {
      if (s !== prevStallReason) {
        updateStateIfLoaded(s);
        prevStallReason = s;
      }
    },
    cancelSignal,
  );
  initializer.addEventListener(
    "unstalled",
    () => {
      if (prevStallReason !== null) {
        updateStateIfLoaded(null);
        prevStallReason = null;
      }
    },
    cancelSignal,
  );

  playbackObserver.listen(
    (observation) => {
      if (arrayIncludes(["seeking", "ended", "play", "pause"], observation.event)) {
        updateStateIfLoaded(prevStallReason);
      }
    },
    { clearSignal: cancelSignal },
  );
  return playerStateRef;

  function updateStateIfLoaded(stallRes: IStallingSituation | null): void {
    if (!isLoadedState(playerStateRef.getValue())) {
      return;
    }
    const newState = getLoadedContentState(mediaElement, stallRes);
    const prevState = playerStateRef.getValue();

    // Some safety checks to avoid having nonsense state switches
    if (prevState === PLAYER_STATES.LOADED && newState === PLAYER_STATES.PAUSED) {
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
export function getLoadedContentState(
  mediaElement: HTMLMediaElement,
  stalledStatus: IStallingSituation | null,
): IPlayerState {
  const { FORCED_ENDED_THRESHOLD } = config.getCurrent();
  if (mediaElement.ended) {
    return PLAYER_STATES.ENDED;
  }

  if (stalledStatus !== null) {
    // On some old browsers (e.g. Chrome 54), the browser does not
    // emit an 'ended' event in some conditions. Detect if we
    // reached the end by comparing the current position and the
    // duration instead.
    const gapBetweenDurationAndCurrentTime = Math.abs(
      mediaElement.duration - mediaElement.currentTime,
    );
    if (
      !isNullOrUndefined(FORCED_ENDED_THRESHOLD) &&
      gapBetweenDurationAndCurrentTime < FORCED_ENDED_THRESHOLD
    ) {
      return PLAYER_STATES.ENDED;
    }

    return stalledStatus === "seeking"
      ? PLAYER_STATES.SEEKING
      : stalledStatus === "freezing"
        ? PLAYER_STATES.FREEZING
        : PLAYER_STATES.BUFFERING;
  }
  return mediaElement.paused ? PLAYER_STATES.PAUSED : PLAYER_STATES.PLAYING;
}

export function isLoadedState(state: IPlayerState): boolean {
  return (
    state !== PLAYER_STATES.LOADING &&
    state !== PLAYER_STATES.RELOADING &&
    state !== PLAYER_STATES.STOPPED
  );
}
