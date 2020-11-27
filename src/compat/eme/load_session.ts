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
  defer as observableDefer,
  Observable,
  of as observableOf,
} from "rxjs";
import { mergeMap } from "rxjs/operators";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import tryCatch from "../../utils/rx-try_catch";
import { ICustomMediaKeySession } from "./custom_media_keys";

/**
 * Load a persistent session, based on its `sessionId`, on the given
 * MediaKeySession.
 *
 * Returns an Observable which emits:
 *   - true if the persistent MediaKeySession was found and loaded
 *   - false if no persistent MediaKeySession was found with that `sessionId`.
 * Then completes.
 *
 * The Observable throws if anything goes wrong in the process.
 * @param {MediaKeySession} session
 * @param {string} sessionId
 * @returns {Observable}
 */
export default function loadSession(
  session : MediaKeySession | ICustomMediaKeySession,
  sessionId : string
) : Observable<boolean> {
  return observableDefer(() => {
    log.info("Compat/EME: Load persisted session", sessionId);
    return tryCatch<undefined, boolean>(() => castToObservable(session.load(sessionId)),
                                        undefined);
  }).pipe(mergeMap((isLoaded : boolean) : Observable<boolean> => {
    if (!isLoaded || session.keyStatuses.size > 0) {
      return observableOf(isLoaded);
    }

    // A browser race condition exists for example in some old Chromium/Chrome
    // versions where the `keyStatuses` property from a loaded MediaKeySession
    // would not be populated directly as the load answer but asynchronously
    // after.
    //
    // Even a delay of `0` millisecond is sufficient, letting us think that it
    // just happens just after and what is required is just to wait the next
    // event loop turn.
    // We found out that creating a micro-task (for example by calling
    // `Promise.resolve.then`) was not sufficient, that's why we're using the
    // somewhat less elegant `setTimeout` solution instead.
    // This is also the reason why I didn't use RxJS's `timer` function, as I'm
    // unsure of possible optimizations (or future optimizations), when the
    // delay to wait is set to `0`.
    return new Observable((subscriber) => {
      const timer = setTimeout(() => {
        subscriber.next(isLoaded);
        subscriber.complete();
      }, 0);
      return () => {
        clearTimeout(timer);
      };
    });
  }));
}
