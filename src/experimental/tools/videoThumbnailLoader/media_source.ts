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
import { QueuedSourceBuffer } from "../../../core/source_buffers";
import log from "../../../log";
import PPromise from "../../../utils/promise";

function resetMediaSource(
  elt : HTMLMediaElement,
  mediaSource? : MediaSource|null,
  mediaSourceURL? : string|null
) : void {
  if (mediaSource && mediaSource.readyState !== "closed") {
    const { readyState, sourceBuffers } = mediaSource;
    for (let i = sourceBuffers.length - 1; i >= 0; i--) {
      const sourceBuffer = sourceBuffers[i];
      try {
        if (readyState === "open") {
          log.info("ImageLoader: Removing SourceBuffer from mediaSource", sourceBuffer);
          sourceBuffer.abort();
        }

        mediaSource.removeSourceBuffer(sourceBuffer);
      }
      catch (e) {
        log.warn("ImageLoader: Error while disposing SourceBuffer", e);
      }
    }
    if (sourceBuffers.length) {
      log.warn("ImageLoader: Not all SourceBuffers could have been removed.");
    }
  }

  elt.src = "";
  elt.removeAttribute("src");

  if (mediaSourceURL) {
    try {
      log.debug("ImageLoader: Revoking previous URL");
      URL.revokeObjectURL(mediaSourceURL);
    } catch (e) {
      log.warn("ImageLoader: Error while revoking the media source URL", e);
    }
  }
}

function createMediaSource(elt: HTMLVideoElement): MediaSource {
  if (!MediaSource_) {
    throw new Error("");
  }

  // make sure the media has been correctly reset
  resetMediaSource(elt, null, elt.src || null);

  const mediaSource = new MediaSource_();
  const objectURL = URL.createObjectURL(mediaSource);
  elt.src = objectURL;
  return mediaSource;
}

function openMediaSource(elt: HTMLVideoElement): Promise<MediaSource> {
  return new PPromise((resolve, reject) => {
    try {
      const mediaSource = createMediaSource(elt);
      mediaSource.addEventListener("sourceopen", () => {
        resolve(mediaSource);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export default function prepareSourceBuffer(
  elt: HTMLVideoElement, codec: string): Promise<{
  mediaSource: MediaSource;
  videoSourceBuffer: QueuedSourceBuffer<any>;
  disposeMediaSource: () => void;
}> {
  return openMediaSource(elt).then((mediaSource) => {
    const sourceBuffer = mediaSource.addSourceBuffer(codec);
    return {
      mediaSource,
      videoSourceBuffer:
        new QueuedSourceBuffer("video", codec, sourceBuffer),
      disposeMediaSource: () => {
        resetMediaSource(elt, mediaSource, elt.src || null);
      },
    };
  });
}
