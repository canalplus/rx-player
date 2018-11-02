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
} from "rxjs";
import {
  catchError,
  mapTo,
} from "rxjs/operators";
import { ICustomMediaKeySession } from "../../compat";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/castToObservable";

/**
 * Generate a request from session.
 * @param {MediaKeySession} session
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {string} sessionType
 * @returns {Observable}
 */
export default function generateKeyRequest(
  session: MediaKeySession|ICustomMediaKeySession,
  initData: Uint8Array,
  initDataType: string|undefined
) : Observable<null> {
  return observableDefer(() => {
    log.debug("EME: Calling generateRequest on the MediaKeySession");
    return castToObservable(
      session.generateRequest(initDataType || "", initData)
    ).pipe(
      catchError((error) => {
        throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error, false);
      }),
      mapTo(null)
    );
  });
}
