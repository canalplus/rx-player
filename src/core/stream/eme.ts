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
import { Subject } from "rxjs/Subject";
import EncryptedMediaError from "../../errors/EncryptedMediaError";
import log from "../../utils/log";
import { IError } from "../../utils/retry";
import { onEncrypted$ } from "../../compat/events";
import { createEME } from "../eme";

// XXX TODO DRY this with EME part?
interface ILicenseStorageData {
  sessionId : string;
  initData : number;
}

// XXX TODO DRY this with EME part?
interface ILicenseStorageOption {
  load() : ILicenseStorageData[];
  save(x : ILicenseStorageData[]) : void;
}

// XXX TODO
interface IKeySystemOption {
  type : string;
  getLicense : (message : Uint8Array, messageType : string)
    => Promise<BufferSource>|BufferSource;
  serverCertificate? : BufferSource;
  persistentLicense? : boolean;
  licenseStorage? : ILicenseStorageOption;
  persistentStateRequired? : boolean;
  distinctiveIdentifierRequired? : boolean;
  onKeyStatusesChange? : (evt : Event, session : MediaKeySession)
    => Promise<BufferSource>|BufferSource;
}

/**
 * Perform EME management if needed.
 * @param {HTMLMediaElement} videoElement
 * @param {Array.<Object>} [keySystems]
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createEMEIfKeySystems(
  videoElement : HTMLMediaElement,
  keySystems : IKeySystemOption[],
  errorStream : Subject<Error|IError>
) : Observable<any> { // XXX TODO
  if (keySystems && keySystems.length) {
    return createEME(videoElement, keySystems, errorStream);
  } else {
    return onEncrypted$(videoElement).map(() => {
      log.error("eme: ciphered media and no keySystem passed");
      throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
    });
  }
}

export default createEMEIfKeySystems;
