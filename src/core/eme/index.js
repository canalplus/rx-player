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
import castToObservable from "../../utils/castToObservable.js";
import assert from "../../utils/assert";

import { onEncrypted$ } from "../../compat/events.js";

import {
  $storedSessions,
  $loadedSessions,
} from "./globals.js";
import { trySettingServerCertificate } from "./server_certificate.js";
import setMediaKeysObs, { disposeMediaKeys } from "./set_media_keys.js";
import manageSessionCreation from "./session.js";
import findCompatibleKeySystem, { getKeySystem } from "./key_system.js";

// Persisted singleton instance of MediaKeys. We do not allow multiple
// CDM instances.
const instanceInfos = {
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
function createMediaKeysObs(keySystemAccess) {
  // MediaKeySystemAccess.prototype.createMediaKeys returns a promise
  return castToObservable(keySystemAccess.createMediaKeys());
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
function handleEncryptedEvents(encryptedEvent, {
  keySystem,
  keySystemAccess,
}, video, errorStream) {
  if (keySystem.persistentLicense) {
    $storedSessions.setStorage(keySystem.licenseStorage);
  }

  log.info("eme: encrypted event", encryptedEvent);
  return createMediaKeysObs(keySystemAccess).mergeMap((mediaKeys) => {
    // set server certificate if set in API
    const { serverCertificate } = keySystem;
    const setCertificate$ = serverCertificate &&
      typeof mediaKeys.setServerCertificate === "function" ?
        trySettingServerCertificate(
          mediaKeys, serverCertificate, errorStream) :
      Observable.empty();

    const mksConfig = keySystemAccess.getConfiguration();

    const setMediaKeys$ = setMediaKeysObs(
      mediaKeys, mksConfig, video, keySystem, instanceInfos);

    const initData = new Uint8Array(encryptedEvent.initData);
    const manageSessionCreation$ = manageSessionCreation(
      mediaKeys, mksConfig, keySystem, encryptedEvent.initDataType,
      initData, errorStream);

    return setCertificate$
      .concat(Observable.merge(setMediaKeys$, manageSessionCreation$));
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
function createEME(video, keySystems, errorStream) {
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
    .mergeMap(([evt, ks]) => {
      return handleEncryptedEvents(evt, ks, video, errorStream);
    });
}

/**
 * Free up all ressources taken by the EME management.
 */
function dispose() {
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
 * Returns the name of the current key system used.
 * @returns {string}
 */
function getCurrentKeySystem() {
  return getKeySystem(instanceInfos);
}

export {
  createEME,
  getCurrentKeySystem,
  dispose,
};
