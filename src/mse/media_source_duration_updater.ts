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

import {
  onSourceOpen,
  onSourceEnded,
  onSourceClose,
} from "../compat/event_listeners";
/* eslint-disable-next-line max-len */
import hasIssuesWithHighMediaSourceDuration from "../compat/has_issues_with_high_media_source_duration";
import log from "../log";
import SharedReference, {
  IReadOnlySharedReference,
} from "../utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../utils/task_canceller";

/** Number of seconds in a regular year. */
const YEAR_IN_SECONDS = 365 * 24 * 3600;

/**
 * Keep the MediaSource's `duration` attribute up-to-date with the duration of
 * the content played on it.
 * @class MediaSourceDurationUpdater
 */
export default class MediaSourceDurationUpdater {
  /**
   * `MediaSource` on which we're going to update the `duration` attribute.
   */
  private _mediaSource : MediaSource;

  /**
   * Abort the current duration-setting logic.
   * `null` if no such logic is pending.
   */
  private _currentMediaSourceDurationUpdateCanceller : TaskCanceller | null;

  /**
   * Create a new `MediaSourceDurationUpdater`,
   * @param {MediaSource} mediaSource - The MediaSource on which the content is
   * played.
   */
  constructor(mediaSource : MediaSource) {
    this._mediaSource = mediaSource;
    this._currentMediaSourceDurationUpdateCanceller = null;
  }

  /**
   * Indicate to the `MediaSourceDurationUpdater` the currently known duration
   * of the content.
   *
   * The `MediaSourceDurationUpdater` will then use that value to determine
   * which `duration` attribute should be set on the `MediaSource` associated
   *
   * @param {number} newDuration
   * @param {boolean} isRealEndKnown - If set to `false`, the current content is
   * a dynamic content (it might evolve in the future) and the `newDuration`
   * communicated might be greater still. In effect the
   * `MediaSourceDurationUpdater` will actually set a much higher value to the
   * `MediaSource`'s duration to prevent being annoyed by the HTML-related
   * side-effects of having a too low duration (such as the impossibility to
   * seek over that value).
   */
  public updateDuration(
    newDuration : number,
    isRealEndKnown : boolean
  ) : void {
    if (this._currentMediaSourceDurationUpdateCanceller !== null) {
      this._currentMediaSourceDurationUpdateCanceller.cancel();
    }
    this._currentMediaSourceDurationUpdateCanceller = new TaskCanceller();

    const mediaSource = this._mediaSource;
    const currentSignal = this._currentMediaSourceDurationUpdateCanceller.signal;
    const isMediaSourceOpened = createMediaSourceOpenReference(mediaSource,
                                                               currentSignal);

    /** TaskCanceller triggered each time the MediaSource switches to and from "open". */
    let msOpenStatusCanceller = new TaskCanceller();
    msOpenStatusCanceller.linkToSignal(currentSignal);
    isMediaSourceOpened.onUpdate(onMediaSourceOpenedStatusChanged,
                                 { emitCurrentValue: true,
                                   clearSignal: currentSignal });

    function onMediaSourceOpenedStatusChanged() {
      msOpenStatusCanceller.cancel();
      if (!isMediaSourceOpened.getValue()) {
        return;
      }
      msOpenStatusCanceller = new TaskCanceller();
      msOpenStatusCanceller.linkToSignal(currentSignal);
      const areSourceBuffersUpdating = createSourceBuffersUpdatingReference(
        mediaSource.sourceBuffers,
        msOpenStatusCanceller.signal
      );
      /** TaskCanceller triggered each time SourceBuffers' updating status changes */
      let sourceBuffersUpdatingCanceller = new TaskCanceller();
      sourceBuffersUpdatingCanceller.linkToSignal(msOpenStatusCanceller.signal);

      return areSourceBuffersUpdating.onUpdate((areUpdating) => {
        sourceBuffersUpdatingCanceller.cancel();
        sourceBuffersUpdatingCanceller = new TaskCanceller();
        sourceBuffersUpdatingCanceller.linkToSignal(msOpenStatusCanceller.signal);
        if (areUpdating) {
          return;
        }

        recursivelyForceDurationUpdate(mediaSource,
                                       newDuration,
                                       isRealEndKnown,
                                       sourceBuffersUpdatingCanceller.signal);
      }, { clearSignal: msOpenStatusCanceller.signal, emitCurrentValue: true });
    }
  }

  /**
   * Abort the last duration-setting operation and free its resources.
   */
  public stopUpdating() {
    if (this._currentMediaSourceDurationUpdateCanceller !== null) {
      this._currentMediaSourceDurationUpdateCanceller.cancel();
      this._currentMediaSourceDurationUpdateCanceller = null;
    }
  }
}

/**
 * Checks that duration can be updated on the MediaSource, and then
 * sets it.
 *
 * Returns either:
 *   - the new duration it has been updated to if it has
 *   - `null` if it hasn'nt been updated
 *
 * @param {MediaSource} mediaSource
 * @param {number} duration
 * @param {boolean} isRealEndKnown
 * @returns {string}
 */
function setMediaSourceDuration(
  mediaSource: MediaSource,
  duration : number,
  isRealEndKnown : boolean
) : MediaSourceDurationUpdateStatus {
  let newDuration = duration;

  if (!isRealEndKnown) {
    newDuration = hasIssuesWithHighMediaSourceDuration() ?
      Infinity :
      getMaximumLiveSeekablePosition(duration);
  }

  let maxBufferedEnd : number = 0;
  for  (let i = 0; i < mediaSource.sourceBuffers.length; i++) {
    const sourceBuffer = mediaSource.sourceBuffers[i];
    const sbBufferedLen = sourceBuffer.buffered.length;
    if (sbBufferedLen > 0) {
      maxBufferedEnd = Math.max(sourceBuffer.buffered.end(sbBufferedLen - 1));
    }
  }

  if (newDuration === mediaSource.duration) {
    return MediaSourceDurationUpdateStatus.Success;
  } else if (maxBufferedEnd > newDuration) {
    // We already buffered further than the duration we want to set.
    // Keep the duration that was set at that time as a security.
    if (maxBufferedEnd < mediaSource.duration) {
      try {
        log.info("Init: Updating duration to what is currently buffered", maxBufferedEnd);
        mediaSource.duration = maxBufferedEnd;
      } catch (err) {
        log.warn("Duration Updater: Can't update duration on the MediaSource.",
                 err instanceof Error ? err : "");
        return MediaSourceDurationUpdateStatus.Failed;
      }
    }
    return MediaSourceDurationUpdateStatus.Partial;
  } else {
    const oldDuration = mediaSource.duration;
    try {
      log.info("Init: Updating duration", newDuration);
      mediaSource.duration = newDuration;
      if (mediaSource.readyState === "open" && !isFinite(newDuration)) {
        const maxSeekable = getMaximumLiveSeekablePosition(duration);
        log.info("Init: calling `mediaSource.setLiveSeekableRange`", maxSeekable);
        mediaSource.setLiveSeekableRange(0, maxSeekable);
      }
    } catch (err) {
      log.warn("Duration Updater: Can't update duration on the MediaSource.",
               err instanceof Error ? err : "");
      return MediaSourceDurationUpdateStatus.Failed;
    }
    const deltaToExpected = Math.abs(mediaSource.duration - newDuration);
    if (deltaToExpected >= 0.1) {
      const deltaToBefore = Math.abs(mediaSource.duration - oldDuration);
      return deltaToExpected < deltaToBefore ? MediaSourceDurationUpdateStatus.Partial :
                                               MediaSourceDurationUpdateStatus.Failed;
    }
    return MediaSourceDurationUpdateStatus.Success;
  }
}

/**
 * String describing the result of the process of updating a MediaSource's
 * duration.
 */
const enum MediaSourceDurationUpdateStatus {
  /** The MediaSource's duration has been updated to the asked duration. */
  Success = "success",
  /**
   * The MediaSource's duration has been updated and is now closer to the asked
   * duration but is not yet the actually asked duration.
   */
  Partial = "partial",
  /**
   * The MediaSource's duration could not have been updated due to an issue or
   * has been updated but to a value actually further from the asked duration
   * from what it was before.
   */
  Failed = "failed",
}

/**
 * Returns a `SharedReference` wrapping a boolean that tells if all the
 * SourceBuffers ended all pending updates.
 * @param {SourceBufferList} sourceBuffers
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function createSourceBuffersUpdatingReference(
  sourceBuffers : SourceBufferList,
  cancelSignal : CancellationSignal
) : IReadOnlySharedReference<boolean> {
  if (sourceBuffers.length === 0) {
    const notOpenedRef = new SharedReference(false);
    notOpenedRef.finish();
    return notOpenedRef;
  }

  const areUpdatingRef = new SharedReference(false, cancelSignal);
  reCheck();

  for (let i = 0; i < sourceBuffers.length; i++) {
    const sourceBuffer = sourceBuffers[i];
    sourceBuffer.addEventListener("updatestart", reCheck);
    sourceBuffer.addEventListener("update", reCheck);
    cancelSignal.register(() => {
      sourceBuffer.removeEventListener("updatestart", reCheck);
      sourceBuffer.removeEventListener("update", reCheck);
    });
  }

  return areUpdatingRef;

  function reCheck() {
    for (let i = 0; i < sourceBuffers.length; i++) {
      const sourceBuffer = sourceBuffers[i];
      if (sourceBuffer.updating) {
        areUpdatingRef.setValueIfChanged(true);
        return;
      }
    }
    areUpdatingRef.setValueIfChanged(false);
  }
}

/**
 * Returns a `SharedReference` wrapping a boolean that tells if the media
 * source is opened or not.
 * @param {MediaSource} mediaSource
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function createMediaSourceOpenReference(
  mediaSource : MediaSource,
  cancelSignal : CancellationSignal
): IReadOnlySharedReference<boolean> {
  const isMediaSourceOpen = new SharedReference(mediaSource.readyState === "open",
                                                cancelSignal);
  onSourceOpen(mediaSource, () => {
    log.debug("Init: Reacting to MediaSource open in duration updater");
    isMediaSourceOpen.setValueIfChanged(true);
  }, cancelSignal);
  onSourceEnded(mediaSource, () => {
    log.debug("Init: Reacting to MediaSource ended in duration updater");
    isMediaSourceOpen.setValueIfChanged(false);
  }, cancelSignal);
  onSourceClose(mediaSource, () => {
    log.debug("Init: Reacting to MediaSource close in duration updater");
    isMediaSourceOpen.setValueIfChanged(false);
  }, cancelSignal);
  return isMediaSourceOpen;
}

/**
 * Immediately tries to set the MediaSource's duration to the most appropriate
 * one.
 *
 * If it fails, wait 2 seconds and retries.
 *
 * @param {MediaSource} mediaSource
 * @param {number} duration
 * @param {boolean} isRealEndKnown
 * @param {Object} cancelSignal
 */
function recursivelyForceDurationUpdate(
  mediaSource : MediaSource,
  duration : number,
  isRealEndKnown : boolean,
  cancelSignal : CancellationSignal
) : void {
  const res = setMediaSourceDuration(mediaSource, duration, isRealEndKnown);
  if (res === MediaSourceDurationUpdateStatus.Success) {
    return ;
  }
  const timeoutId = setTimeout(() => {
    unregisterClear();
    recursivelyForceDurationUpdate(mediaSource, duration, isRealEndKnown, cancelSignal);
  }, 2000);
  const unregisterClear = cancelSignal.register(() => {
    clearTimeout(timeoutId);
  });
}

function getMaximumLiveSeekablePosition(contentLastPosition : number) : number {
  // Some targets poorly support setting a very high number for seekable
  // ranges.
  // Yet, in contents whose end is not yet known (e.g. live contents), we
  // would prefer setting a value as high as possible to still be able to
  // seek anywhere we want to (even ahead of the Manifest if we want to).
  // As such, we put it at a safe default value of 2^32 excepted when the
  // maximum position is already relatively close to that value, where we
  // authorize exceptionally going over it.
  return Math.max(Math.pow(2, 32), contentLastPosition + YEAR_IN_SECONDS);
}
