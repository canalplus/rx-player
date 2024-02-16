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
import eme from "../../compat/eme";
import log from "../../log";
import MediaKeysInfosStore from "./utils/media_keys_infos_store";
/**
 * Dispose of the MediaKeys instance attached to the given media element, if
 * one.
 * @param {Object} mediaElement
 * @returns {Promise}
 */
export function disableMediaKeys(mediaElement) {
    MediaKeysInfosStore.setState(mediaElement, null);
    return eme
        .setMediaKeys(mediaElement, null)
        .then(() => {
        log.info("DRM: MediaKeys disabled with success");
    })
        .catch((err) => {
        log.error("DRM: Could not disable MediaKeys", err instanceof Error ? err : "Unknown Error");
    });
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
export default async function attachMediaKeys(mediaElement, { emeImplementation, keySystemOptions, loadedSessionsStore, mediaKeySystemAccess, mediaKeys, }, cancelSignal) {
    const previousState = MediaKeysInfosStore.getState(mediaElement);
    const closeAllSessions = previousState !== null && previousState.loadedSessionsStore !== loadedSessionsStore
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
    emeImplementation
        .setMediaKeys(mediaElement, mediaKeys)
        .then(() => {
        log.info("DRM: MediaKeys attached with success");
    })
        .catch((err) => {
        log.error("DRM: Could not set MediaKeys", err instanceof Error ? err : "Unknown Error");
    });
}
