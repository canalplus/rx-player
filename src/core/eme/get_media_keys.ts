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
} from "rxjs";
import {
  catchError,
  map,
  mergeMap,
} from "rxjs/operators";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import tryCatch from "../../utils/rx-try_catch";
import getMediaKeySystemAccess from "./find_key_system";
import MediaKeysInfosStore from "./media_keys_infos_store";
import {
  IKeySystemOption,
  IMediaKeysInfos,
} from "./types";
import LoadedSessionsStore from "./utils/loaded_sessions_store";
import PersistentSessionsStore from "./utils/persistent_sessions_store";

/**
 * @throws {EncryptedMediaError}
 * @param {Object} keySystemOptions
 * @returns {Object|null}
 */
function createPersistentSessionsStorage(
  keySystemOptions : IKeySystemOption
) : PersistentSessionsStore|null {
  if (keySystemOptions.persistentLicense !== true) {
    return null;
  }

  const { licenseStorage } = keySystemOptions;
  if (licenseStorage == null) {
    throw new EncryptedMediaError("INVALID_KEY_SYSTEM",
                                  "No license storage found for persistent license.");
  }

  log.debug("EME: Set the given license storage");
  return new PersistentSessionsStore(licenseStorage);
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
      const persistentSessionsStore = createPersistentSessionsStorage(options);

      if (currentState != null && evt.type === "reuse-media-key-system-access") {
        const { mediaKeys, loadedSessionsStore } = currentState;
        return observableOf({ mediaKeys,
                              loadedSessionsStore,
                              mediaKeySystemAccess,
                              keySystemOptions: options,
                              persistentSessionsStore });
      }

      log.info("EME: Calling createMediaKeys on the MediaKeySystemAccess");
      return tryCatch(() => castToObservable(mediaKeySystemAccess.createMediaKeys()),
                      undefined).pipe(
        catchError((error : unknown) : never => {
          const message = error instanceof Error ?
            error.message :
            "Unknown error when creating MediaKeys.";
          throw new EncryptedMediaError("CREATE_MEDIA_KEYS_ERROR", message);
        }),
        map((mediaKeys) => {
          log.info("EME: MediaKeys created with success", mediaKeys);
          return { mediaKeys,
                   loadedSessionsStore: new LoadedSessionsStore(mediaKeys),
                   mediaKeySystemAccess,
                   keySystemOptions: options,
                   persistentSessionsStore };
        }));
    }));
}
