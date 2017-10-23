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

import MediaError from "../../errors/MediaError.js";
import log from "../../utils/log";
import {
  MediaSource_,
  clearVideoSrc,
} from "../../compat";

/**
 * Side effect that set the media duration in the mediaSource. This side
 * effect occurs when we receive the "sourceopen" from the
 * mediaSource.
 * @param {MediaSource} mediaSource
 * @param {Object} manifest
 */
const setDurationToMediaSource = (mediaSource, duration) => {
  let newDuration;
  if (duration === Infinity) {
    // TODO(pierre): hack for Chrome 42
    // is it "https://bugs.chromium.org/p/chromium/issues/detail?id=461733"?
    newDuration = Number.MAX_VALUE;
  } else {
    newDuration = duration;
  }

  if (mediaSource.duration !== newDuration) {
    mediaSource.duration = newDuration;
    log.info("set duration", mediaSource.duration);
  }
};

/**
 * Create, on subscription, a MediaSource instance and attach it to the given
 * video element's src attribute.
 *
 * Returns an Observable which emits one time when done an object with the
 * following properties:
 *
 *   - src {string} - the src given
 *
 *   - mediaSource {MediaSource|null} - the MediaSource instance. Can be null
 *     in the case no MediaSource is needed.
 *
 * This Observable never completes. It can throw if MediaSource is needed but
 * is not available in the current environment.
 *
 * On unsubscription, the video.src is cleaned, MediaSource sourcenuffers and
 * customBuffers are aborted and some minor cleaning is done.
 *
 * @param {string} url
 * @param {HTMLMediaElement} video
 * @param {Boolean} withMediaSource
 * @param {Object} customBuffers
 * @param {Object} nativeBuffers
 * @returns {Observable}
 */
const createAndPlugMediaSource = (
  url,
  video,
  withMediaSource,
  customBuffers,
  nativeBuffers
) =>
  Observable.create((observer) => {
    let mediaSource, objectURL;

    function resetMediaElement() {
      if (mediaSource && mediaSource.readyState != "closed") {
        const { readyState, sourceBuffers } = mediaSource;
        for (let i = 0; i < sourceBuffers.length; i++) {
          const sourceBuffer = sourceBuffers[i];
          try {
            if (readyState == "open") {
              sourceBuffer.abort();
            }

            mediaSource.removeSourceBuffer(sourceBuffer);
          }
          catch(e) {
            log.warn("error while disposing souceBuffer", e);
          }
        }
      }

      Object.keys(nativeBuffers).forEach(type => {
        delete nativeBuffers[type];
      });

      Object.keys(customBuffers).forEach((sourceBufferType) => {
        const sourceBuffer = customBuffers[sourceBufferType];
        try {
          sourceBuffer.abort();
        }
        catch(e) {
          log.warn("error while disposing souceBuffer", e);
        }
        delete customBuffers[sourceBufferType];
      });

      clearVideoSrc(video);

      if (objectURL) {
        try {
          URL.revokeObjectURL(objectURL);
        } catch(e) {
          log.warn("error while revoking ObjectURL", e);
        }
      }

      mediaSource = null;
      objectURL = null;
    }

    // make sure the media has been correctly reset
    resetMediaElement();

    if (withMediaSource) {
      if (!MediaSource_) {
        throw new MediaError("MEDIA_SOURCE_NOT_SUPPORTED", null, true);
      }
      mediaSource = new MediaSource_();
      objectURL = URL.createObjectURL(mediaSource);
    } else {
      mediaSource = null;
      objectURL = url;
    }

    video.src = objectURL;

    observer.next({ url, mediaSource });
    log.info("create mediasource object", objectURL);

    return resetMediaElement;
  });

export {
  createAndPlugMediaSource,
  setDurationToMediaSource,
};
