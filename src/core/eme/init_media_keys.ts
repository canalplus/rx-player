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
  concat as observableConcat,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  mapTo,
  mergeMap,
} from "rxjs/operators";
import attachMediaKeys from "./attach_media_keys";
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
      return observableConcat(
        observableOf({ type: "created-media-keys" as const,
                       value: mediaKeysInfos }),
        attachMediaKeys(mediaKeysInfos, mediaElement)
          .pipe(mapTo({ type: "attached-media-keys" as const,
                        value: mediaKeysInfos, }))
      );
    }));
}
