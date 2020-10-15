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
import attachMediaKeys, {
  disableMediaKeys
} from "./attach_media_keys";
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
    .pipe(mergeMap((mediaKeysInfos) => {
      const attachMediaKeys$ = (new ReplaySubject<void>(1));
      const shouldDisableOldMediaKeys =
        mediaElement.mediaKeys !== null &&
        mediaElement.mediaKeys !== undefined &&
        mediaKeysInfos.mediaKeys !== mediaElement.mediaKeys;

      const disableOldMediaKeys$ = shouldDisableOldMediaKeys ?
        disableMediaKeys(mediaElement) :
        observableOf(null);

      log.debug("EME: Disabling old MediaKeys");
      return disableOldMediaKeys$.pipe(
        mergeMap(() => {
          log.debug("EME: Disabled old MediaKeys. Waiting to attach new MediaKeys");
          return attachMediaKeys$.pipe(
            mergeMap(() => attachMediaKeys(mediaKeysInfos, mediaElement)),
            take(1),
            mapTo({ type: "attached-media-keys" as const,
                     value: mediaKeysInfos, }),
            startWith({ type: "created-media-keys" as const,
                        value: { mediaKeysInfos,
                                 attachMediaKeys$ } })
          );
        })
      );
    }));
}
