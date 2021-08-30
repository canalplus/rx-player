
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
} from "rxjs";
import {
  take,
} from "rxjs/operators";
import {
  shouldValidateMetadata,
  shouldWaitForDataBeforeLoaded,
} from "../../compat";
import filterMap from "../../utils/filter_map";
import SegmentBuffersStore from "../segment_buffers";
import EVENTS from "./events_generators";
import {
  IInitClockTick,
  ILoadedEvent,
} from "./types";

/**
 * Emit a `ILoadedEvent` once the content can be considered as loaded.
 * @param {Observable} clock$
 * @param {HTMLMediaElement} mediaElement
 * @param {Object|null} segmentBuffersStore
 * @param {boolean} isDirectfile - `true` if this is a directfile content
 * @returns {Observable}
 */
export default function emitLoadedEvent(
  clock$ : Observable<IInitClockTick>,
  mediaElement : HTMLMediaElement,
  segmentBuffersStore : SegmentBuffersStore | null,
  isDirectfile : boolean
) : Observable<ILoadedEvent> {
  return clock$.pipe(
    filterMap<IInitClockTick, ILoadedEvent, null>((tick) => {
      if (tick.rebuffering !== null ||
          tick.freezing !== null ||
          tick.readyState === 0)
      {
        return null;
      }

      if (!shouldWaitForDataBeforeLoaded(isDirectfile,
                                         mediaElement.hasAttribute("playsinline")))
      {
        return mediaElement.duration > 0 ? EVENTS.loaded(segmentBuffersStore) :
                                           null;
      }

      if (tick.readyState >= 3 && tick.currentRange !== null) {
        if (!shouldValidateMetadata() || mediaElement.duration > 0) {
          return EVENTS.loaded(segmentBuffersStore);
        }
        return null;
      }
      return null;
    }, null),
    take(1));
}
