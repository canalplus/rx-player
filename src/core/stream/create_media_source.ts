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
  Observable,
  Observer,
} from "rxjs";
import {
  mapTo,
  mergeMap,
  take,
} from "rxjs/operators";
import {
  clearElementSrc,
  MediaSource_,
} from "../../compat";
import { onSourceOpen$ } from "../../compat/events";
import { MediaError } from "../../errors";
import log from "../../log";

/**
 * Side effect that set the media duration in the mediaSource.
 *
 * @param {MediaSource} mediaSource
 * @param {number} duration
 */
export function setDurationToMediaSource(
  mediaSource : MediaSource,
  duration : number
) : void {
  const newDuration : number = duration === Infinity ?
    Number.MAX_VALUE : duration;

  if (mediaSource.duration !== newDuration) {
    log.info("set duration", mediaSource.duration);
    mediaSource.duration = newDuration;
  }
}

/**
 * Dispose of ressources taken by the MediaSource:
 *   - Clear the MediaSource' SourceBuffers
 *   - Clear the mediaElement's src (stop the mediaElement)
 *   - Revoke MediaSource' URL
 * @param {HTMLMediaElement} mediaElement
 * @param {MediaSource|null} mediaSource
 * @param {string|null} mediaSourceURL
 */
function resetMediaSource(
  mediaElement : HTMLMediaElement,
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

  clearElementSrc(mediaElement);

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
 * mediaElement element's src attribute.
 *
 * Returns an Observable which emits the MediaSource when created and attached
 * to the mediaElement element.
 * This Observable never completes. It can throw if MediaSource is not
 * available in the current environment.
 *
 * On unsubscription, the mediaElement.src is cleaned, MediaSource sourceBuffers
 * and customBuffers are aborted and some minor cleaning is done.
 *
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function createMediaSource(
  mediaElement : HTMLMediaElement
) : Observable<MediaSource> {
  return Observable.create((observer : Observer<MediaSource>) => {
    if (!MediaSource_) {
      throw new MediaError("MEDIA_SOURCE_NOT_SUPPORTED", null, true);
    }

    // make sure the media has been correctly reset
    resetMediaSource(mediaElement, null, mediaElement.src || null);

    log.info("creating MediaSource");
    const mediaSource = new MediaSource_();
    const objectURL = URL.createObjectURL(mediaSource);

    log.info("attaching MediaSource URL to the media element", objectURL);
    mediaElement.src = objectURL;

    observer.next(mediaSource);
    return () => {
      resetMediaSource(mediaElement, mediaSource, objectURL);
    };
  });
}

/**
 * Create and open a new MediaSource object on the given media element.
 * Emit the MediaSource when done.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function openMediaSource(
  mediaElement : HTMLMediaElement
) : Observable<MediaSource> {
  return createMediaSource(mediaElement).pipe(
    mergeMap(mediaSource => {
      return onSourceOpen$(mediaSource).pipe(
        take(1),
        mapTo(mediaSource)
      );
    })
  );
}
