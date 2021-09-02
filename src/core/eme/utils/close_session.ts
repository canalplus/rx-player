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
  catchError,
  mergeMap,
  Observable,
  of as observableOf,
  take,
  tap,
  timer,
  race as observableRace,
} from "rxjs";
import {
  closeSession,
  ICustomMediaKeySession,
} from "../../../compat";
import { onKeyMessage$, onKeyStatusesChange$ } from "../../../compat/event_listeners";
import config from "../../../config";
import log from "../../../log";

const { EME_SESSION_CLOSING_MAX_RETRY,
        EME_SESSION_CLOSING_INITIAL_DELAY,
        EME_SESSION_CLOSING_MAX_DELAY } = config;

/**
 * Close a MediaKeySession with multiple attempts if needed and do not throw if
 * this action throws an error.
 * Emits then complete when done.
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
export default function safelyCloseMediaKeySession(
  mediaKeySession : MediaKeySession | ICustomMediaKeySession
) : Observable<unknown> {
  return recursivelyTryToCloseMediaKeySession(0);

  /**
   * Perform a new attempt at closing the MediaKeySession.
   * If this operation fails due to a not-"callable" (an EME term)
   * MediaKeySession, retry based on either a timer or on MediaKeySession
   * events, whichever comes first.
   * Emits then complete when done.
   * @param {number} retryNb - The attempt number starting at 0.
   * @returns {Observable}
   */
  function recursivelyTryToCloseMediaKeySession(
    retryNb : number
  ) : Observable<unknown> {
    log.debug("EME: Trying to close a MediaKeySession", mediaKeySession, retryNb);
    return closeSession(mediaKeySession).pipe(
      tap(() => { log.debug("EME: Succeeded to close MediaKeySession"); }),
      catchError((err : unknown) => {
        // Unitialized MediaKeySession may not close properly until their
        // corresponding `generateRequest` or `load` call are handled by the
        // browser.
        // In that case the EME specification tells us that the browser is
        // supposed to reject the `close` call with an InvalidStateError.
        if (!(err instanceof Error) || err.name !== "InvalidStateError" ||
            mediaKeySession.sessionId !== "")
        {
          return failToCloseSession(err);
        }

        // We will retry either:
        //   - when an event indicates that the MediaKeySession is
        //     initialized (`callable` is the proper EME term here)
        //   - after a delay, raising exponentially
        const nextRetryNb = retryNb + 1;
        if (nextRetryNb > EME_SESSION_CLOSING_MAX_RETRY) {
          return failToCloseSession(err);
        }
        const delay = Math.min(Math.pow(2, retryNb) * EME_SESSION_CLOSING_INITIAL_DELAY,
                               EME_SESSION_CLOSING_MAX_DELAY);
        log.warn("EME: attempt to close a mediaKeySession failed, " +
                 "scheduling retry...", delay);
        return observableRace([timer(delay),
                               onKeyStatusesChange$(mediaKeySession),
                               onKeyMessage$(mediaKeySession)])
          .pipe(
            take(1),
            mergeMap(() => recursivelyTryToCloseMediaKeySession(nextRetryNb)));
      }));
  }

  /**
   * Log error anouncing that we could not close the MediaKeySession and emits
   * then complete through Observable.
   * TODO Emit warning?
   * @returns {Observable}
   */
  function failToCloseSession(err : unknown) : Observable<null> {
    log.error("EME: Could not close MediaKeySession: " +
              (err instanceof Error ? err.toString() :
                                      "Unknown error"));
    return observableOf(null);
  }
}
