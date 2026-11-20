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

import type { IMediaElement } from "../../compat/browser_compatibility_types.ts";
import canPreloadBeforePlay from "../../compat/can_preload_before_play.ts";
import config from "../../config.ts";
import type {
  IMediaObservation,
  IReadOnlyMediaElementMonitor,
} from "../../media_element_monitor/index.ts";
import { SeekingState } from "../../media_element_monitor/index.ts";
import type { IPlayerState } from "../../public_types.ts";
import arrayIncludes from "../../utils/array_includes.ts";
import isNullOrUndefined from "../../utils/is_null_or_undefined.ts";
import type { IReadOnlySharedReference } from "../../utils/reference.ts";
import SharedReference from "../../utils/reference.ts";
import type { CancellationSignal } from "../../utils/task_canceller.ts";
import type { ContentInitializer, IStallingSituation } from "../init/index.ts";

/**
 * @param {Object} mediaElementMonitor - Observes playback conditions on
 * `mediaElement`.
 * @param {function} onSeeking - Callback called when a seeking operation starts
 * on `mediaElement`.
 * @param {function} onSeeked - Callback called when a seeking operation ends
 * on `mediaElement`.
 * @param {Object} cancelSignal - When triggered, stop calling callbacks and
 * remove all listeners this function has registered.
 */
export function emitSeekEvents(
  mediaElementMonitor: IReadOnlyMediaElementMonitor<IMediaObservation>,
  onSeeking: () => void,
  onSeeked: () => void,
  cancelSignal: CancellationSignal,
): void {
  if (cancelSignal.isCancelled()) {
    return;
  }

  let wasSeeking =
    mediaElementMonitor.getReference().getValue().seeking === SeekingState.External;
  if (wasSeeking) {
    onSeeking();
    if (cancelSignal.isCancelled()) {
      return;
    }
  }
  mediaElementMonitor.listen(
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
  mediaElement: IMediaElement | null,
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
  mediaElement: IMediaElement,
  mediaElementMonitor: IReadOnlyMediaElementMonitor<IMediaObservation>,
  isDirectFile: boolean,
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
          const newState = getLoadedContentState(
            mediaElement,
            null,
            isDirectFile,
            playerStateRef.getValue(),
          );
          if (newState !== PLAYER_STATES.PAUSED) {
            playerStateRef.setValue(newState);
          }
        }
      } else if (playerStateRef.getValue() === PLAYER_STATES.RELOADING) {
        playerStateRef.setValue(
          getLoadedContentState(
            mediaElement,
            null,
            isDirectFile,
            playerStateRef.getValue(),
          ),
        );
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

  mediaElementMonitor.listen(
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
    const newState = getLoadedContentState(
      mediaElement,
      stallRes,
      isDirectFile,
      playerStateRef.getValue(),
    );
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
  mediaElement: IMediaElement,
  stalledStatus: IStallingSituation | null,
  isDirectFile: boolean,
  previousState: IPlayerState,
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

    if (stalledStatus === "seeking") {
      return PLAYER_STATES.SEEKING;
    }
    if (stalledStatus === "freezing") {
      return PLAYER_STATES.FREEZING;
    }

    if (previousState === PLAYER_STATES.LOADED && !canPreloadBeforePlay(isDirectFile)) {
      /**
       * On devices that do not support preloading, a data buffer cannot be constructed.
       * Normally, this situation would trigger the BUFFERING state. However, since these devices
       * are unable to buffer data, having low or no data is expected while waiting for a play() call.
       * Therefore, in this case, we remain in the LOADED state instead of transitioning to BUFFERING.
       */
      return PLAYER_STATES.LOADED;
    }
    return PLAYER_STATES.BUFFERING;
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
