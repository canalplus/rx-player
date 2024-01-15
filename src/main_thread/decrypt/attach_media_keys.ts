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

import type {
  ICustomMediaKeys,
  ICustomMediaKeySystemAccess,
  IEmeApiImplementation,
} from "../../compat/eme";
import eme from "../../compat/eme";
import { setMediaKeys } from "../../compat/eme/set_media_keys";
import log from "../../log";
import type { IKeySystemOption } from "../../public_types";
import type { CancellationSignal } from "../../utils/task_canceller";
import type LoadedSessionsStore from "./utils/loaded_sessions_store";
import MediaKeysInfosStore from "./utils/media_keys_infos_store";

/**
 * Dispose of the MediaKeys instance attached to the given media element, if
 * one.
 * @param {Object} mediaElement
 * @returns {Promise}
 */
export function disableMediaKeys(mediaElement: HTMLMediaElement): Promise<unknown> {
  const previousState = MediaKeysInfosStore.getState(mediaElement);
  MediaKeysInfosStore.setState(mediaElement, null);
  return setMediaKeys(previousState?.emeImplementation ?? eme, mediaElement, null);
}

/**
 * Attach MediaKeys and its associated state to an HTMLMediaElement.
 *
 * /!\ Mutates heavily MediaKeysInfosStore
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} mediaKeysInfos
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default async function attachMediaKeys(
  mediaElement: HTMLMediaElement,
  {
    emeImplementation,
    keySystemOptions,
    loadedSessionsStore,
    mediaKeySystemAccess,
    mediaKeys,
  }: IMediaKeysState,
  cancelSignal: CancellationSignal,
): Promise<void> {
  const previousState = MediaKeysInfosStore.getState(mediaElement);
  const closeAllSessions =
    previousState !== null && previousState.loadedSessionsStore !== loadedSessionsStore
      ? previousState.loadedSessionsStore.closeAllSessions()
      : Promise.resolve();

  await closeAllSessions;

  // If this task has been cancelled while we were closing previous sessions,
  // stop now (and thus avoid setting the new media keys);
  if (cancelSignal.isCancelled()) {
    throw cancelSignal.cancellationError;
  }

  MediaKeysInfosStore.setState(mediaElement, {
    emeImplementation,
    keySystemOptions,
    mediaKeySystemAccess,
    mediaKeys,
    loadedSessionsStore,
  });
  if (mediaElement.mediaKeys === mediaKeys) {
    return;
  }
  log.info("DRM: Attaching MediaKeys to the media element");
  return setMediaKeys(emeImplementation, mediaElement, mediaKeys)
    .then(() => {
      log.info("DRM: MediaKeys attached with success");
    })
    .catch((err) => {
      // TODO proper error (rely on the `CREATE_MEDIA_KEYS` code or create a new
      // one?).
      log.error(
        "DRM: Could not set MediaKeys",
        err instanceof Error ? err : "Unknown Error",
      );
    });
}

/** MediaKeys and associated state attached to a media element. */
export interface IMediaKeysState {
  /** Options set when the MediaKeys has been attached. */
  keySystemOptions: IKeySystemOption;
  /** LoadedSessionsStore associated to the MediaKeys instance. */
  loadedSessionsStore: LoadedSessionsStore;
  /** The MediaKeySystemAccess allowing to create MediaKeys instances. */
  mediaKeySystemAccess: MediaKeySystemAccess | ICustomMediaKeySystemAccess;
  /** The MediaKeys instance to attach to the media element. */
  mediaKeys: MediaKeys | ICustomMediaKeys;
  /**
   * The chosen EME implementation abstraction linked to `mediaKeys`.
   * Different EME implementation might for example be used while debugging or
   * work-arounding EME-linked device issues.
   */
  emeImplementation: IEmeApiImplementation;
}
