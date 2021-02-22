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
  catchError,
  filter,
  mapTo,
  mergeMap,
  take,
} from "rxjs/operators";
import {
  play$,
  shouldValidateMetadata,
  shouldWaitForDataBeforeLoaded,
} from "../../compat";
import log from "../../log";
import { IInitClockTick } from "./types";

export type ILoadEvents =
  "not-loaded-metadata" | // metadata are not loaded. Manual action required
  "autoplay-blocked" | // loaded but autoplay is blocked by the browser
  "autoplay" | // loaded and autoplayed succesfully
  "loaded"; // loaded without autoplay enabled


/**
 * Try to play content then handle autoplay errors.
 * @param {HTMLMediaElement} - mediaElement
 * @returns {Observable}
 */
function tryToPlay$(
  mediaElement: HTMLMediaElement
): Observable<"autoplay"|"autoplay-blocked"> {
  return play$(mediaElement).pipe(
    mapTo("autoplay" as const),
    catchError((error : unknown) => {
      if (error instanceof Error && error.name === "NotAllowedError") {
        // auto-play was probably prevented.
        log.warn("Init: Media element can't play." +
                 " It may be due to browser auto-play policies.");
        return observableOf("autoplay-blocked" as const);
      } else {
        throw error;
      }
    })
  );
}

/**
 * Listen to the `initClock$` to know when the autoPlay action can be triggered.
 * Emit either one of these values:
 *   - "autoplay": The content is loaded and autoplay has been performed
 *   - "loaded": The constent is loaded without autoplay, as asked
 *   - "autoplay-blocked": The content is loaded but autoplay could not be
 *     performed due to browser restrictions.
 *   - "not-loaded-metadata"
 * @param {Observable} initClock$
 * @param {HTMLMediaElement} mediaElement
 * @param {boolean} autoPlay
 * @param {boolean} isDirectfile
 * @returns {Observable}
 */
export default function tryBeginningPlayback(
  initClock$ : Observable<IInitClockTick>,
  mediaElement : HTMLMediaElement,
  autoPlay : boolean,
  isDirectfile : boolean
) : Observable<ILoadEvents> {
  /**
   * Observable which will try to apply the autoplay setting then announced the
   * content as loaded (or as "autoplay-blocked").
   */
  const beginPlayback$ = initClock$.pipe(
    filter((tick) => {
      const { seeking, stalled, readyState, currentRange } = tick;
      if (seeking || stalled !== null) {
        return false;
      }
      if (!shouldWaitForDataBeforeLoaded(
        isDirectfile,
        mediaElement.hasAttribute("playsinline"))) {
        return readyState >= 1 && mediaElement.duration > 0;
      }
      if (readyState >= 4 || (readyState === 3 && currentRange !== null)) {
        return shouldValidateMetadata() ? mediaElement.duration > 0 :
          true;
      }
      return false;
    }),
    take(1),
    mergeMap(() => {
      if (!autoPlay) {
        return observableOf("loaded" as const);
      }
      return tryToPlay$(mediaElement);
    }));

  if (!shouldValidateMetadata()) {
    return beginPlayback$;
  }

  return initClock$.pipe(
    filter((tick) => tick.readyState >= 1),
    mergeMap(() => {
      if (mediaElement.duration === 0) {
        return observableConcat(observableOf("not-loaded-metadata" as const),
                                beginPlayback$);
      }
      return beginPlayback$;
    }));
}
