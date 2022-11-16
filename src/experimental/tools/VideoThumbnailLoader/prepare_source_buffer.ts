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

import { MediaSource_ } from "../../../compat";
import { resetMediaSource } from "../../../core/init/create_media_source";
import { AudioVideoSegmentBuffer } from "../../../core/segment_buffers/implementations";
import log from "../../../log";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import { CancellationSignal } from "../../../utils/task_canceller";

/**
 * Open the media source and create the `AudioVideoSegmentBuffer`.
 * @param {HTMLVideoElement} videoElement
 * @param {string} codec
 * @param {Object} cleanUpSignal
 * @returns {Promise.<Object>}
 */
export default function prepareSourceBuffer(
  videoElement: HTMLVideoElement,
  codec: string,
  cleanUpSignal: CancellationSignal
): Promise<AudioVideoSegmentBuffer> {
  return new Promise((resolve, reject) => {
    if (MediaSource_ == null) {
      throw new Error("No MediaSource Object was found in the current browser.");
    }

    // make sure the media has been correctly reset
    const oldSrc = isNonEmptyString(videoElement.src) ? videoElement.src :
                                                        null;
    resetMediaSource(videoElement, null, oldSrc);

    log.info("Init: Creating MediaSource");
    const mediaSource = new MediaSource_();
    const objectURL = URL.createObjectURL(mediaSource);

    log.info("Init: Attaching MediaSource URL to the media element", objectURL);
    videoElement.src = objectURL;

    mediaSource.addEventListener("sourceopen", onSourceOpen);
    mediaSource.addEventListener("webkitsourceopen", onSourceOpen);

    cleanUpSignal.register(() => {
      mediaSource.removeEventListener("sourceopen", onSourceOpen);
      mediaSource.removeEventListener("webkitsourceopen", onSourceOpen);
      resetMediaSource(videoElement, mediaSource, objectURL);
    });

    function onSourceOpen() {
      try {
        mediaSource.removeEventListener("sourceopen", onSourceOpen);
        mediaSource.removeEventListener("webkitsourceopen", onSourceOpen);
        resolve(new AudioVideoSegmentBuffer("video", codec, mediaSource));
      } catch (err) {
        reject(err);
      }
    }
  });
}
