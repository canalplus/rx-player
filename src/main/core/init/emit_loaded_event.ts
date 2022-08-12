
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
  take,
} from "rxjs";
import filterMap from "../../../common/utils/filter_map";
import {
  shouldValidateMetadata,
  shouldWaitForDataBeforeLoaded,
} from "../../compat";
import { IPlaybackObservation } from "../api";
import EVENTS from "./events_generators";
import { ILoadedEvent } from "./types";

/**
 * Emit a `ILoadedEvent` once the content can be considered as loaded.
 * @param {Observable} observation$
 * @param {HTMLMediaElement} mediaElement
 * @param {boolean} isDirectfile - `true` if this is a directfile content
 * @returns {Observable}
 */
export default function emitLoadedEvent(
  observation$ : Observable<IPlaybackObservation>,
  mediaElement : HTMLMediaElement,
  isDirectfile : boolean
) : Observable<ILoadedEvent> {
  return observation$.pipe(
    filterMap<IPlaybackObservation, ILoadedEvent, null>((observation) => {
      if (observation.rebuffering !== null ||
          observation.freezing !== null ||
          observation.readyState === 0)
      {
        return null;
      }

      if (!shouldWaitForDataBeforeLoaded(isDirectfile,
                                         mediaElement.hasAttribute("playsinline")))
      {
        return mediaElement.duration > 0 ? EVENTS.loaded() :
                                           null;
      }

      if (observation.readyState >= 3 && observation.currentRange !== null) {
        if (!shouldValidateMetadata() || mediaElement.duration > 0) {
          return EVENTS.loaded();
        }
        return null;
      }
      return null;
    }, null),
    take(1));
}
