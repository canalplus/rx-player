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
  defer as observableDefer,
  Observable,
  of as observableOf,
} from "rxjs";
import { mergeMap } from "rxjs/operators";
import { setMediaKeys } from "../../compat";
import log from "../../log";
import MediaKeysInfosStore from "./media_keys_infos_store";
import { IMediaKeysInfos } from "./types";

/**
 * Close sessions on loaded sessions store if it has changed.
 * Dispose the old media keys if different than new one.
 * @param {Object} mediaKeysInfos
 * @param {Object} mediaElement
 * @returns {Observable}
 */
export function cleanMediaKeys(
  mediaKeysInfos: IMediaKeysInfos,
  mediaElement : HTMLMediaElement
): Observable<unknown> {
  return observableDefer(() => {
    const { loadedSessionsStore } = mediaKeysInfos;
    const previousState = MediaKeysInfosStore.getState(mediaElement);
    const closeAllSessions$ = previousState !== null &&
                              previousState.loadedSessionsStore !== loadedSessionsStore ?
                                previousState.loadedSessionsStore.closeAllSessions() :
                                observableOf(null);

    const shouldDisableOldMediaKeys = mediaElement.mediaKeys !== null &&
                                      mediaElement.mediaKeys !== undefined &&
                                      mediaKeysInfos.mediaKeys !== mediaElement.mediaKeys;

    const disableOldMediaKeys$ = shouldDisableOldMediaKeys ?
      observableDefer(() => {
        MediaKeysInfosStore.setState(mediaElement, null);
        return setMediaKeys(mediaElement, null);
      }) :
      observableOf(null);

    return closeAllSessions$.pipe(mergeMap(() => disableOldMediaKeys$));
  });
}

/**
 * Set the MediaKeys object on the HTMLMediaElement if it is not already on the
 * element.
 *
 * /!\ Mutates heavily MediaKeysInfosStore
 * @param {Object} mediaKeysInfos
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function attachMediaKeys(
  mediaKeysInfos: IMediaKeysInfos,
  mediaElement : HTMLMediaElement
) : Observable<unknown> {
  return observableDefer(() => {
    const { keySystemOptions,
            mediaKeySystemAccess,
            mediaKeys,
            loadedSessionsStore } = mediaKeysInfos;

    MediaKeysInfosStore.setState(mediaElement,
                                 { keySystemOptions,
                                   mediaKeySystemAccess,
                                   mediaKeys,
                                   loadedSessionsStore });
    if (mediaElement.mediaKeys === mediaKeys) {
      return observableOf(null);
    }
    log.debug("EME: Setting MediaKeys");
    return setMediaKeys(mediaElement, mediaKeys);
  });
}
