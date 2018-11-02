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
 * Set the MediaKeys object on the HTMLMediaElement if it is not already on the
 * element.
 * If a MediaKeys was already set on it, dispose of it before setting the new
 * one.
 *
 * /!\ Mutates heavily currentMediaKeysInfos
 * @param {Object} mediaKeysInfos
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} currentMediaKeysInfos
 * @returns {Observable}
 */
export default function attachMediaKeys(
  mediaKeysInfos: IMediaKeysInfos,
  mediaElement : HTMLMediaElement,
  currentMediaKeysInfos: MediaKeysInfosStore
) : Observable<null> {
  return observableDefer(() => {
    const previousState = currentMediaKeysInfos.getState(mediaElement);
    const {
      keySystemOptions,
      mediaKeySystemAccess,
      mediaKeys,
      sessionsStore,
    } = mediaKeysInfos;

    currentMediaKeysInfos.setState(mediaElement, {
      keySystemOptions,
      mediaKeySystemAccess,
      mediaKeys,
      sessionsStore,
    });

    return (
      previousState && previousState.sessionsStore !== sessionsStore ?
        previousState.sessionsStore.closeAllSessions() :
        observableOf(null)
    ).pipe(mergeMap(() => {
      if (mediaElement.mediaKeys === mediaKeys) {
        return observableOf(null);
      }

      log.debug("EME: Setting MediaKeys");
      return setMediaKeys(mediaElement, mediaKeys);
    }));
  });
}
