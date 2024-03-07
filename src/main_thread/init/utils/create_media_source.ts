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
import clearElementSrc from "../../../compat/clear_element_src";
import log from "../../../log";
import MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import createCancellablePromise from "../../../utils/create_cancellable_promise";
import idGenerator from "../../../utils/id_generator";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import type { CancellationSignal } from "../../../utils/task_canceller";

const generateMediaSourceId = idGenerator();

/**
 * Dispose of ressources taken by the MediaSource:
 *   - Clear the MediaSource' SourceBuffers
 *   - Clear the mediaElement's src (stop the mediaElement)
 *   - Revoke MediaSource' URL
 * @param {HTMLMediaElement} mediaElement
 * @param {string|null} mediaSourceURL
 */
export function resetMediaElement(
  mediaElement: IMediaElement,
  mediaSourceURL: string | null,
): void {
  if (mediaSourceURL !== null && mediaElement.src === mediaSourceURL) {
    log.info("Init: Clearing HTMLMediaElement's src");
    clearElementSrc(mediaElement);
  }

  if (mediaSourceURL !== null) {
    try {
      log.debug("Init: Revoking previous URL");
      URL.revokeObjectURL(mediaSourceURL);
    } catch (e) {
      log.warn(
        "Init: Error while revoking the media source URL",
        e instanceof Error ? e : "",
      );
    }
  }

  if (mediaElement.srcObject !== null) {
    mediaElement.srcObject = null;
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
  mediaElement: IMediaElement,
  unlinkSignal: CancellationSignal,
): MainMediaSourceInterface {
  // make sure the media has been correctly reset
  const oldSrc = isNonEmptyString(mediaElement.src) ? mediaElement.src : null;
  resetMediaElement(mediaElement, oldSrc);
  const mediaSource = new MainMediaSourceInterface(generateMediaSourceId());
  unlinkSignal.register(() => {
    mediaSource.dispose();
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
  mediaElement: IMediaElement,
  unlinkSignal: CancellationSignal,
): Promise<MainMediaSourceInterface> {
  return createCancellablePromise(unlinkSignal, (resolve) => {
    const mediaSource = createMediaSource(mediaElement, unlinkSignal);
    mediaSource.addEventListener(
      "mediaSourceOpen",
      () => {
        log.info("Init: MediaSource opened");
        resolve(mediaSource);
      },
      unlinkSignal,
    );

    log.info("MTCI: Attaching MediaSource URL to the media element");
    if (mediaSource.handle.type === "handle") {
      mediaElement.srcObject = mediaSource.handle.value;
      unlinkSignal.register(() => {
        resetMediaElement(mediaElement, null);
      });
    } else {
      const url = URL.createObjectURL(mediaSource.handle.value);
      mediaElement.src = url;
      unlinkSignal.register(() => {
        resetMediaElement(mediaElement, url);
      });
    }
  });
}
