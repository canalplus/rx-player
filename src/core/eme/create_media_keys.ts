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
import {
  IKeySystemAccessInfos,
  // IKeySystemOption,
  IMediaKeysInfos,
} from "./constants";
import { trySettingServerCertificate } from "./set_server_certificate";
import PersistedSessionsStore from "./utils/persisted_session_store";

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
        keySystemOptions,
        keySystemAccess,
      } = keySystemAccessInfos;

      return castToObservable(keySystemAccess.createMediaKeys())
        .mergeMap(function prepareMediaKeysConfiguration(mediaKeys) {

          let sessionStorage : PersistedSessionsStore|null;
          if (keySystemOptions.persistentLicense) {
            const { licenseStorage } = keySystemOptions;
            if (licenseStorage) {
              log.info("set the given license storage");
              sessionStorage = new PersistedSessionsStore(licenseStorage);
            } else {
              const error =
                new Error("no license storage found for persistent license.");
              throw new EncryptedMediaError("INVALID_KEY_SYSTEM", error, true);
            }
          } else {
            sessionStorage = null;
          }

          const { serverCertificate } = keySystemOptions;
          const mediaKeysInfos$ = Observable
            .of({ mediaKeys, keySystemOptions, keySystemAccess, sessionStorage });

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
