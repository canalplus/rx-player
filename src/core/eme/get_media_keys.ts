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
  of as observableOf,
  timer,
} from "rxjs";
import {
  catchError,
  map,
  mergeMap,
} from "rxjs/operators";
import {
  EncryptedMediaError,
} from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import getMediaKeySystemAccess from "./find_key_system";
import MediaKeysInfosStore from "./media_keys_infos_store";
import {
  IKeySystemOption,
  IMediaKeysInfos,
} from "./types";
import SessionsStore from "./utils/open_sessions_store";
import PersistedSessionsStore from "./utils/persisted_session_store";

/**
 * @throws {EncryptedMediaError}
 * @param {Object} keySystemOptions
 * @returns {Object|null}
 */
function createSessionStorage(
  keySystemOptions : IKeySystemOption
) : PersistedSessionsStore|null {
  if (keySystemOptions.persistentLicense !== true) {
    return null;
  }

  const { licenseStorage } = keySystemOptions;
  if (licenseStorage == null) {
    throw new EncryptedMediaError("INVALID_KEY_SYSTEM",
                                  "No license storage found for persistent license.");
  }

  log.info("EME: Set the given license storage");
  return new PersistedSessionsStore(licenseStorage);
}

/**
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @returns {Observable}
 */
export default function getMediaKeysInfos(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[]
) : Observable<IMediaKeysInfos> {
    return getMediaKeySystemAccess(mediaElement,
                                   keySystemsConfigs
    ).pipe(mergeMap((evt) => {
      const { options, mediaKeySystemAccess } = evt.value;
      const currentState = MediaKeysInfosStore.getState(mediaElement);
      const sessionStorage = createSessionStorage(options);

      if (currentState != null && evt.type === "reuse-media-key-system-access") {
        const { mediaKeys, sessionsStore } = currentState;
        return observableOf({ mediaKeys,
                              sessionsStore,
                              mediaKeySystemAccess,
                              keySystemOptions: options,
                              sessionStorage });
      }

      log.debug("EME: Calling createMediaKeys on the MediaKeySystemAccess");

      /**
       * Create MediaKeys and handle errors.
       * @param {Object} retryOptions
       * @returns {Observable} - IMediaKeysInfos
       */
      function createMediaKeys$(retryOptions: { remainingRetries: number;
                                                retryDelay: number; }
      ): Observable<IMediaKeysInfos> {
        return castToObservable(mediaKeySystemAccess.createMediaKeys())
          .pipe(
            map((mediaKeys) => ({ mediaKeys,
                                  sessionsStore: new SessionsStore(mediaKeys),
                                  mediaKeySystemAccess,
                                  keySystemOptions: options,
                                  sessionStorage })),
            catchError((error : unknown): Observable<IMediaKeysInfos> => {
              const message =
                error instanceof Error ? error.message :
                                         "Unknown error when creating MediaKeys.";
              const { remainingRetries, retryDelay } = retryOptions;
              if (remainingRetries > 0) {
                log.error("EME: Error when creating MediaKeys: " + message,
                          "Retrying.");
                return timer(retryDelay).pipe(
                  mergeMap(() => {
                    return createMediaKeys$({ remainingRetries: remainingRetries - 1,
                                              retryDelay });
                  })
                );
              }
              throw new EncryptedMediaError("CREATE_MEDIA_KEYS_ERROR", message);
            })
          );
      }

      return createMediaKeys$({
        remainingRetries: 2,
        retryDelay: 100,
      });
    }));
}
