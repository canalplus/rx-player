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
import { assertInterface } from "../../utils/assert";
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
} from "./key_system";
import { trySettingServerCertificate } from "./server_certificate";
import {
  createOrReuseSessionWithRetry,
  ErrorStream,
  handleSessionEvents,
  IMediaKeysInfos,
  ISessionEvent,
} from "./session";
import hashInitData from "./sessions_set/hash_init_data";
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
function createMediaKeys(
  keySystems : IKeySystemOption[],
  errorStream : ErrorStream
) : Observable<IMediaKeysInfos> {
  return findCompatibleKeySystem(keySystems, instanceInfos)
    .mergeMap((keySystemAccessInfos) => {
      const {
        keySystem,
        keySystemAccess,
      } = keySystemAccessInfos;
      return createMediaKeysObs(keySystemAccess)
        .mergeMap(function prepareMediaKeysConfiguration(mediaKeys) {
          setSessionStorage(keySystem); // TODO Should be done in this function?

          const { serverCertificate } = keySystem;
          const _mediaKeysInfos$ = Observable
            .of({ mediaKeys, keySystem, keySystemAccess });

          if (
            serverCertificate != null &&
            typeof mediaKeys.setServerCertificate === "function"
          ) {
            return trySettingServerCertificate(mediaKeys, serverCertificate, errorStream)
              .concat(_mediaKeysInfos$);
          }

          return _mediaKeysInfos$;
        });
    });
}

/**
 * EME abstraction and event handler used to communicate with the Content-
 * Description-Module (CDM).
 *
 * The EME handler can be given one or multiple systems and will choose the
 * appropriate one supported by the user's browser.
 * @param {HTMLMediaElement} video
 * @param {Array.<Object>} keySystems
 * @param {Subject} errorStream
 * @returns {Observable}
 * TODO we should not return raw events, but document each one which can be
 * returned.
 */
function createEME(
  video : HTMLMediaElement,
  keySystems: IKeySystemOption[],
  errorStream: ErrorStream
) : Observable<ISessionEvent|Event> {
  if (__DEV__) {
    keySystems.forEach((ks) => assertInterface(ks, {
      getLicense: "function",
      type: "string",
    }, "keySystem"));
  }

  /**
   * Encrypted events may be distinct until initData changes.
   * It is usefull to trigger session creation on two consecutive init datas.
   *
   * @type {Observable}
   */
  const encrypted$ = onEncrypted$(video)
    .distinctUntilChanged(function isSameEncryptedEvent(prevEvt, evt) {
      if (
        evt.initData == null || prevEvt.initData == null ||
        evt.initDataType !== prevEvt.initDataType
      ) {

        return false;
      }
      const evtHash = hashInitData(new Uint8Array(evt.initData));
      const prevHash = hashInitData(new Uint8Array(prevEvt.initData));
      return evtHash === prevHash;
    });

  // Create or get cached session.
  return  Observable.combineLatest(
    encrypted$,
    createMediaKeys(keySystems, errorStream)
  ).concatMap(
    ([encryptedEvent, mediaKeysInfos]) => {
      log.info("eme: encrypted event", encryptedEvent);

      if (encryptedEvent.initData == null) {
        const error = new Error("no init data found on media encrypted event.");
        throw new EncryptedMediaError("INVALID_ENCRYPTED_EVENT", error, true);
      }

      const sessionEvents = createOrReuseSessionWithRetry(
        encryptedEvent,
        mediaKeysInfos
      );

      return Observable.combineLatest(
        sessionEvents,
        Observable.of(encryptedEvent),
        Observable.of(mediaKeysInfos)
      );
    }
  // Handle events from created session
  ).mergeMap((
      [sessionEvent, encryptedEvent, mediaKeysInfos]:
        [ISessionEvent, MediaEncryptedEvent, IMediaKeysInfos],
      i: number
    ) => {
      const setMediaKeys$ = i === 0 ?
        setMediaKeysObs(mediaKeysInfos, video, instanceInfos) :
        Observable.empty();

      const sessionEvents$ = sessionEvent.value.name === "reuse-session" ?
        Observable.of(sessionEvent) :
        handleSessionEvents(
          sessionEvent.value.session,
          mediaKeysInfos.keySystem,
          new Uint8Array(encryptedEvent.initData as ArrayBuffer),
          errorStream
        ).startWith(sessionEvent);

      return Observable.merge(
        setMediaKeys$.ignoreElements() as Observable<never>,
        sessionEvents$
      );
    });
}

/**
 * Free up all ressources taken by the EME management.
 */
function disposeEME() : void {
  // Remove MediaKey before to prevent MediaKey error
  // if other instance is creating after disposeEME
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
function clearEMESession(): Observable<never> {
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
) :  Observable<ISessionEvent|Event> {
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
  ErrorStream,
  IKeySystemOption,
  clearEMESession,
  createEME,
  disposeEME,
  getCurrentKeySystem,
};
