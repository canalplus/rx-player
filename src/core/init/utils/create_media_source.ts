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
  clearElementSrc,
  events,
  MediaSource_,
} from "../../../compat";
import { MediaError } from "../../../errors";
import log from "../../../log";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import { CancellationSignal } from "../../../utils/task_canceller";

/**
 * Dispose of ressources taken by the MediaSource:
 *   - Clear the MediaSource' SourceBuffers
 *   - Clear the mediaElement's src (stop the mediaElement)
 *   - Revoke MediaSource' URL
 * @param {HTMLMediaElement} mediaElement
 * @param {MediaSource|null} mediaSource
 * @param {string|null} mediaSourceURL
 */
export function resetMediaSource(
  mediaElement : HTMLMediaElement,
  mediaSource : MediaSource | null,
  mediaSourceURL : string | null
) : void {
  if (mediaSource !== null && mediaSource.readyState !== "closed") {
    const { readyState, sourceBuffers } = mediaSource;
    for (let i = sourceBuffers.length - 1; i >= 0; i--) {
      const sourceBuffer = sourceBuffers[i];
      try {
        if (readyState === "open") {
          log.info("Init: Removing SourceBuffer from mediaSource");
          sourceBuffer.abort();
        }
        mediaSource.removeSourceBuffer(sourceBuffer);
      }
      catch (e) {
        log.warn("Init: Error while disposing SourceBuffer",
                 e instanceof Error ? e : "");
      }
    }
    if (sourceBuffers.length > 0) {
      log.warn("Init: Not all SourceBuffers could have been removed.");
    }
  }

  clearElementSrc(mediaElement);

  if (mediaSourceURL !== null) {
    try {
      log.debug("Init: Revoking previous URL");
      URL.revokeObjectURL(mediaSourceURL);
    } catch (e) {
      log.warn("Init: Error while revoking the media source URL",
               e instanceof Error ? e : "");
    }
  }
}

/**
 * Create a MediaSource instance and attach it to the given mediaElement element's
 * src attribute.
 *
 * Returns a Promise which resolves with the MediaSource when created and attached
 * to the `mediaElement` element.
 *
 * When the given `unlinkSignal` emits, mediaElement.src is cleaned, MediaSource
 * SourceBuffers are aborted and some minor cleaning is done.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} unlinkSignal
 * @returns {MediaSource}
 */
function createMediaSource(
  mediaElement : HTMLMediaElement,
  unlinkSignal : CancellationSignal
) : MediaSource {
  if (MediaSource_ == null) {
    throw new MediaError("MEDIA_SOURCE_NOT_SUPPORTED",
                         "No MediaSource Object was found in the current browser.");
  }

  // make sure the media has been correctly reset
  const oldSrc = isNonEmptyString(mediaElement.src) ? mediaElement.src :
                                                      null;
  resetMediaSource(mediaElement, null, oldSrc);

  log.info("Init: Creating MediaSource");
  const mediaSource = new MediaSource_();
  const objectURL = URL.createObjectURL(mediaSource);

  log.info("Init: Attaching MediaSource URL to the media element", objectURL);
  mediaElement.src = objectURL;

  unlinkSignal.register(() => {
    resetMediaSource(mediaElement, mediaSource, objectURL);
  });
  return mediaSource;
}

/**
 * Create and open a new MediaSource object on the given media element.
 * Resolves with the MediaSource when done.
 *
 * When the given `unlinkSignal` emits, mediaElement.src is cleaned, MediaSource
 * SourceBuffers are aborted and some minor cleaning is done.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} unlinkSignal
 * @returns {Promise}
 */
export default function openMediaSource(
  mediaElement : HTMLMediaElement,
  unlinkSignal : CancellationSignal
) : Promise<MediaSource> {
  return new Promise((resolve, reject) => {
    const mediaSource = createMediaSource(mediaElement, unlinkSignal);
    events.onSourceOpen(mediaSource, () => {
      unlinkSignal.deregister(reject);
      resolve(mediaSource);
    }, unlinkSignal);
    unlinkSignal.register(reject);
  });
}
