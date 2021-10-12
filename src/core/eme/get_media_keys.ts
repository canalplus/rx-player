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
  catchError,
  map,
  mergeMap,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  ICustomMediaKeys,
  ICustomMediaKeySystemAccess,
} from "../../compat";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import tryCatch from "../../utils/rx-try_catch";
import getMediaKeySystemAccess from "./find_key_system";
import MediaKeysInfosStore from "./media_keys_infos_store";
import ServerCertificateStore from "./server_certificate_store";
import {
  IKeySystemOption,
  IMediaKeySessionStores,
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

/** Object returned by `getMediaKeysInfos`. */
export interface IMediaKeysInfos {
  /** The MediaKeySystemAccess which allowed to create the MediaKeys instance. */
  mediaKeySystemAccess: MediaKeySystemAccess |
                        ICustomMediaKeySystemAccess;
  /** The MediaKeys instance. */
  mediaKeys : MediaKeys |
              ICustomMediaKeys;
  /** Stores allowing to create and retrieve MediaKeySessions. */
  stores : IMediaKeySessionStores;
  /** IKeySystemOption compatible to the created MediaKeys instance. */
  options : IKeySystemOption;
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
  return getMediaKeySystemAccess(mediaElement, keySystemsConfigs).pipe(
    mergeMap((evt) => {
      const { options, mediaKeySystemAccess } = evt.value;
      const currentState = MediaKeysInfosStore.getState(mediaElement);
      const persistentSessionsStore = createPersistentSessionsStorage(options);

      if (currentState !== null && evt.type === "reuse-media-key-system-access") {
        const { mediaKeys, loadedSessionsStore } = currentState;

        // We might just rely on the currently attached MediaKeys instance.
        // First check if server certificate parameters are the same than in the
        // current MediaKeys instance. If not, re-create MediaKeys from scratch.
        if (ServerCertificateStore.hasOne(mediaKeys) === false ||
            (!isNullOrUndefined(options.serverCertificate) &&
             ServerCertificateStore.has(mediaKeys, options.serverCertificate)))
        {
          return observableOf({ mediaKeys,
                                mediaKeySystemAccess,
                                stores: { loadedSessionsStore, persistentSessionsStore },
                                options });

        }
      }

      return createMediaKeys(mediaKeySystemAccess).pipe(map((mediaKeys) => {
        log.info("EME: MediaKeys created with success", mediaKeys);
        const loadedSessionsStore = new LoadedSessionsStore(mediaKeys);
        return { mediaKeys,
                 mediaKeySystemAccess,
                 stores: { loadedSessionsStore, persistentSessionsStore },
                 options };
      }));
    }));
}

/**
 * Create `MediaKeys` from the `MediaKeySystemAccess` given.
 * Throws the right formatted error if it fails.
 * @param {MediaKeySystemAccess} mediaKeySystemAccess
 * @returns {Observable.<MediaKeys>}
 */
function createMediaKeys(
  mediaKeySystemAccess : MediaKeySystemAccess | ICustomMediaKeySystemAccess
) : Observable<MediaKeys | ICustomMediaKeys> {
  log.info("EME: Calling createMediaKeys on the MediaKeySystemAccess");
  return tryCatch(() => castToObservable(mediaKeySystemAccess.createMediaKeys()),
                  undefined).pipe(
    catchError((error : unknown) : never => {
      const message = error instanceof Error ?
        error.message :
        "Unknown error when creating MediaKeys.";
      throw new EncryptedMediaError("CREATE_MEDIA_KEYS_ERROR", message);
    }));
}
