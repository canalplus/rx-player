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

/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import {
  combineLatest as observableCombineLatest,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  ignoreElements,
  map,
  mergeMap,
  tap,
} from "rxjs/operators";
import { shouldUnsetMediaKeys } from "../../compat/";
import { onEncrypted$ } from "../../compat/events";
import { assertInterface } from "../../utils/assert";
import noop from "../../utils/noop";
import attachMediaKeys from "./attach_media_keys";
import disposeMediaKeys from "./dispose_media_keys";
import generateKeyRequest from "./generate_key_request";
import getMediaKeysInfos from "./get_media_keys";
import handleEncryptedEvent from "./handle_encrypted_event";
import handleSessionEvents from "./handle_session_events";
import MediaKeysInfosStore from "./media_keys_infos_store";
import {
  IEMEWarningEvent,
  IKeySystemOption,
} from "./types";
import InitDataStore from "./utils/init_data_store";

const attachedMediaKeysInfos = new MediaKeysInfosStore();

/**
 * Clear EME ressources that should be cleared when the current content stops
 * its playback.
 * @returns {Observable}
 */
function clearEMESession(mediaElement : HTMLMediaElement) : Observable<never> {
  return observableDefer(() => {
    if (shouldUnsetMediaKeys()) {
      return disposeMediaKeys(mediaElement, attachedMediaKeysInfos)
        .pipe(ignoreElements());
    }

    const currentState = attachedMediaKeysInfos.getState(mediaElement);
    if (currentState && currentState.keySystemOptions.closeSessionsOnStop) {
      return currentState.sessionsStore.closeAllSessions()
        .pipe(ignoreElements());
    }
    return EMPTY;
  });
}

// TODO More events
export type IEMEManagerEvent =
  IEMEWarningEvent;

/**
 * EME abstraction and event handler used to communicate with the Content-
 * Description-Module (CDM).
 *
 * The EME handler can be given one or multiple systems and will choose the
 * appropriate one supported by the user's browser.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystems
 * @returns {Observable}
 */
export default function EMEManager(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[]
) : Observable<IEMEManagerEvent> {
  if (__DEV__) {
    keySystemsConfigs.forEach((config) => assertInterface(config, {
      getLicense: "function",
      type: "string",
    }, "keySystem"));
  }

   // Keep track of all initialization data handled here.
   // This is to avoid handling multiple times the same encrypted events.
  const handledInitData = new InitDataStore();

  const emeEvents$ : Observable<never> = observableCombineLatest(
    onEncrypted$(mediaElement),
    getMediaKeysInfos(
      mediaElement,
      keySystemsConfigs,
      attachedMediaKeysInfos
    )
  ).pipe(
    mergeMap(([encryptedEvent, mediaKeysInfos], i) => {
      return observableMerge(
        // create a new MediaKeySession if needed
        handleEncryptedEvent(encryptedEvent, handledInitData, mediaKeysInfos).pipe(
          map((evt) => ({
            type: evt.type,
            value: {
              initData: evt.value.initData,
              initDataType: evt.value.initDataType,
              mediaKeySession: evt.value.mediaKeySession,
              sessionType: evt.value.sessionType,
              keySystemOptions: mediaKeysInfos.keySystemOptions,
              sessionStorage: mediaKeysInfos.sessionStorage,
              serverCertificateWarning: mediaKeysInfos.serverCertificateWarning,
            },
          }))),

        // attach MediaKeys if we're handling the first event
        i === 0 ?
          attachMediaKeys(mediaKeysInfos, mediaElement, attachedMediaKeysInfos).pipe(
            ignoreElements()) :
          EMPTY
      );
    }),
    mergeMap((handledEncryptedEvent) =>  {
      const {
        initData,
        initDataType,
        mediaKeySession,
        sessionType,
        keySystemOptions,
        sessionStorage,
        serverCertificateWarning,
      } = handledEncryptedEvent.value;

      return observableMerge(
        handleSessionEvents(mediaKeySession, keySystemOptions),
        serverCertificateWarning ? observableOf(serverCertificateWarning) : EMPTY,
        // only perform generate request on new sessions
        handledEncryptedEvent.type === "created-session" ?
          generateKeyRequest(mediaKeySession, initData, initDataType).pipe(
            tap(() => {
              if (sessionType === "persistent-license" && sessionStorage != null) {
                sessionStorage.add(initData, initDataType, mediaKeySession);
              }
            })) :
          EMPTY
      ).pipe(ignoreElements());
    }));

  return emeEvents$;
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

export {
  IKeySystemOption,
  clearEMESession,
  disposeEME,
  getCurrentKeySystem,
};
