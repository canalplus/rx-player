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

import log from "../../log";
import cancellableSleep from "../../utils/cancellable_sleep";
import PPromise from "../../utils/promise";
import TaskCanceller, {
  CancellationError,
} from "../../utils/task_canceller";
import { ICustomMediaKeySession } from "./custom_media_keys";

/**
 * Close the given `MediaKeySession` and returns a Promise resolving when the
 * session is closed.
 * This promise does not reject, even if we're unable to close the
 * `MediaKeySession`.
 *
 * Note that there is a lot of browser issues linked to the impossibility to
 * either close a MediaKeySession or to know if a MediaKeySession was closed.
 * Due to this, the returned Promise might take some time before resolving on
 * some devices.
 * @param {MediaKeySession|Object} session
 * @returns {Promise.<undefined>}
 */
export default function closeSession(
  session: MediaKeySession | ICustomMediaKeySession
): Promise<void> {
  const timeoutCanceller = new TaskCanceller();

  return PPromise.race([
    session.close()
      .then(() => { timeoutCanceller.cancel(); }),
    // The `closed` promise may resolve, even if `close()` result has not
    // (seen at some point on Firefox).
    session.closed
      .then(() => { timeoutCanceller.cancel(); }),
    waitTimeoutAndCheck(),
  ]);

  /**
   * If the session is not closed after 1000ms, try to communicate with the
   * MediaKeySession and check if an error is returned.
   * This is needed because on some browsers with poor EME implementation,
   * knowing when a MediaKeySession is closed is actually a hard task.
   *
   * The returned Promise will never reject.
   * @returns {Promise.<undefined>}
   */
  async function waitTimeoutAndCheck() : Promise<void> {
    try {
      await cancellableSleep(1000, timeoutCanceller.signal);
      await tryUpdatingSession();
    } catch (err) {
      if (err instanceof CancellationError) { // cancelled == session closed
        return;
      }
      const message = err instanceof Error ?
        err.message :
        "Unknown error made it impossible to close the session";
      log.error(`DRM: ${message}`);
    }
  }

  /**
   * Try to update `MediaKeySession` and check its error if it failed.
   * If we still don't know whether it closed yet, wait a second
   * timeout then quit.
   *
   * The returned Promise resolves if the `MediaKeySession` seems closed and
   * rejects if we couldn't know or it doesn't.
   * @returns {Promise.<undefined>}
   */
  async function tryUpdatingSession() : Promise<void> {
    try {
      await session.update(new Uint8Array(1));
    } catch (err) {
      if (timeoutCanceller.isUsed) { // Reminder: cancelled == session closed
        return;
      }

      // The caught error can tell if session is closed
      // (Chrome may throw this error)
      // I know... Checking the error message is not the best practice ever.
      if (err instanceof Error &&
          err.message === "The session is already closed."
      ) {
        return;
      }

      await cancellableSleep(1000, timeoutCanceller.signal);
    }

    if (timeoutCanceller.isUsed) { // Reminder: cancelled == session closed
      return;
    }

    throw new Error("Compat: Couldn't know if session is closed");
  }
}
