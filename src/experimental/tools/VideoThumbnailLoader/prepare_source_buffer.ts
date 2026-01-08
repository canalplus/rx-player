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
import BROWSER_GLOBALS from "../../../compat/browser_compatibility_types.ts";
import disableRemotePlaybackOnManagedMediaSource from "../../../compat/disable_remote_playback_on_managed_media_source.ts";
import resetMediaElement from "../../../compat/reset_media_element.ts";
import log from "../../../log.ts";
import { SourceBufferType } from "../../../mse/index.ts";
import type { MainSourceBufferInterface } from "../../../mse/main_media_source_interface.ts";
import MainMediaSourceInterface from "../../../mse/main_media_source_interface.ts";
import createCancellablePromise from "../../../utils/create_cancellable_promise.ts";
import idGenerator from "../../../utils/id_generator.ts";
import isNonEmptyString from "../../../utils/is_non_empty_string.ts";
import isNullOrUndefined from "../../../utils/is_null_or_undefined.ts";
import type { CancellationSignal } from "../../../utils/task_canceller.ts";

const generateMediaSourceId = idGenerator();

/**
 * Open the media source and create the `MainMediaSourceInterface`.
 * @param {HTMLVideoElement} videoElement
 * @param {string} codec
 * @param {Object} cleanUpSignal
 * @returns {Promise.<Object>}
 */
export default function prepareSourceBuffer(
  videoElement: IMediaElement,
  codec: string,
  cleanUpSignal: CancellationSignal,
): Promise<MainSourceBufferInterface> {
  return createCancellablePromise(cleanUpSignal, (resolve, reject) => {
    const { MediaSource_ } = BROWSER_GLOBALS;
    if (isNullOrUndefined(MediaSource_)) {
      throw new Error("No MediaSource Object was found in the current browser.");
    }

    // make sure the media has been correctly reset
    const oldSrc = isNonEmptyString(videoElement.src) ? videoElement.src : null;
    resetMediaElement(videoElement, oldSrc);

    log.info("VideoThumbnailLoader", "Creating MediaSource");
    const mediaSource = new MainMediaSourceInterface(
      generateMediaSourceId(),
      MediaSource_,
    );
    if (mediaSource.handle.type === "handle") {
      videoElement.srcObject = mediaSource.handle.value;
      cleanUpSignal.register(() => {
        resetMediaElement(videoElement, null);
      });
    } else {
      const objectURL = URL.createObjectURL(mediaSource.handle.value);

      log.info(
        "VideoThumbnailLoader",
        "Attaching MediaSource URL to the media element",
        objectURL,
      );
      videoElement.src = objectURL;
      cleanUpSignal.register(() => {
        resetMediaElement(videoElement, objectURL);
      });
    }
    disableRemotePlaybackOnManagedMediaSource(videoElement, cleanUpSignal);

    mediaSource.addEventListener("mediaSourceOpen", onSourceOpen);
    return () => {
      mediaSource.removeEventListener("mediaSourceOpen", onSourceOpen);
    };

    function onSourceOpen() {
      try {
        mediaSource.removeEventListener("mediaSourceOpen", onSourceOpen);
        resolve(mediaSource.addSourceBuffer(SourceBufferType.Video, codec));
      } catch (err) {
        reject(err);
      }
    }
  });
}
