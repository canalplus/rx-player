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

import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import {
  clearVideoSrc,
  MediaSource_,
} from "../../compat";
import MediaError from "../../errors/MediaError";
import log from "../../utils/log";

/**
 * Side effect that set the media duration in the mediaSource. This side
 * effect occurs when we receive the "sourceopen" from the
 * mediaSource.
 * @param {MediaSource} mediaSource
 * @param {Object} manifest
 */
export function setDurationToMediaSource(
  mediaSource : MediaSource,
  duration : number
) : void {
  const newDuration : number = duration === Infinity ?
    Number.MAX_VALUE : duration;

  if (mediaSource.duration !== newDuration) {
    mediaSource.duration = newDuration;
    log.info("set duration", mediaSource.duration);
  }
}

/**
 * @param {HTMLMediaElement} video
 * @param {MediaSource|null} mediaSource
 * @param {string|null} mediaSourceURL
 * @param {Object} sourceBufferMemory
 */
export function resetMediaSource(
  video : HTMLMediaElement,
  mediaSource? : MediaSource|null,
  mediaSourceURL? : string|null
) : void {
  if (mediaSource && mediaSource.readyState !== "closed") {
    const { readyState, sourceBuffers } = mediaSource;
    for (let i = sourceBuffers.length - 1; i >= 0; i--) {
      const sourceBuffer = sourceBuffers[i];
      try {
        if (readyState === "open") {
          log.info("removing SourceBuffer from mediaSource", sourceBuffer);
          sourceBuffer.abort();
        }

        mediaSource.removeSourceBuffer(sourceBuffer);
      }
      catch (e) {
        log.warn("error while disposing SourceBuffer", e);
      }
    }
    if (sourceBuffers.length) {
      log.warn("not all SourceBuffers could have been removed.");
    }
  }

  clearVideoSrc(video);

  if (mediaSourceURL) {
    try {
      log.debug("revoking previous URL");
      URL.revokeObjectURL(mediaSourceURL);
    } catch (e) {
      log.warn("error while revoking the media source URL", e);
    }
  }
}

/**
 * Create, on subscription, a MediaSource instance and attach it to the given
 * video element's src attribute.
 *
 * Returns an Observable which emits the MediaSource when created and attached
 * to the video element.
 * This Observable never completes. It can throw if MediaSource is not
 * available in the current environment.
 *
 * On unsubscription, the video.src is cleaned, MediaSource sourceBuffers and
 * customBuffers are aborted and some minor cleaning is done.
 *
 * @param {HTMLMediaElement} video
 * @param {Object} sourceBufferMemory
 * @param {Object} sourceBufferMemory.custom
 * @param {Object} sourceBufferMemory.native
 * @returns {Observable}
 */
export default function createMediaSource(
  video : HTMLMediaElement
) : Observable<MediaSource> {
  return Observable.create((observer : Observer<MediaSource>) => {
    if (!MediaSource_) {
      throw new MediaError("MEDIA_SOURCE_NOT_SUPPORTED", null, true);
    }

    // make sure the media has been correctly reset
    resetMediaSource(video, null, video.src || null);

    log.info("creating MediaSource");
    const mediaSource = new MediaSource_();
    const objectURL = URL.createObjectURL(mediaSource);

    log.info("attaching MediaSource URL to video element", objectURL);
    video.src = objectURL;

    observer.next(mediaSource);
    return () => {
      resetMediaSource(video, mediaSource, objectURL);
    };
  });
}
