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

import { Observable } from "rxjs/Observable";
import { IMediaKeySession } from "../../compat";
import { EncryptedMediaError } from "../../errors";
import castToObservable from "../../utils/castToObservable";
import {
  ISessionRequestEvent,
  sessionRequestEvent,
} from "./eme_events";

/**
 * Generate a request from session.
 * @param {MediaKeySession} session
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {string} sessionType
 * @returns {Observable}
 */
export default function generateKeyRequest(
  session: MediaKeySession|IMediaKeySession,
  initData: Uint8Array,
  initDataType: string
) : Observable<ISessionRequestEvent> {
  return Observable.defer(() => {
    return castToObservable(
      (session as MediaKeySession).generateRequest(initDataType, initData)
    )
      .catch((error) => {
        throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error, false);
      })
      .mapTo(
        sessionRequestEvent("generated-request", session, initData, initDataType)
      );
  });
}
