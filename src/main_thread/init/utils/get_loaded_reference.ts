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

import type { IMediaElement } from "../../../compat/browser_compatibility_types";
import shouldValidateMetadata from "../../../compat/should_validate_metadata";
import shouldWaitForDataBeforeLoaded from "../../../compat/should_wait_for_data_before_loaded";
import shouldWaitForHaveEnoughData from "../../../compat/should_wait_for_have_enough_data";
import type {
  IPlaybackObservation,
  IReadOnlyPlaybackObserver,
} from "../../../playback_observer";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import SharedReference from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
import TaskCanceller from "../../../utils/task_canceller";

/**
 * Returns an `IReadOnlySharedReference` that switches to `true` once the
 * content is considered loaded (i.e. once it can begin to be played).
 * @param {Object} playbackObserver
 * @param {HTMLMediaElement} mediaElement
 * @param {boolean} isDirectfile - `true` if this is a directfile content
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function getLoadedReference(
  playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>,
  mediaElement: IMediaElement,
  isDirectfile: boolean,
  cancelSignal: CancellationSignal,
): IReadOnlySharedReference<boolean> {
  const listenCanceller = new TaskCanceller();
  listenCanceller.linkToSignal(cancelSignal);
  const isLoaded = new SharedReference(false, listenCanceller.signal);
  playbackObserver.listen(
    (observation) => {
      if (
        observation.rebuffering !== null ||
        observation.freezing !== null ||
        observation.readyState === 0
      ) {
        return;
      }

      if (
        !shouldWaitForDataBeforeLoaded(
          isDirectfile,
          mediaElement.hasAttribute("playsinline"),
        )
      ) {
        // The duration is NaN if no media data is available,
        // which means media is not loaded yet.
        if (isNaN(mediaElement.duration)) {
          return;
        }
        if (mediaElement.duration > 0) {
          isLoaded.setValue(true);
          listenCanceller.cancel();
          return;
        }
      }

      const minReadyState = shouldWaitForHaveEnoughData() ? 4 : 3;
      if (observation.readyState >= minReadyState) {
        if (observation.currentRange !== null || observation.ended) {
          if (!shouldValidateMetadata() || mediaElement.duration > 0) {
            isLoaded.setValue(true);
            listenCanceller.cancel();
            return;
          }
        }
      }
    },
    { includeLastObservation: true, clearSignal: listenCanceller.signal },
  );

  return isLoaded;
}
