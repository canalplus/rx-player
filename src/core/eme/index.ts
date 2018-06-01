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
  EMPTY,
  Observable,
  Subject,
} from "rxjs";
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
import disposeMediaKeys from "./dispose_media_keys";
import generateKeyRequest from "./generate_key_request";
import getMediaKeysInfos from "./get_media_keys";
import handleEncryptedEvent from "./handle_encrypted_event";
import handleSessionEvents from "./handle_session_events";
import MediaKeysInfosStore from "./media_keys_infos_store";
import { IKeySystemOption } from "./types";
import InitDataStore from "./utils/init_data_store";

const attachedMediaKeysInfos = new MediaKeysInfosStore();

/**
 * Clear EME ressources that should be cleared when the current content stops
 * its playback.
 * @returns {Observable}
 */
function clearEMESession(mediaElement : HTMLMediaElement) : Observable<never> {
  return Observable.defer(() => {
    if (shouldUnsetMediaKeys()) {
      return disposeMediaKeys(mediaElement, attachedMediaKeysInfos)
        .ignoreElements();
    }

    const currentState = attachedMediaKeysInfos.getState(mediaElement);
    if (currentState && currentState.keySystemOptions.closeSessionsOnStop) {
      return currentState.sessionsStore.closeAllSessions()
        .ignoreElements();
    }
    return EMPTY;
  });
}

/**
 * EME abstraction and event handler used to communicate with the Content-
 * Description-Module (CDM).
 *
 * The EME handler can be given one or multiple systems and will choose the
 * appropriate one supported by the user's browser.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystems
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createEME(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[],
  errorStream: Subject<Error|CustomError>
) : Observable<never> {
  if (__DEV__) {
    keySystemsConfigs.forEach((config) => assertInterface(config, {
      getLicense: "function",
      type: "string",
    }, "keySystem"));
  }

   // Keep track of all initialization data handled here.
   // This is to avoid handling multiple times the same encrypted events.
  const handledInitData = new InitDataStore();

  return Observable.combineLatest(
    onEncrypted$(mediaElement),
    getMediaKeysInfos(
      mediaElement,
      keySystemsConfigs,
      attachedMediaKeysInfos,
      errorStream
    )
  )
    .mergeMap(([encryptedEvent, mediaKeysInfos], i) => {
      return Observable.merge(
        // create a new MediaKeySession if needed
        handleEncryptedEvent(encryptedEvent, handledInitData, mediaKeysInfos)
          .map((evt) => ({
            type: evt.type,
            value: {
              initData: evt.value.initData,
              initDataType: evt.value.initDataType,
              mediaKeySession: evt.value.mediaKeySession,
              sessionType: evt.value.sessionType,
              keySystemOptions: mediaKeysInfos.keySystemOptions,
              sessionStorage: mediaKeysInfos.sessionStorage,
            },
          })),

        // attach MediaKeys if we're handling the first event
        i === 0 ?
          attachMediaKeys(mediaKeysInfos, mediaElement, attachedMediaKeysInfos)
            .ignoreElements() :
          EMPTY
      );
    })
    .mergeMap((handledEncryptedEvent) =>  {
      const {
        initData,
        initDataType,
        mediaKeySession,
        sessionType,
        keySystemOptions,
        sessionStorage,
      } = handledEncryptedEvent.value;

      return Observable.merge(
        handleSessionEvents(mediaKeySession, keySystemOptions, errorStream),

        // only perform generate request on new sessions
        handledEncryptedEvent.type === "created-session" ?
          generateKeyRequest(mediaKeySession, initData, initDataType)
            .do(() => {
              if (sessionType === "persistent-license" && sessionStorage != null) {
                sessionStorage.add(initData, initDataType, mediaKeySession);
              }
            }) :
          EMPTY
      ).ignoreElements();
    });
}

/**
 * Free up all ressources taken by the EME management.
 */
function disposeEME(mediaElement : HTMLMediaElement) : void {
  disposeMediaKeys(mediaElement, attachedMediaKeysInfos).subscribe(noop);
}

/**
 * Returns the name of the current key system used.
 * @returns {string}
 */
function getCurrentKeySystem(mediaElement : HTMLMediaElement) : string|null {
  const currentState = attachedMediaKeysInfos.getState(mediaElement);
  return currentState && currentState.keySystemOptions.type;
}

/**
 * Perform EME management if needed.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystems
 * @param {Subject} errorStream
 * @returns {Observable}
 */
export default function EMEManager(
  mediaElement : HTMLMediaElement,
  keySystems : IKeySystemOption[],
  errorStream : Subject<Error|CustomError>
) :  Observable<never> {
  if (keySystems && keySystems.length) {
    if (!hasEMEAPIs()) {
      return onEncrypted$(mediaElement).map(() => {
        log.error("eme: encrypted event but no EME API available");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
      });
    }
    return createEME(mediaElement, keySystems, errorStream);
  } else {
    return onEncrypted$(mediaElement).map(() => {
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
