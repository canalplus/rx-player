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
import {
  hasEMEAPIs,
  IMediaKeySystemAccess,
  IMockMediaKeys,
  shouldUnsetMediaKeys,
} from "../../compat/";
import { onEncrypted$ } from "../../compat/events";
import { EncryptedMediaError } from "../../errors";
import assert from "../../utils/assert";
import castToObservable from "../../utils/castToObservable";
import log from "../../utils/log";
import noop from "../../utils/noop";
import {
  $loadedSessions,
  $storedSessions,
} from "./globals";
import findCompatibleKeySystem, {
  getKeySystem,
  IInstanceInfo,
  IKeySystemOption,
  IKeySystemPackage,
 } from "./key_system";
import { trySettingServerCertificate } from "./server_certificate";
import manageSessionCreation, {
  ErrorStream,
  ISessionEvent,
 } from "./session";
import setMediaKeysObs, { disposeMediaKeys } from "./set_media_keys";

// Persisted singleton instance of MediaKeys. We do not allow multiple
// CDM instances.
const instanceInfos : IInstanceInfo = {
  $mediaKeys: null,  // MediaKeys instance
  $mediaKeySystemConfiguration: null, // active MediaKeySystemConfiguration
  $keySystem: null,
  $videoElement: null,
};

/**
 * Call the createMediaKeys API and cast it to an observable.
 * @param {MediaKeySystemAccess} keySystemAccess
 * @returns {Observable}
 */
function createMediaKeysObs(
  keySystemAccess : IMediaKeySystemAccess
) : Observable<IMockMediaKeys|MediaKeys> {
  return Observable.defer(() => {
  // MediaKeySystemAccess.prototype.createMediaKeys returns a promise
    return castToObservable(keySystemAccess.createMediaKeys());
  });
}

/**
 * Set the session storage given in options, if one.
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
 * Function triggered when both:
 *   - An ``encrypted`` event has been received.
 *   - a compatible key system configuration has been found.
 *
 * Manage session creation through all subsequent EME APIs.
 * @param {MediaEncryptedEvent} encryptedEvent
 * @param {Object} keySystemInfo
 * @param {HTMLMediaElement} video
 * @param {Subject} ErrorStream
 * @param {Observable} mediaKeys$
 * @returns {Observable}
 */
function handleEncryptedEvent(
  encryptedEvent : MediaEncryptedEvent,
  mediaKeys : IMockMediaKeys|MediaKeys,
  keySystemInfo : IKeySystemPackage,
  video : HTMLMediaElement,
  errorStream : ErrorStream
): Observable<IMockMediaKeys|MediaKeys|ISessionEvent|Event> {
  log.info("eme: encrypted event", encryptedEvent);

  if (encryptedEvent.initData == null) {
    const error = new Error("no init data found on media encrypted event.");
    throw new EncryptedMediaError("INVALID_ENCRYPTED_EVENT", error, true);
  }

  const {
    keySystem,
    keySystemAccess,
  } = keySystemInfo;

  setSessionStorage(keySystem);

  const initData = new Uint8Array(encryptedEvent.initData);
  const mksConfig = keySystemAccess.getConfiguration();
  const setMediaKeys$ =
  setMediaKeysObs(mediaKeys, mksConfig, video, keySystem, instanceInfos);
  const manageSessionCreation$ = manageSessionCreation(
    mediaKeys, mksConfig, keySystem, encryptedEvent.initDataType,
    initData, errorStream);

  const { serverCertificate } = keySystem;
  if (
    serverCertificate != null &&
    typeof mediaKeys.setServerCertificate === "function"
  ) {
    return trySettingServerCertificate(mediaKeys, serverCertificate, errorStream)
      .concat(Observable.merge(setMediaKeys$, manageSessionCreation$));
  }
  return Observable.merge(setMediaKeys$, manageSessionCreation$);
}

/**
 * EME abstraction and event handler used to communicate with the Content-
 * Description-Module (CDM).
 *
 * The EME handler can be given one or multiple systems and will choose the
 * appropriate one supported by the user's browser.
 * @param {HTMLMediaElement} video
 * @param {Object} keySystems
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createEME(
  video : HTMLMediaElement,
  keySystems: IKeySystemOption[],
  errorStream: ErrorStream
) : Observable<IMockMediaKeys|MediaKeys|ISessionEvent|Event> {
  if (__DEV__) {
    keySystems.forEach((ks) => assert.iface(ks, "keySystem", {
      getLicense: "function",
      type: "string",
    }));
  }

  return Observable.combineLatest(
    onEncrypted$(video).take(1),
    findCompatibleKeySystem(keySystems, instanceInfos)
  ).mergeMap(([
    firstEncryptedEvent,
    keySystemInfos,
  ] : [MediaEncryptedEvent, IKeySystemPackage]) => {
    const mediaKeys$ = createMediaKeysObs(keySystemInfos.keySystemAccess);

    return mediaKeys$
      .mergeMap((mediaKeys) => {
        const handleCurrentEncryptedEvent$ = handleEncryptedEvent(
          firstEncryptedEvent, mediaKeys, keySystemInfos, video, errorStream);

        const handleSubsequentEncryptedEvent$ = onEncrypted$(video)
          .mergeMap((encryptedEvent) => {
            return handleEncryptedEvent(
              encryptedEvent, mediaKeys, keySystemInfos, video, errorStream);
          });

        return Observable.merge(
          handleCurrentEncryptedEvent$,
          handleSubsequentEncryptedEvent$
        );
      });
    });
}

/**
 * Free up all ressources taken by the EME management.
 */
function dispose() : void {
  // Remove MediaKey before to prevent MediaKey error
  // if other instance is creating after dispose
  disposeMediaKeys(instanceInfos.$videoElement).subscribe(noop);
  instanceInfos.$mediaKeys = null;
  instanceInfos.$keySystem = null;
  instanceInfos.$videoElement = null;
  instanceInfos.$mediaKeySystemConfiguration = null;
  $loadedSessions.dispose();
}

/**
 * Clear EME ressources as the current content stops its playback.
 */
function clearEME(): Observable<never> {
  return Observable.defer(() => {
    const observablesArray : Array<Observable<never>> = [];
    if (instanceInfos.$videoElement && shouldUnsetMediaKeys()) {
      const obs$ = disposeMediaKeys(instanceInfos.$videoElement)
        .ignoreElements()
        .finally(() => {
          instanceInfos.$videoElement = null;
        }) as Observable<never>;
      observablesArray.push(obs$);
    }
    if (instanceInfos.$keySystem && instanceInfos.$keySystem.closeSessionsOnStop) {
      observablesArray.push(
        $loadedSessions.dispose()
          .ignoreElements() as Observable<never>
      );
    }
    return observablesArray.length ?
      Observable.merge(...observablesArray) : Observable.empty();
  });
}

/**
 * Returns the name of the current key system used.
 * @returns {string}
 */
function getCurrentKeySystem() : string|null {
  return getKeySystem(instanceInfos);
}

/**
 * Perform EME management if needed.
 * @param {HTMLMediaElement} videoElement
 * @param {Array.<Object>} keySystems
 * @param {Subject} errorStream
 * @returns {Observable}
 */
export default function EMEManager(
  videoElement : HTMLMediaElement,
  keySystems : IKeySystemOption[],
  errorStream : ErrorStream
) :  Observable<IMockMediaKeys|MediaKeys|ISessionEvent|Event> {
  if (keySystems && keySystems.length) {
    if (!hasEMEAPIs()) {
      return onEncrypted$(videoElement).map(() => {
        log.error("eme: encrypted event but no EME API available");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
      });
    }
    return createEME(videoElement, keySystems, errorStream);
  } else {
    return onEncrypted$(videoElement).map(() => {
      log.error("eme: ciphered media and no keySystem passed");
      throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
    });
  }
}

export {
  createEME,
  clearEME,
  getCurrentKeySystem,
  dispose,
  IKeySystemOption,
  ErrorStream,
};
