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
  mergeMap,
  tap,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  ICustomMediaKeys,
  ICustomMediaKeySystemAccess,
  setMediaKeys,
} from "../../compat";
import log from "../../log";
import MediaKeysInfosStore from "./media_keys_infos_store";
import {
  IKeySystemOption,
} from "./types";
import LoadedSessionsStore from "./utils/loaded_sessions_store";

/**
 * Dispose the media keys on media element.
 * @param {Object} mediaElement
 * @returns {Observable}
 */
export function disableMediaKeys(
  mediaElement : HTMLMediaElement
): Observable<unknown> {
  return observableDefer(() => {
    MediaKeysInfosStore.setState(mediaElement, null);
    return setMediaKeys(mediaElement, null);
  });
}

/** MediaKeys and associated state attached to a media element. */
export interface IMediaKeysState {
  /** Options set when the MediaKeys has been attached. */
  keySystemOptions : IKeySystemOption;
  /** LoadedSessionsStore associated to the MediaKeys instance. */
  loadedSessionsStore : LoadedSessionsStore;
  /** The MediaKeySystemAccess allowing to create MediaKeys instances. */
  mediaKeySystemAccess: MediaKeySystemAccess |
                        ICustomMediaKeySystemAccess;
  /** The MediaKeys instance to attach to the media element. */
  mediaKeys : MediaKeys |
              ICustomMediaKeys;
}

/**
 * Attach MediaKeys and its associated state to an HTMLMediaElement.
 *
 * /!\ Mutates heavily MediaKeysInfosStore
 * @param {Object} mediaKeysInfos
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function attachMediaKeys(
  mediaElement : HTMLMediaElement,
  { keySystemOptions,
    loadedSessionsStore,
    mediaKeySystemAccess,
    mediaKeys } : IMediaKeysState
) : Observable<unknown> {
  return observableDefer(() => {
    const previousState = MediaKeysInfosStore.getState(mediaElement);
    const closeAllSessions$ = previousState !== null &&
                              previousState.loadedSessionsStore !== loadedSessionsStore ?
                                previousState.loadedSessionsStore.closeAllSessions() :
                                observableOf(null);

    return closeAllSessions$.pipe(
      mergeMap(() => {
        MediaKeysInfosStore.setState(mediaElement,
                                     { keySystemOptions,
                                       mediaKeySystemAccess,
                                       mediaKeys,
                                       loadedSessionsStore });
        if (mediaElement.mediaKeys === mediaKeys) {
          return observableOf(null);
        }
        log.info("EME: Attaching MediaKeys to the media element");
        return setMediaKeys(mediaElement, mediaKeys)
          .pipe(tap(() => { log.info("EME: MediaKeys attached with success"); }));
      })
    );
  });
}
