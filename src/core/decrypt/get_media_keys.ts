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
  ICustomMediaKeys,
  ICustomMediaKeySystemAccess,
} from "../../compat";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import { IKeySystemOption } from "../../public_types";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { CancellationSignal } from "../../utils/task_canceller";
import getMediaKeySystemAccess from "./find_key_system";
import { IMediaKeySessionStores } from "./types";
import LoadedSessionsStore from "./utils/loaded_sessions_store";
import MediaKeysInfosStore from "./utils/media_keys_infos_store";
import PersistentSessionsStore from "./utils/persistent_sessions_store";
import ServerCertificateStore from "./utils/server_certificate_store";

/**
 * @throws {EncryptedMediaError}
 * @param {Object} keySystemOptions
 * @returns {Object|null}
 */
function createPersistentSessionsStorage(
  keySystemOptions : IKeySystemOption
) : PersistentSessionsStore|null {
  if (isNullOrUndefined(keySystemOptions.persistentLicenseConfig)) {
    return null;
  }

  const { persistentLicenseConfig } = keySystemOptions;
  if (persistentLicenseConfig == null) {
    throw new EncryptedMediaError("INVALID_KEY_SYSTEM",
                                  "No `persistentLicenseConfig` found for " +
                                  "persistent license.");
  }

  log.debug("DRM: Set the given license storage");
  return new PersistentSessionsStore(persistentLicenseConfig);
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
 * Create a MediaKeys instance and associated structures (or just return the
 * current ones if sufficient) based on a wanted configuration.
 * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement on which you
 * will attach the MediaKeys instance.
 * This Element is here only used to check if the current MediaKeys and
 * MediaKeySystemAccess instances are sufficient
 * @param {Array.<Object>} keySystemsConfigs - The key system configuration.
 * Needed to ask the right MediaKeySystemAccess.
 * @param {Object} cancelSignal - CancellationSignal allowing to cancel the
 * creation of the MediaKeys instance while the task is still pending.
 * @returns {Promise.<Object>}
 */
export default async function getMediaKeysInfos(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[],
  cancelSignal : CancellationSignal
) : Promise<IMediaKeysInfos> {
  const evt = await getMediaKeySystemAccess(mediaElement,
                                            keySystemsConfigs,
                                            cancelSignal);
  if (cancelSignal.cancellationError !== null) {
    throw cancelSignal.cancellationError;
  }

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
      return { mediaKeys,
               mediaKeySystemAccess,
               stores: { loadedSessionsStore, persistentSessionsStore },
               options };

    }
  }

  const mediaKeys = await createMediaKeys(mediaKeySystemAccess);
  log.info("DRM: MediaKeys created with success");
  const loadedSessionsStore = new LoadedSessionsStore(mediaKeys);
  return { mediaKeys,
           mediaKeySystemAccess,
           stores: { loadedSessionsStore, persistentSessionsStore },
           options };
}

/**
 * Create `MediaKeys` from the `MediaKeySystemAccess` given.
 * Throws the right formatted error if it fails.
 * @param {MediaKeySystemAccess} mediaKeySystemAccess
 * @returns {Observable.<MediaKeys>}
 */
async function createMediaKeys(
  mediaKeySystemAccess : MediaKeySystemAccess | ICustomMediaKeySystemAccess
) : Promise<MediaKeys | ICustomMediaKeys> {
  log.info("DRM: Calling createMediaKeys on the MediaKeySystemAccess");
  try {
    const mediaKeys = await mediaKeySystemAccess.createMediaKeys();
    return mediaKeys;
  } catch (error) {
    const message = error instanceof Error ? error.message :
                                             "Unknown error when creating MediaKeys.";
    throw new EncryptedMediaError("CREATE_MEDIA_KEYS_ERROR", message);
  }
}
