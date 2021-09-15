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
  ReplaySubject,
} from "rxjs";
import {
  mapTo,
  mergeMap,
  startWith,
  take,
} from "rxjs/operators";
import log from "../../log";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
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
  return getMediaKeysInfos(mediaElement, keySystemsConfigs)
    .pipe(mergeMap(({ mediaKeys, mediaKeySystemAccess, stores, options }) => {

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

      const attachMediaKeys$ = new ReplaySubject<void>(1);
      const shouldDisableOldMediaKeys =
        mediaElement.mediaKeys !== null &&
        mediaElement.mediaKeys !== undefined &&
        mediaKeys !== mediaElement.mediaKeys;

      let disableOldMediaKeys$ : Observable<unknown> = observableOf(null);
      if (shouldDisableOldMediaKeys) {
        log.debug("EME: Disabling old MediaKeys");
        disableOldMediaKeys$ = disableMediaKeys(mediaElement);
      }
      return disableOldMediaKeys$.pipe(
        mergeMap(() => {
          log.debug("EME: Attaching current MediaKeys");
          return attachMediaKeys$.pipe(
            mergeMap(() => {
              const stateToAttatch = { loadedSessionsStore: stores.loadedSessionsStore,
                                       mediaKeySystemAccess,
                                       mediaKeys,
                                       keySystemOptions: options };
              return attachMediaKeys(mediaElement, stateToAttatch);
            }),
            take(1),
            mapTo({ type: "attached-media-keys" as const,
                    value: { mediaKeySystemAccess, mediaKeys, stores, options } }),
            startWith({ type: "created-media-keys" as const,
                        value: { mediaKeySystemAccess,
                                 initializationDataSystemId,
                                 mediaKeys,
                                 stores,
                                 options,
                                 attachMediaKeys$ } })
          );
        })
      );
    }));
}
