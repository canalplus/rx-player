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
import {
  CustomError,
  EncryptedMediaError,
} from "../../errors";
import castToObservable from "../../utils/castToObservable";
import log from "../../utils/log";
import { IKeySystemOption } from "./constants";
import { IKeySystemAccessInfos } from "./find_key_system";
import { IMediaKeysInfos } from "./get_session";
import { $storedSessions } from "./globals";
import { trySettingServerCertificate } from "./server_certificate";

/**
 * Set the license storage given in options, if one.
 * @param {Object} keySystem
 */
function setSessionStorage(keySystem: IKeySystemOption) : void {
  if (keySystem.persistentLicense) {
    if (keySystem.licenseStorage) {
      log.info("set the given license storage");
      $storedSessions.setStorage(keySystem.licenseStorage);
    } else {
      const error = new Error("no license storage found for persistent license.");
      throw new EncryptedMediaError("INVALID_KEY_SYSTEM", error, true);
    }
  }
}

/**
 * Create the right MediaKeys instance from the keySystems options given.
 *
 * Attach a server certificate to it if needed and return it.
 * @param {Array.<Object>} keySystems
 * @param {Subject} errorStream
 * @returns {Observable}
 */
export default function createMediaKeysWithKeySystemAccessInfos(
  keySystemAccessInfos : IKeySystemAccessInfos,
  errorStream : Subject<Error|CustomError>
) : Observable<IMediaKeysInfos> {
  return Observable.defer(() => {
      const {
        keySystem,
        keySystemAccess,
      } = keySystemAccessInfos;

      return castToObservable(keySystemAccess.createMediaKeys())
        .mergeMap(function prepareMediaKeysConfiguration(mediaKeys) {
          setSessionStorage(keySystem); // TODO Should be done in this function?

          const { serverCertificate } = keySystem;
          const mediaKeysInfos$ = Observable
            .of({ mediaKeys, keySystem, keySystemAccess });

          if (
            serverCertificate != null &&
            typeof mediaKeys.setServerCertificate === "function"
          ) {
            return trySettingServerCertificate(mediaKeys, serverCertificate, errorStream)
              .concat(mediaKeysInfos$);
          }

          return mediaKeysInfos$;
        });
    });
}
