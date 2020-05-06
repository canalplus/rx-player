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
  EMPTY,
  Observable,
} from "rxjs";
import { ignoreElements } from "rxjs/operators";
import { shouldUnsetMediaKeys } from "../../compat/";
import disposeMediaKeys from "./dispose_media_keys";
import MediaKeysInfosStore from "./media_keys_infos_store";

/**
 * Clear EME ressources that should be cleared when the current content stops
 * its playback.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function clearEMESession(
  mediaElement : HTMLMediaElement
) : Observable<never> {
  return observableDefer(() => {
    if (shouldUnsetMediaKeys()) {
      return disposeMediaKeys(mediaElement)
        .pipe(ignoreElements());
    }

    const currentState = MediaKeysInfosStore.getState(mediaElement);
    if (currentState != null &&
        currentState.keySystemOptions.closeSessionsOnStop === true)
    {
      return currentState.loadedSessionsStore.closeAllSessions()
        .pipe(ignoreElements());
    }
    return EMPTY;
  });
}
