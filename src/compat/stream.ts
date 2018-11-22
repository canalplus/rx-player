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
  ReplaySubject,
} from "rxjs";
import {
  filter,
  map,
  multicast,
  refCount
} from "rxjs/operators";
import { onPlayPause$ } from "./events";

/**
 * onPlayPause$ wrapper.
 * Has a specific behavior when playback is happening on android Samsung internet.
 * @param {HTMLMediaElement} mediaElement
 * @param {boolean} autoPlay
 * @param {Object|undefined} options
 * @returns {Observable}
 */
export function onPlayPause(
  mediaElement : HTMLMediaElement,
  autoPlay : boolean,
  onPlayPauseOptions? : {
    hasLoadedMetadata: boolean;
    initialMediaDuration : number;
  }
): Observable<boolean> {
  let obs$;
  obs$ = onPlayPause$(mediaElement).pipe(
    filter((x, i) => {
      if (
        onPlayPauseOptions &&
        onPlayPauseOptions.initialMediaDuration === 0 &&
        onPlayPauseOptions.hasLoadedMetadata
      ) {
        // On samsung, we play a first time, even when autoPlay is false.
        // We should filter on it
        return !(i === 0 && !autoPlay && x.type === "play");
      }
      return true;
    }),
    map((x) => (x && x.type === "play") ? true : false)
  );
  return obs$.pipe(
    // equivalent to a sane shareReplay:
    // https://github.com/ReactiveX/rxjs/issues/3336
    // XXX TODO Replace it when that issue is resolved
    multicast(() => new ReplaySubject(1)),
    refCount()
  );
}
