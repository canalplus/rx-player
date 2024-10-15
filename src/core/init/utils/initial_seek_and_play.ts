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
import { isSafariMobile } from "../../../compat/browser_detection";
import isSeekingApproximate from "../../../compat/is_seeking_approximate";
/* eslint-disable-next-line max-len */
import shouldPreventSeekingAt0Initially from "../../../compat/should_prevent_seeking_at_0_initially";
import { MediaError } from "../../../errors";
import log from "../../../log";
import type { IPlayerError } from "../../../public_types";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import SharedReference from "../../../utils/reference";
import type {
  CancellationError,
  CancellationSignal,
} from "../../../utils/task_canceller";
import type { PlaybackObserver } from "../../api";

/** Event emitted when trying to perform the initial `play`. */
export type IInitialPlayEvent =
  /** Autoplay is not enabled, but all required steps to do so are there. */
  | { type: "skipped" }
  /**
   * Tried to play, but autoplay is blocked by the browser.
   * A corresponding warning should have already been sent.
   */
  | { type: "autoplay-blocked" }
  /** Autoplay was done with success. */
  | { type: "autoplay" };

/** Object returned by `initialSeekAndPlay`. */
export interface IInitialSeekAndPlayObject {
  /** Emit the result of the auto-play operation, once performed. */
  autoPlayResult: Promise<IInitialPlayEvent>;

  /**
   * Shared reference whose value becomes `true` once the initial seek has
   * been considered / has been done by `performInitialSeekAndPlay`.
   */
  initialSeekPerformed: IReadOnlySharedReference<boolean>;

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
 * @param {boolean} isDirectfile
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function performInitialSeekAndPlay(
  mediaElement: HTMLMediaElement,
  playbackObserver: PlaybackObserver,
  startTime: number | (() => number | undefined),
  mustAutoPlay: boolean,
  onWarning: (err: IPlayerError) => void,
  isDirectfile: boolean,
  cancelSignal: CancellationSignal,
): IInitialSeekAndPlayObject {
  let resolveAutoPlay: (x: IInitialPlayEvent) => void;
  let rejectAutoPlay: (x: unknown) => void;
  const autoPlayResult = new Promise<IInitialPlayEvent>((res, rej) => {
    resolveAutoPlay = res;
    rejectAutoPlay = rej;
  });

  const initialSeekPerformed = new SharedReference(false, cancelSignal);
  const initialPlayPerformed = new SharedReference(false, cancelSignal);

  mediaElement.addEventListener("loadedmetadata", onLoadedMetadata);

  const deregisterCancellation = cancelSignal.register((err: CancellationError) => {
    mediaElement.removeEventListener("loadedmetadata", onLoadedMetadata);
    rejectAutoPlay(err);
  });

  if (mediaElement.readyState >= READY_STATES.HAVE_METADATA) {
    onLoadedMetadata();
  }

  return { autoPlayResult, initialPlayPerformed, initialSeekPerformed };

  function onLoadedMetadata() {
    mediaElement.removeEventListener("loadedmetadata", onLoadedMetadata);

    /** `true` if we asked the `PlaybackObserver` to perform an initial seek. */
    let hasAskedForInitialSeek = false;

    const performInitialSeek = (initialSeekTime: number) => {
      log.info("Init: Set initial time", initialSeekTime);
      playbackObserver.setCurrentTime(initialSeekTime);
      hasAskedForInitialSeek = true;
      initialSeekPerformed.setValue(true);
      initialSeekPerformed.finish();
    };

    // `startTime` defined as a function might depend on metadata to make its
    // choice, such as the content duration, minimum and/or maximum position.
    //
    // The RxPlayer might already know those through the Manifest file for
    // non-Directfile contents, yet only through the `HTMLMediaElement` once a
    // a sufficient `readyState` has been reached for directfile contents.
    // So let's divide the two possibilities here.
    const initialTime = typeof startTime === "function" ? startTime() : startTime;
    if (
      initialTime === undefined &&
      isDirectfile &&
      mediaElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      /**
       * The starting position may not be known yet.
       * Postpone the seek to a moment where the starting position should be known,
       * assumely it's when readyState is greater or equal to HAVE_CURRENT_DATA (2).
       * If the initiallySeekedTime is still `undefined` when the readyState is >= 2,
       * let assume that the initiallySeekedTime will never be known and continue
       * the logic without seeking.
       */
      playbackObserver.listen((obs, stopListening) => {
        if (obs.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const observationInitialTime =
            typeof startTime === "function" ? startTime() : startTime;
          if (observationInitialTime === undefined) {
            initialSeekPerformed.setValue(true);
            initialSeekPerformed.finish();
          } else if (isDirectfile && isSafariMobile) {
            // On safari mobile (version 17.1.2) seeking too early cause the video
            // to never buffer media data. Using setTimeout 0 defers the seek
            // to a moment at which safari should be more able to handle a seek.
            setTimeout(() => {
              performInitialSeek(observationInitialTime);
            }, 0);
          } else {
            performInitialSeek(observationInitialTime);
          }
          stopListening();
        }
      });
    } else if (initialTime === undefined) {
      initialSeekPerformed.setValue(true);
      initialSeekPerformed.finish();
    } else if (shouldPreventSeekingAt0Initially() && initialTime === 0) {
      initialSeekPerformed.setValue(true);
      initialSeekPerformed.finish();
    } else if (isDirectfile && isSafariMobile) {
      // On safari mobile (version 17.1.2) seeking too early cause the video
      // to never buffer media data. Using setTimeout 0 defers the seek
      // to a moment at which safari should be more able to handle a seek.
      setTimeout(() => {
        performInitialSeek(initialTime);
      }, 0);
    } else {
      performInitialSeek(initialTime);
    }

    if (shouldValidateMetadata() && mediaElement.duration === 0) {
      const error = new MediaError(
        "MEDIA_ERR_NOT_LOADED_METADATA",
        "Cannot load automatically: your browser " +
          "falsely announced having loaded the content.",
      );
      onWarning(error);
    }
    if (cancelSignal.isCancelled()) {
      return;
    }

    /**
     * We only want to continue to `play` when a `seek` has actually been
     * performed (if it has been asked). This boolean keep track of if the
     * seek arised.
     */
    let isAwaitingSeek = hasAskedForInitialSeek;
    playbackObserver.listen(
      (observation, stopListening) => {
        if (
          hasAskedForInitialSeek &&
          (observation.seeking ||
            observation.event === "seeking" ||
            observation.event === "internal-seeking")
        ) {
          isAwaitingSeek = false;
          return;
        }
        if (
          !isAwaitingSeek &&
          !observation.seeking &&
          ((isSeekingApproximate && observation.readyState >= 3) ||
            observation.rebuffering === null) &&
          observation.readyState >= 1
        ) {
          stopListening();
          onPlayable();
        }
      },
      { includeLastObservation: true, clearSignal: cancelSignal },
    );
  }

  function onPlayable() {
    log.info("Init: Can begin to play content");
    if (!mustAutoPlay) {
      if (mediaElement.autoplay) {
        log.warn(
          "Init: autoplay is enabled on HTML media element. " +
            "Media will play as soon as possible.",
        );
      }
      initialPlayPerformed.setValue(true);
      initialPlayPerformed.finish();
      deregisterCancellation();
      return resolveAutoPlay({ type: "skipped" as const });
    } else if (mediaElement.ended) {
      // the video has ended state to true, executing VideoElement.play() will
      // restart the video from the start, which is not wanted in most cases.
      // returning "skipped" prevents the call to play() and fix the issue
      log.warn(
        "Init: autoplay is enabled but the video is ended. " +
          "Skipping autoplay to prevent video to start again",
      );
      initialPlayPerformed.setValue(true);
      initialPlayPerformed.finish();
      deregisterCancellation();
      return resolveAutoPlay({ type: "skipped" as const });
    }

    let playResult: Promise<unknown>;
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
      .catch((playError: unknown) => {
        deregisterCancellation();
        if (cancelSignal.isCancelled()) {
          return;
        }
        if (playError instanceof Error && playError.name === "NotAllowedError") {
          // auto-play was probably prevented.
          log.warn(
            "Init: Media element can't play." +
              " It may be due to browser auto-play policies.",
          );

          const error = new MediaError(
            "MEDIA_ERR_BLOCKED_AUTOPLAY",
            "Cannot trigger auto-play automatically: " +
              "your browser does not allow it.",
          );
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
