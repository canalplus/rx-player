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

import { Observable } from "rxjs";
import {
  ignoreElements,
  startWith,
  tap,
} from "rxjs/operators";
import log from "../../log";
import Manifest from "../../manifest";
import { fromEvent } from "../../utils/event_emitter";

/** Number of seconds in a regular year. */
const YEAR_IN_SECONDS = 365 * 24 * 3600;

/**
 * Keep the MediaSource duration up-to-date with the Manifest one on
 * subscription:
 * Set the current duration initially and then update if needed after
 * each Manifest updates.
 * @param {Object} manifest
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
export default function DurationUpdater(
  manifest : Manifest,
  mediaSource : MediaSource
) : Observable<never> {
  return fromEvent(manifest, "manifestUpdate").pipe(
    startWith(null),
    tap(() => {
      const maximumPosition = manifest.getMaximumPosition();

      // Some targets poorly support setting a very high number for durations.
      // Yet, in live contents, we would prefer setting a value as high as possible
      // to still be able to seek anywhere we want to (even ahead of the Manifest if
      // we want to). As such, we put it at a safe default value of 2^32 excepted
      // when the maximum position is already relatively close to that value, where
      // we authorize exceptionally going over it.
      const newDuration = !manifest.isLive ? maximumPosition :
                                             Math.max(Math.pow(2, 32),
                                                      maximumPosition + YEAR_IN_SECONDS);

      if (isNaN(mediaSource.duration) || !isFinite(mediaSource.duration) ||
          Math.abs(mediaSource.duration - newDuration) > 0.01)
      {
        log.info("Init: Updating duration", newDuration);
        mediaSource.duration = newDuration;
      }
    }),
    ignoreElements());
}
