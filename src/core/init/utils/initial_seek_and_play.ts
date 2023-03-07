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

import { shouldValidateMetadata } from "../../../compat";
import { READY_STATES } from "../../../compat/browser_compatibility_types";
import { MediaError } from "../../../errors";
import log from "../../../log";
import { IPlayerError } from "../../../public_types";
import {
  createSharedReference,
  IReadOnlySharedReference,
} from "../../../utils/reference";
import { CancellationError, CancellationSignal } from "../../../utils/task_canceller";
import { PlaybackObserver } from "../../api";

/** Event emitted when trying to perform the initial `play`. */
export type IInitialPlayEvent =
  /** Autoplay is not enabled, but all required steps to do so are there. */
  { type: "skipped" } |
  /**
   * Tried to play, but autoplay is blocked by the browser.
   * A corresponding warning should have already been sent.
   */
  { type: "autoplay-blocked" } |
  /** Autoplay was done with success. */
  { type: "autoplay" };

/** Object returned by `initialSeekAndPlay`. */
export interface IInitialSeekAndPlayObject {
  /** Emit the result of the auto-play operation, once performed. */
  autoPlayResult : Promise<IInitialPlayEvent>;

  /**
   * Shared reference whose value becomes `true` once the initial seek has
   * been considered / has been done by `performInitialSeekAndPlay`.
   */
  initialSeekPerformed : IReadOnlySharedReference<boolean>;

  /**
   * Shared reference whose value becomes `true` once the initial play has
   * been considered / has been done by `performInitialSeekAndPlay`.
   */
  initialPlayPerformed: IReadOnlySharedReference<boolean>;
}

/**
 * Seek as soon as possible at the initially wanted position and play if
 * autoPlay is wanted.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} playbackObserver
 * @param {number|Function} startTime
 * @param {boolean} mustAutoPlay
 * @param {Function} onWarning
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function performInitialSeekAndPlay(
  mediaElement : HTMLMediaElement,
  playbackObserver : PlaybackObserver,
  startTime : number|(() => number),
  mustAutoPlay : boolean,
  onWarning : (err : IPlayerError) => void,
  cancelSignal : CancellationSignal
) : IInitialSeekAndPlayObject {
  let resolveAutoPlay : (x : IInitialPlayEvent) => void;
  let rejectAutoPlay : (x : unknown) => void;
  const autoPlayResult = new Promise<IInitialPlayEvent>((res, rej) => {
    resolveAutoPlay = res;
    rejectAutoPlay = rej;
  });

  const initialSeekPerformed = createSharedReference(false, cancelSignal);
  const initialPlayPerformed = createSharedReference(false, cancelSignal);

  mediaElement.addEventListener("loadedmetadata", onLoadedMetadata);
  if (mediaElement.readyState >= READY_STATES.HAVE_METADATA) {
    onLoadedMetadata();
  }

  const deregisterCancellation = cancelSignal.register((err : CancellationError) => {
    mediaElement.removeEventListener("loadedmetadata", onLoadedMetadata);
    rejectAutoPlay(err);
  });

  return { autoPlayResult, initialPlayPerformed, initialSeekPerformed };

  function onLoadedMetadata() {
    mediaElement.removeEventListener("loadedmetadata", onLoadedMetadata);
    const initialTime = typeof startTime === "function" ? startTime() :
                                                          startTime;
    log.info("Init: Set initial time", initialTime);
    playbackObserver.setCurrentTime(initialTime);
    initialSeekPerformed.setValue(true);
    initialSeekPerformed.finish();

    if (shouldValidateMetadata() && mediaElement.duration === 0) {
      const error = new MediaError("MEDIA_ERR_NOT_LOADED_METADATA",
                                   "Cannot load automatically: your browser " +
                                   "falsely announced having loaded the content.");
      onWarning(error);
    }
    if (cancelSignal.isCancelled()) {
      return ;
    }

    playbackObserver.listen((observation, stopListening) => {
      if (!observation.seeking &&
          observation.rebuffering === null &&
          observation.readyState >= 1)
      {
        stopListening();
        onPlayable();
      }
    }, { includeLastObservation: true, clearSignal: cancelSignal });
  }

  function onPlayable() {
    log.info("Init: Can begin to play content");
    if (!mustAutoPlay) {
      if (mediaElement.autoplay) {
        log.warn("Init: autoplay is enabled on HTML media element. " +
                 "Media will play as soon as possible.");
      }
      initialPlayPerformed.setValue(true);
      initialPlayPerformed.finish();
      deregisterCancellation();
      return resolveAutoPlay({ type: "skipped" as const });
    }

    let playResult : Promise<unknown>;
    try {
      playResult = mediaElement.play() ?? Promise.resolve();
    } catch (playError) {
      deregisterCancellation();
      return rejectAutoPlay(playError);
    }
    playResult
      .then(() => {
        if (cancelSignal.isCancelled()) {
          return;
        }
        initialPlayPerformed.setValue(true);
        initialPlayPerformed.finish();
        deregisterCancellation();
        return resolveAutoPlay({ type: "autoplay" as const });
      })
      .catch((playError : unknown) => {
        deregisterCancellation();
        if (cancelSignal.isCancelled()) {
          return;
        }
        if (playError instanceof Error && playError.name === "NotAllowedError") {
          // auto-play was probably prevented.
          log.warn("Init: Media element can't play." +
                   " It may be due to browser auto-play policies.");

          const error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY",
                                       "Cannot trigger auto-play automatically: " +
                                       "your browser does not allow it.");
          onWarning(error);
          if (cancelSignal.isCancelled()) {
            return;
          }
          return resolveAutoPlay({ type: "autoplay-blocked" as const });
        } else {
          rejectAutoPlay(playError);
        }
      });
  }
}
