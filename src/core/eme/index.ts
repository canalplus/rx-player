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

import log from "../../utils/log";
import castToObservable from "../../utils/castToObservable";
import assert from "../../utils/assert";

import { shouldUnsetMediaKeys } from "../../compat/";
import { onEncrypted$ } from "../../compat/events";

import { IPersistedSessionStorage } from "./sessions_set/persisted";
import {
  IInstanceInfo,
  IKeySystemPackage,
 } from "./key_system";
import {
  IEMEMessage,
  ErrorStream,
 } from "./session";

import {
  $storedSessions,
  $loadedSessions,
} from "./globals";
import { trySettingServerCertificate } from "./server_certificate";
import setMediaKeysObs, { disposeMediaKeys } from "./set_media_keys";
import manageSessionCreation from "./session";
import findCompatibleKeySystem, { getKeySystem } from "./key_system";

import { EncryptedMediaError } from "../../errors";

interface IKeySystemOption {
  type : string;
  getLicense : (message : Uint8Array, messageType : string)
    => Promise<BufferSource>|BufferSource;
  serverCertificate? : BufferSource;
  persistentLicense? : boolean;
  licenseStorage? : IPersistedSessionStorage;
  persistentStateRequired? : boolean;
  distinctiveIdentifierRequired? : boolean;
  onKeyStatusesChange? : (evt : Event, session : MediaKeySession)
    => Promise<BufferSource>|BufferSource;
  videoRobustnesses?: Array<string|undefined>;
  audioRobustnesses?: Array<string|undefined>;
}

// Persisted singleton instance of MediaKeys. We do not allow multiple
// CDM instances.
const instanceInfos: IInstanceInfo = {
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
  keySystemAccess : MediaKeySystemAccess
) : Observable<MediaKeys> {
  // MediaKeySystemAccess.prototype.createMediaKeys returns a promise
  return castToObservable<MediaKeys>(keySystemAccess.createMediaKeys());
}

/**
 * Function triggered when both:
 *   - the ``encrypted`` event has been received.
 *   - a compatible key system configuration has been found.
 *
 * Calls all subsequent EME APIs.
 * @param {MediaEncryptedEvent} encryptedEvent
 * @param {Object} compatibleKeySystem
 * @param {MediaKeySystemAccess} compatibleKeySystem.keySystemAccess
 * @param {Object} compatibleKeySystem.keySystem - config given by the user
 * @returns {Observable}
 */
function handleEncryptedEvents(
  encryptedEvent : MediaEncryptedEvent,
  keySystemInfo: IKeySystemPackage,
  video : HTMLMediaElement,
  errorStream: ErrorStream
): Observable<MediaKeys|IEMEMessage|Event> {
  const { keySystem, keySystemAccess } = keySystemInfo;
  if (keySystem.persistentLicense) {
    if (keySystem.licenseStorage) {
      $storedSessions.setStorage(keySystem.licenseStorage);
    } else {
      const error = new Error("no license storage found for persistent license.");
      throw new EncryptedMediaError("INVALID_KEY_SYSTEM", error, true);
    }
  }

  log.info("eme: encrypted event", encryptedEvent);
  return createMediaKeysObs(keySystemAccess).mergeMap((mediaKeys) => {
    // set server certificate if set in API
    const { serverCertificate } = keySystem;
    const setCertificate$ = (serverCertificate &&
      typeof mediaKeys.setServerCertificate === "function" ?
        trySettingServerCertificate(
          mediaKeys, serverCertificate, errorStream) :
      Observable.empty()) as Observable<never>; // Typescript hack

    const mksConfig = keySystemAccess.getConfiguration();

    const setMediaKeys$ = setMediaKeysObs(
      mediaKeys, mksConfig, video, keySystem, instanceInfos);
    if (encryptedEvent.initData) {
      const initData = new Uint8Array(encryptedEvent.initData);
      const manageSessionCreation$ = manageSessionCreation(
        mediaKeys, mksConfig, keySystem, encryptedEvent.initDataType,
        initData, errorStream);

      return setCertificate$
        .concat(Observable.merge(setMediaKeys$, manageSessionCreation$));
    } else {
      const error = new Error("no init data found on media encrypted event.");
      throw new EncryptedMediaError("INVALID_ENCRYPTED_EVENT", error, true);
    }
  });
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
) : Observable<MediaKeys|IEMEMessage|Event> {
  if (__DEV__) {
    keySystems.forEach((ks) => assert.iface(ks, "keySystem", {
      getLicense: "function",
      type: "string",
    }));
  }

  return Observable.combineLatest(
    onEncrypted$(video), // wait for "encrypted" event
    findCompatibleKeySystem(keySystems, instanceInfos)
  )
    .take(1)
    .mergeMap(([evt, ks] : [MediaEncryptedEvent, IKeySystemPackage]) => {
      return handleEncryptedEvents(evt, ks, video, errorStream);
    });
}

/**
 * Free up all ressources taken by the EME management.
 */
function dispose() : void {
  // Remove MediaKey before to prevent MediaKey error
  // if other instance is creating after dispose
  disposeMediaKeys(instanceInfos.$videoElement).subscribe(() => {});
  instanceInfos.$mediaKeys = null;
  instanceInfos.$keySystem = null;
  instanceInfos.$videoElement = null;
  instanceInfos.$mediaKeySystemConfiguration = null;
  $loadedSessions.dispose();
}

/**
 * Clear EME ressources as the current content stops its playback.
 */
function clearEME(): Observable<MediaKeys> {
  return Observable.defer(() => {
    if (instanceInfos.$videoElement && shouldUnsetMediaKeys()) {
      return disposeMediaKeys(instanceInfos.$videoElement)
        .finally(() => {
          instanceInfos.$videoElement = null;
        });
    }
    return Observable.empty();
  });
}

/**
 * Returns the name of the current key system used.
 * @returns {string}
 */
function getCurrentKeySystem() : string|null {
  return getKeySystem(instanceInfos);
}

export {
  createEME,
  clearEME,
  getCurrentKeySystem,
  dispose,
  IKeySystemOption,
  ErrorStream,
};
