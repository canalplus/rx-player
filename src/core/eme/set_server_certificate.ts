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
  EMPTY,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  ignoreElements,
} from "rxjs/operators";
import { ICustomMediaKeys } from "../../compat";
import {
  EncryptedMediaError,
} from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import {
  IEMEWarningEvent,
  TypedArray,
} from "./types";

/**
 * Call the setServerCertificate API with the given certificate.
 * Complete when worked, throw when failed.
 *
 * TODO Manage success?
 * From the spec:
 *   - setServerCertificate resolves with true if everything worked
 *   - it resolves with false if the CDM does not support server
 *     certificates.
 *
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Observable}
 */
function setServerCertificate(
  mediaKeys : ICustomMediaKeys|MediaKeys,
  serverCertificate : ArrayBuffer|TypedArray
) : Observable<unknown> {
  return observableDefer(() => {
    return castToObservable(
      (mediaKeys as MediaKeys).setServerCertificate(serverCertificate)
    ).pipe(catchError((error: Error) => {
      log.warn("EME: mediaKeys.setServerCertificate returned an error", error);
      throw new EncryptedMediaError("LICENSE_SERVER_CERTIFICATE_ERROR",
                                    error.toString());
    }));
  });
}

/**
 * Call the setCertificate API. If it fails just emit the error as warning
 * and complete.
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Observable}
 */
export default function trySettingServerCertificate(
  mediaKeys : ICustomMediaKeys|MediaKeys,
  serverCertificate : ArrayBuffer|TypedArray
) : Observable<IEMEWarningEvent> {
  if (typeof mediaKeys.setServerCertificate === "function") {
    log.debug("EME: Setting server certificate on the MediaKeys");
    return setServerCertificate(mediaKeys, serverCertificate).pipe(
      ignoreElements(),
      catchError(error => {
        return observableOf({ type: "warning" as "warning", value: error });
      }));
  }
  log.warn("EME: Could not set the server certificate." +
           " mediaKeys.setServerCertificate is not a function");
  return EMPTY;
}

export {
  trySettingServerCertificate,
  setServerCertificate,
};
