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
  filter,
  map,
  mergeMap,
  Observable,
  startWith,
  take,
} from "rxjs";
import log from "../../log";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import createSharedReference from "../../utils/reference";
import fromCancellablePromise from "../../utils/rx-from_cancellable_promise";
import TaskCanceller from "../../utils/task_canceller";
import attachMediaKeys, {
  disableMediaKeys,
} from "./attach_media_keys";
import getDrmSystemId from "./get_drm_system_id";
import getMediaKeysInfos from "./get_media_keys";
import {
  IAttachedMediaKeysEvent,
  ICreatedMediaKeysEvent,
  IKeySystemOption,
} from "./types";

/**
 * Get media keys infos from key system configs then attach media keys to media element.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @returns {Observable}
 */
export default function initMediaKeys(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[]
): Observable<ICreatedMediaKeysEvent|IAttachedMediaKeysEvent> {
  const canceller = new TaskCanceller();

  return fromCancellablePromise(
    canceller,
    () => getMediaKeysInfos(mediaElement, keySystemsConfigs, canceller.signal)
  ).pipe(mergeMap(({ mediaKeys, mediaKeySystemAccess, stores, options }) => {
    /**
     * String identifying the key system, allowing the rest of the code to
     * only advertise the required initialization data for license requests.
     *
     * Note that we only set this value if retro-compatibility to older
     * persistent logic in the RxPlayer is not important, as the optimizations
     * this property unlocks can break the loading of MediaKeySessions
     * persisted in older RxPlayer's versions.
     */
    let initializationDataSystemId : string | undefined;
    if (isNullOrUndefined(options.licenseStorage) ||
        options.licenseStorage.disableRetroCompatibility === true)
    {
      initializationDataSystemId = getDrmSystemId(mediaKeySystemAccess.keySystem);
    }

    const canAttachMediaKeys = createSharedReference(false);
    const shouldDisableOldMediaKeys =
      mediaElement.mediaKeys !== null &&
      mediaElement.mediaKeys !== undefined &&
      mediaKeys !== mediaElement.mediaKeys;

    if (shouldDisableOldMediaKeys) {
      log.debug("EME: Disabling old MediaKeys");
      disableMediaKeys(mediaElement);
    }

    log.debug("EME: Attaching current MediaKeys");
    return canAttachMediaKeys.asObservable().pipe(
      filter(canAttach => canAttach),
      mergeMap(() => {
        const stateToAttatch = { loadedSessionsStore: stores.loadedSessionsStore,
                                 mediaKeySystemAccess,
                                 mediaKeys,
                                 keySystemOptions: options };
        return fromCancellablePromise(
          canceller,
          () => attachMediaKeys(mediaElement, stateToAttatch, canceller.signal)
        );
      }),
      take(1),
      map(() => ({ type: "attached-media-keys" as const,
                   value: { mediaKeySystemAccess, mediaKeys, stores, options } })),
      startWith({ type: "created-media-keys" as const,
                  value: { mediaKeySystemAccess,
                           initializationDataSystemId,
                           mediaKeys,
                           stores,
                           options,
                           canAttachMediaKeys } })
    );
  }));
}
