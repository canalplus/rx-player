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
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  filter,
  ignoreElements,
  map,
  mergeMap,
  shareReplay,
  tap,
} from "rxjs/operators";
import {
  events,
  generateKeyRequest,
  getInitData,
  shouldUnsetMediaKeys,
} from "../../compat/";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import { concat } from "../../utils/byte_parsing";
import noop from "../../utils/noop";
import disposeMediaKeys from "./dispose_media_keys";
import getSession, {
  IEncryptedEvent,
} from "./get_session";
import handleSessionEvents from "./handle_session_events";
import initMediaKeys from "./init_media_keys";
import MediaKeysInfosStore from "./media_keys_infos_store";
import setServerCertificate from "./set_server_certificate";
import {
  IContentProtection,
  IEMEManagerEvent,
  IKeySystemOption,
} from "./types";
import InitDataStore from "./utils/init_data_store";

const { onEncrypted$ } = events;

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
  keySystemsConfigs: IKeySystemOption[],
  contentProtections$ : Observable<IContentProtection>
) : Observable<IEMEManagerEvent> {
   // Keep track of all initialization data handled here.
   // This is to avoid handling multiple times the same encrypted events.
  const handledInitData = new InitDataStore();

  // store the mediaKeys when ready
  const mediaKeysInfos$ = initMediaKeys(mediaElement,
                                        keySystemsConfigs,
                                        attachedMediaKeysInfos)
                            .pipe(shareReplay()); // cache success

  const attachedMediaKeys$ = mediaKeysInfos$.pipe(filter(evt => {
    return evt.type === "attached-media-keys";
  }));

  const externalEvents$ = contentProtections$
    .pipe(map((evt) : IEncryptedEvent => ({ type: "cenc",
                                            data: concat(...evt.data),
                                            content: evt.content })));

  const encryptedEvents$ = onEncrypted$(mediaElement).pipe(
    tap((encryptedEvent) => {
      log.debug("EME: encrypted event received", encryptedEvent);
    }),
    map((evt) : IEncryptedEvent => {
      const { initData, initDataType } = getInitData(evt);
      return { type: initDataType,
               data: initData,
               content: null };
    })
  );

  const protectedEvents$ : Observable<IEncryptedEvent> =
    observableMerge(externalEvents$, encryptedEvents$);

  const bindSession$ = observableCombineLatest([protectedEvents$,
                                                attachedMediaKeys$]
  ).pipe(
    /* Attach server certificate and create/reuse MediaKeySession */
    mergeMap(([protectedEvent, mediaKeysEvent], i) => {
      const mediaKeysInfos = mediaKeysEvent.value;
      const { keySystemOptions, mediaKeys } = mediaKeysInfos;
      const { serverCertificate } = keySystemOptions;

      const session$ = getSession(protectedEvent, handledInitData, mediaKeysInfos)
        .pipe(map((evt) => ({
          type: evt.type,
          value: { initData: evt.value.initData,
                   initDataType: evt.value.initDataType,
                   content: evt.value.content,
                   mediaKeySession: evt.value.mediaKeySession,
                   sessionType: evt.value.sessionType,
                   keySystemOptions: mediaKeysInfos.keySystemOptions,
                   sessionStorage: mediaKeysInfos.sessionStorage },
        })));

      if (i === 0) { // first encrypted event for the current content
        return observableMerge(
          serverCertificate != null ?
            observableConcat(setServerCertificate(mediaKeys, serverCertificate),
                             session$) :
            session$
        );
      }

      return session$;
    }),

    /* Trigger license request and manage MediaKeySession events */
    mergeMap((sessionInfosEvt) =>  {
      if (sessionInfosEvt.type === "warning") {
        return observableOf(sessionInfosEvt);
      }

      const { initData,
              initDataType,
              content,
              mediaKeySession,
              sessionType,
              keySystemOptions,
              sessionStorage } = sessionInfosEvt.value;

      return observableMerge(
        handleSessionEvents(mediaKeySession, content, keySystemOptions),

        // only perform generate request on new sessions
        sessionInfosEvt.type !== "created-session" ?
          EMPTY :
          generateKeyRequest(mediaKeySession, initData, initDataType).pipe(
            tap(() => {
              if (sessionType === "persistent-license" && sessionStorage != null) {
                sessionStorage.add(initData, initDataType, mediaKeySession);
              }
            }),
            catchError((error: unknown) => {
              throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR",
                                            error instanceof Error ? error.toString() :
                                                                     "Unknown error");
            }),
            ignoreElements()
          )
      );
    })
  );

  return observableMerge(mediaKeysInfos$, bindSession$);
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
  clearEMESession,
  disposeEME,
  getCurrentKeySystem,
  IEMEManagerEvent,
};
