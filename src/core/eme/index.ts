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
  generateKeyRequest,
  handleSessionEvents,
  IMediaKeysInfos,
  ISessionCreationEvent,
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
) : Observable<ISessionEvent> {
  if (__DEV__) {
    keySystems.forEach((ks) => assertInterface(ks, {
      getLicense: "function",
      type: "string",
    }, "keySystem"));
  }

  return createMediaKeys(keySystems, errorStream)
    .mergeMap((mediaKeysInfos) => {
      // 1 - Create or reuse session from loaded session.
      const getSession$ = onEncrypted$(video).concatMap((encryptedEvent, i) => {
          log.info("eme: encrypted event", encryptedEvent);
          if (encryptedEvent.initData == null) {
            const error = new Error("no init data found on media encrypted event.");
            throw new EncryptedMediaError("INVALID_ENCRYPTED_EVENT", error, true);
          }
          const initData = new Uint8Array(encryptedEvent.initData);
          const initDataType = encryptedEvent.initDataType;

          const getSessionInfos$ = createOrReuseSessionWithRetry(
            initData,
            initDataType,
            mediaKeysInfos
          );

          const setMediaKeys$ = i === 0 ?
            setMediaKeysObs(mediaKeysInfos, video, instanceInfos) :
            Observable.of(mediaKeysInfos);

          return Observable.merge(
            getSessionInfos$,
            setMediaKeys$.ignoreElements() as Observable<never>
          );
        }
      ).share();

      // 2 - Generate request each time a new session is created.
      const generateKeyRequest$ = getSession$
        .mergeMap((evt) => {
          const type = evt.type;
          if (
            type === "created-temporary-session" ||
            type === "created-persistent-session"
          ) {
            const {
              initData,
              initDataType,
            } = (evt as ISessionCreationEvent).value.sessionInfos;
            return generateKeyRequest(evt.value.session, initData, initDataType);
          }
          return Observable.empty<never>();
      });

      // 3 - Handle every message comming from session
      // (license update, key status message, etc)
      const handleSessionEvents$ = getSession$
        .mergeMap((sessionManagementEvents) => {
          const type = sessionManagementEvents.type;
          if (
            type === "created-temporary-session" ||
            type === "created-persistent-session"
          ) {
            const {
              initData,
            } = (sessionManagementEvents as ISessionCreationEvent).value.sessionInfos;
            return handleSessionEvents(
              sessionManagementEvents.value.session,
              mediaKeysInfos.keySystem,
              new Uint8Array(initData),
              errorStream
            );
          }
          return Observable.empty<never>();
        });

      return Observable.merge(
        getSession$,
        generateKeyRequest$,
        handleSessionEvents$
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
) :  Observable<ISessionEvent> {
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
