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

import type { IMediaElement } from "../../../compat/browser_compatibility_types.ts";
import shouldPerformInitialSeekToZero from "../../../compat/should_seek_at_zero.ts";
import shouldValidateMetadata from "../../../compat/should_validate_metadata.ts";
import { MediaError } from "../../../errors/index.ts";
import log from "../../../log.ts";
import type { IMediaElementMonitor } from "../../../media_element_monitor/index.ts";
import { SeekingState } from "../../../media_element_monitor/index.ts";
import type { IPlayerError } from "../../../public_types.ts";
import type { IReadOnlySharedReference } from "../../../utils/reference.ts";
import SharedReference from "../../../utils/reference.ts";
import type {
  CancellationError,
  CancellationSignal,
} from "../../../utils/task_canceller.ts";

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
   * Shared reference whose value becomes `true` once the initial play has
   * been considered / has been done by `performInitialSeekAndPlay`.
   */
  initialPlayPerformed: IReadOnlySharedReference<boolean>;
}

/**
 * Seek as soon as possible at the initially wanted position and play if
 * autoPlay is wanted.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function performInitialSeekAndPlay(
  {
    mediaElementMonitor,
    startTime,
    mustAutoPlay,
    isDirectfile,
    onWarning,
  }: {
    mediaElementMonitor: IMediaElementMonitor;
    startTime: number | (() => number | undefined);
    mustAutoPlay: boolean;
    isDirectfile: boolean;
    onWarning: (err: IPlayerError) => void;
  },
  cancelSignal: CancellationSignal,
): IInitialSeekAndPlayObject {
  const initialPlayPerformed = new SharedReference(false, cancelSignal);
  const autoPlayResult = new Promise<IInitialPlayEvent>(
    (resolveAutoPlay, rejectAutoPlay) => {
      const deregisterCancellation = cancelSignal.register((err: CancellationError) => {
        rejectAutoPlay(err);
      });

      if (cancelSignal.isCancelled()) {
        return;
      }

      /** `true` if we asked the `MediaElementMonitor` to perform an initial seek. */
      let hasAskedForInitialSeek = false;

      const performInitialSeek = (initialSeekTime: number) => {
        const pendingSeek = mediaElementMonitor.getPendingSeekInformation();

        /*
         * NOTE: The user might have asked for a seek before the media element
         * was ready, in which case we want the seek to be at the user's wanted
         * position instead.
         * If multiple internal seeks were asked however, we want to keep the
         * last one.
         */
        if (pendingSeek === null || pendingSeek.isInternal) {
          mediaElementMonitor.setCurrentTime(initialSeekTime);
        }
        hasAskedForInitialSeek = true;
        mediaElementMonitor.unblockSeeking();
      };

      // `startTime` defined as a function might depend on metadata to make its
      // choice, such as the content duration, minimum and/or maximum position.
      //
      // The RxPlayer might already know those through the Manifest file for
      // non-Directfile contents, yet only through the `HTMLMediaElement` once a
      // a sufficient `readyState` has been reached for directfile contents.
      // So let's divide the two possibilities here.
      if (!isDirectfile || typeof startTime === "number") {
        const initiallySeekedTime =
          typeof startTime === "number" ? startTime : startTime();
        if (initiallySeekedTime !== 0 && initiallySeekedTime !== undefined) {
          performInitialSeek(initiallySeekedTime);
        } else {
          mediaElementMonitor.unblockSeeking();
        }
        waitForSeekable();
      } else {
        mediaElementMonitor.listen(
          (obs, stopListening) => {
            const initiallySeekedTime =
              typeof startTime === "number" ? startTime : startTime();
            if (
              initiallySeekedTime === undefined &&
              obs.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
            ) {
              /**
               * The starting position may not be known yet.
               * Postpone the seek to a moment where the starting position should be known,
               * assumely it's when readyState is greater or equal to HAVE_CURRENT_DATA (2).
               * If the initiallySeekedTime is still `undefined` when the readyState is >= 2,
               * let assume that the initiallySeekedTime will never be known and continue
               * the logic without seeking.
               */
              return;
            }
            if (obs.readyState >= 1) {
              stopListening();
              if (
                initiallySeekedTime !== undefined &&
                (initiallySeekedTime !== 0 || shouldPerformInitialSeekToZero())
              ) {
                performInitialSeek(initiallySeekedTime);
              } else {
                mediaElementMonitor.unblockSeeking();
              }
              waitForSeekable();
            }
          },
          { includeLastObservation: false, clearSignal: cancelSignal },
        );
      }

      /**
       * Logic that should be run once the initial seek has been asked to the
       * MediaElementMonitor.
       *
       * Actually wait until the seek has been performed, wait for the right moment
       * to perform autoplay, resolve the promise once everything has been done and
       * potentially send warning if a minor issue is detected.
       */
      function waitForSeekable() {
        /**
         * We only want to continue to `play` when a `seek` has actually been
         * performed (if it has been asked). This boolean keep track of if the
         * seek arised.
         */
        let hasStartedSeeking = false;
        mediaElementMonitor.listen(
          (obs, stopListening) => {
            const mediaElement = mediaElementMonitor.getMediaElement();
            if (mediaElement === null) {
              // media element not yet attached
              return;
            }
            if (
              !hasStartedSeeking &&
              (obs.seeking !== SeekingState.None ||
                obs.event === "seeking" ||
                obs.event === "internal-seeking")
            ) {
              hasStartedSeeking = true;
            }
            if ((hasAskedForInitialSeek && !hasStartedSeeking) || obs.readyState === 0) {
              return;
            }
            stopListening();
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
            waitForPlayable(mediaElement);
          },
          { includeLastObservation: false, clearSignal: cancelSignal },
        );
      }

      /**
       * Logic that should be run once the initial seek has been properly performed.
       *
       * Wait for the media being playable before performing the autoplay operation
       * if asked. Potentially send warning if a minor issue has been detected while
       * doing so.
       */
      function waitForPlayable(mediaElement: IMediaElement) {
        mediaElementMonitor.listen(
          (observation, stopListening) => {
            if (
              observation.seeking === SeekingState.None &&
              observation.rebuffering === null &&
              observation.readyState >= 1
            ) {
              stopListening();
              onPlayable(mediaElement);
            }
          },
          { includeLastObservation: true, clearSignal: cancelSignal },
        );
      }

      /**
       * Callback called once the content is considered "playable".
       *
       * Perform the autoplay if needed, handling potential issues and resolve the
       * Promise when done.
       * Might also send warnings if minor issues arise.
       */
      function onPlayable(mediaElement: IMediaElement) {
        log.info("Init", "Can begin to play content");
        if (!mustAutoPlay) {
          if (mediaElement.autoplay) {
            log.warn(
              "Init",
              "autoplay is enabled on HTML media element. " +
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
            "Init",
            "autoplay is enabled but the video is ended. " +
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
                "Init",
                "Media element can't play." +
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
    },
  );

  return { autoPlayResult, initialPlayPerformed };
}
