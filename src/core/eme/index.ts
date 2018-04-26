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
  hasEMEAPIs,
  shouldUnsetMediaKeys,
} from "../../compat/";
import { onEncrypted$ } from "../../compat/events";
import {
  CustomError,
  EncryptedMediaError,
} from "../../errors";
import { assertInterface } from "../../utils/assert";
import log from "../../utils/log";
import noop from "../../utils/noop";
import attachMediaKeys from "./attach_media_keys";
import {
  ICurrentMediaKeysInfos,
  IKeySystemOption,
} from "./constants";
import createMediaKeys from "./create_media_keys";
import disposeMediaKeys from "./dispose_media_keys";
import findCompatibleKeySystem from "./find_key_system";
import { $loadedSessions } from "./globals";
import {
  createOrReuseSessionWithRetry,
  generateKeyRequest,
  handleSessionEvents,
  IMediaKeysInfos,
  ISessionEvent,
} from "./session";
import { InMemorySessionsSet } from "./sessions_set";

// Persisted singleton instance of MediaKeys. We do not allow multiple
// CDM instances.
const currentMediaKeysInfos : ICurrentMediaKeysInfos = {
  $mediaKeys: null,  // MediaKeys instance
  $mediaKeySystemConfiguration: null, // active MediaKeySystemConfiguration
  $keySystem: null,
  $videoElement: null,
};

/**
 * Create or reuse a MediaKeySession for the EncryptedEvent.
 * @param {MediaEncryptedEvent} encryptedEvent
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
function getSessionForEncryptedEvent(
  initData : Uint8Array,
  initDataType : string,
  mediaKeysInfos : IMediaKeysInfos,
  $contentSessions : InMemorySessionsSet
) : Observable<any> /* XXX TODO */ {
  log.info("eme: encrypted event", initData, initDataType);

  const currentSession = $contentSessions.get(initData, initDataType);
  if (currentSession) {
    return Observable.empty();
  }
  return createOrReuseSessionWithRetry(initData, initDataType, mediaKeysInfos)
    .map((evt) => {
      return {
        type: evt.type,
        keySystemConfiguration: mediaKeysInfos.keySystem,
        initData,
        initDataType,
        mediaKeySession: evt.value.session,
      };
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
 */
function createEME(
  video : HTMLMediaElement,
  keySystemOptions: IKeySystemOption[],
  errorStream: Subject<Error|CustomError>
) : Observable<ISessionEvent> {
  if (__DEV__) {
    keySystemOptions.forEach((option) => assertInterface(option, {
      getLicense: "function",
      type: "string",
    }, "keySystem"));
  }

  const $contentSessions = new InMemorySessionsSet();

  return Observable.combineLatest(
    onEncrypted$(video),
    findCompatibleKeySystem(keySystemOptions, currentMediaKeysInfos)
      .mergeMap((keySystemInfos) => createMediaKeys(keySystemInfos, errorStream))
  )
    .concatMap(([encryptedEvent, mediaKeysInfos], i) => {
      if (encryptedEvent.initData == null) {
        const error = new Error("no init data found on media encrypted event.");
        throw new EncryptedMediaError("INVALID_ENCRYPTED_EVENT", error, true);
      }

      const initData = new Uint8Array(encryptedEvent.initData);
      const { initDataType } = encryptedEvent;

      const sessionInfos$ = !$contentSessions.get(initData, initDataType) ?
        getSessionForEncryptedEvent(
          initData,
          initDataType,
          mediaKeysInfos,
          $contentSessions
        ).do((sessionInfos) => {
          $contentSessions.add(
            initData,
            initDataType,
            sessionInfos.mediaKeySession
          );
        }) :
        Observable.empty();

      return Observable.merge(
        sessionInfos$,
        i === 0 ?
          attachMediaKeys(mediaKeysInfos, video, currentMediaKeysInfos).ignoreElements() :
          Observable.empty()
      );
    }
    )
    /**
     * While the chosen session is the same ( Same ID for both lasts sessions,
     * Sames keyStatuses), we do not continue EME workflow.
     */
    .mergeMap((sessionInfos) =>  {
      const {
        mediaKeySession,
        keySystemConfiguration,
      } = sessionInfos;

      return Observable.merge(
        Observable.of(sessionInfos),
        handleSessionEvents(
          mediaKeySession,
          keySystemConfiguration,
          errorStream
        ).ignoreElements()
      );
    }).concatMap((sessionInfos) => {
      const {
        initData,
        initDataType,
        mediaKeySession,
      } = sessionInfos;

      const isSessionCreated = sessionInfos.type.match(/^created(.*?)/);
      return (isSessionCreated !== null) ?
        generateKeyRequest(mediaKeySession, initData, initDataType) :
        Observable.empty<never>();
    }).finally(() => {
      $contentSessions.closeAllSessions();
    });
}

/**
 * Free up all ressources taken by the EME management.
 */
function disposeEME() : void {
  // Remove MediaKey before to prevent MediaKey error
  // if other instance is creating after disposeEME
  disposeMediaKeys(currentMediaKeysInfos.$videoElement).subscribe(noop);
  currentMediaKeysInfos.$mediaKeys = null;
  currentMediaKeysInfos.$keySystem = null;
  currentMediaKeysInfos.$videoElement = null;
  currentMediaKeysInfos.$mediaKeySystemConfiguration = null;
  $loadedSessions.closeAllSessions().subscribe();
}

/**
 * Clear EME ressources as the current content stops its playback.
 */
function clearEMESession() : Observable<never> {
  return Observable.defer(() => {
    const observablesArray : Array<Observable<never>> = [];
    if (currentMediaKeysInfos.$videoElement && shouldUnsetMediaKeys()) {
      const obs$ = disposeMediaKeys(currentMediaKeysInfos.$videoElement)
        .ignoreElements()
        .finally(() => {
          currentMediaKeysInfos.$videoElement = null;
        }) as Observable<never>;
      observablesArray.push(obs$);
    }
    if (
      currentMediaKeysInfos.$keySystem &&
      currentMediaKeysInfos.$keySystem.closeSessionsOnStop
    ) {
      observablesArray.push(
        $loadedSessions.closeAllSessions()
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
  return currentMediaKeysInfos.$keySystem && currentMediaKeysInfos.$keySystem.type;
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
  errorStream : Subject<Error|CustomError>
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
  IKeySystemOption,
  clearEMESession,
  disposeEME,
  getCurrentKeySystem,
};
