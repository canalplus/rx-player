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
import { hasEMEAPIs } from "../../compat/";
import { onEncrypted$ } from "../../compat/events";
import {
  CustomError,
  EncryptedMediaError,
} from "../../errors";
import { assertInterface } from "../../utils/assert";
import log from "../../utils/log";
import noop from "../../utils/noop";
import attachMediaKeys from "./attach_media_keys";
import clearEMESession from "./clear_eme_session";
import {
  $loadedSessions,
  currentMediaKeysInfos,
  IKeySystemOption,
} from "./constants";
import createMediaKeys from "./create_media_keys";
import disposeMediaKeys from "./dispose_media_keys";
import findCompatibleKeySystem from "./find_key_system";
import generateKeyRequest from "./generate_key_request";
import handleEncryptedEvent from "./handle_encrypted_event";
import handleSessionEvents from "./handle_session_events";
import InitDataStore from "./init_data_store";

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
    // next encrypted event
    onEncrypted$(mediaElement),

    // creation of a media key, a single time
    findCompatibleKeySystem(keySystemsConfigs, currentMediaKeysInfos)
      .mergeMap((keySystemInfos) => {
        return createMediaKeys(keySystemInfos, errorStream);
      })
  )
    .mergeMap(([encryptedEvent, mediaKeysInfos], i) => {
      return Observable.merge(
        // create a new MediaKeySession if needed
        handleEncryptedEvent(encryptedEvent, handledInitData, mediaKeysInfos),

        // attach MediaKeys to the media element if we're talking about the first event
        i === 0 ?
          attachMediaKeys(mediaKeysInfos, mediaElement, currentMediaKeysInfos)
            .ignoreElements() as Observable<never> :
          Observable.empty<never>()
      );
    })
    .mergeMap((handledEncryptedEvent) =>  {
      const {
        initData,
        initDataType,
        mediaKeySession,
        keySystemOptions,
      } = handledEncryptedEvent.value;

      return Observable.merge(
        handleSessionEvents(mediaKeySession, keySystemOptions, errorStream),
        handledEncryptedEvent.type === "created-session" ?
          generateKeyRequest(mediaKeySession, initData, initDataType) :
          Observable.empty<never>()
      ).ignoreElements() as Observable<never>;
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
  currentMediaKeysInfos.$keySystemOptions = null;
  currentMediaKeysInfos.$videoElement = null;
  currentMediaKeysInfos.$mediaKeySystemConfiguration = null;
  $loadedSessions.closeAllSessions().subscribe();
}

/**
 * Returns the name of the current key system used.
 * @returns {string}
 */
function getCurrentKeySystem() : string|null {
  return currentMediaKeysInfos.$keySystemOptions &&
    currentMediaKeysInfos.$keySystemOptions.type;
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
