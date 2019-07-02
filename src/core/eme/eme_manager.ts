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
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  throwError,
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
  ICustomMediaKeySession,
} from "../../compat/";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import { concat } from "../../utils/byte_parsing";
import getSession, {
  IEncryptedEvent,
} from "./get_session";
import initMediaKeys from "./init_media_keys";
import { defaultMediaKeysInfosStore } from "./media_keys_infos_store";
import SessionEventsListener, {
  BlacklistedSessionError,
} from "./session_events_listener";
import setServerCertificate from "./set_server_certificate";
import {
  IContentProtection,
  IEMEManagerEvent,
  IKeySystemOption,
} from "./types";
import InitDataStore from "./utils/init_data_store";

const { onEncrypted$ } = events;

/**
 * EME abstraction and event handler used to communicate with the Content-
 * Description-Module (CDM).
 *
 * The EME handler can be given one or multiple systems and will choose the
 * appropriate one supported by the user's browser.
 * @param {HTMLMediaElement} mediaElement - The MediaElement which will be
 * associated to a MediaKeys object
 * @param {Array.<Object>} keySystems - key system configuration
 * @param {Observable} contentProtections$ - Observable emitting external
 * initialization data.
 * @returns {Observable}
 */
export default function EMEManager(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[],
  contentProtections$ : Observable<IContentProtection>
) : Observable<IEMEManagerEvent> {
  log.debug("EME: Starting EMEManager logic.");

   // Keep track of all initialization data handled here.
   // This is to avoid handling multiple times the same encrypted events.
  const handledInitData = new InitDataStore();

  // Keep track of the blacklisted sessions with the corresponding error.
  // If a new event ask for a MediaKeySession which has already been blacklisted,
  // we can directly send the corresponding event.
  const blacklistedSessions = new WeakMap< MediaKeySession | ICustomMediaKeySession,
                                           BlacklistedSessionError >();

  // store the mediaKeys when ready
  const mediaKeysInfos$ = initMediaKeys(mediaElement,
                                        keySystemsConfigs,
                                        defaultMediaKeysInfosStore)
                            .pipe(shareReplay()); // cache success

  const attachedMediaKeys$ = mediaKeysInfos$.pipe(filter(evt => {
    return evt.type === "attached-media-keys";
  }));

  // Format encrypted events coming from `contentProtections$`
  const externalEvents$ = contentProtections$.pipe(
    tap((evt) => { log.debug("EME: Encrypted event received from Player", evt); }),
    map((evt) : IEncryptedEvent => ({ type: "cenc",
                                      data: concat(...evt.data),
                                      content: evt.content })));

  // Format encrypted events coming from the media element
  const mediaEncryptedEvents$ = onEncrypted$(mediaElement).pipe(
    tap((evt) => {
      log.debug("EME: Encrypted event received from media element.", evt);
    }),
    map((evt) : IEncryptedEvent => {
      const { initData, initDataType } = getInitData(evt);
      return { type: initDataType,
               data: initData,
               content: null };
    }));

  // Merge all encrypted events
  const encryptedEvents$ = observableMerge(externalEvents$, mediaEncryptedEvents$);

  const bindSession$ = observableCombineLatest([encryptedEvents$,
                                                attachedMediaKeys$]
  ).pipe(
    /* Attach server certificate and create/reuse MediaKeySession */
    mergeMap(([encryptedEvents, mediaKeysEvent], i) => {
      const mediaKeysInfos = mediaKeysEvent.value;
      const { keySystemOptions, mediaKeys } = mediaKeysInfos;
      const { serverCertificate } = keySystemOptions;

      const session$ = getSession(encryptedEvents, handledInitData, mediaKeysInfos)
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

      const blacklistError = blacklistedSessions.get(mediaKeySession);
      if (blacklistError != null) {
        if (content == null) {
          log.error("EME: The current session has already been blacklisted " +
                    "but the current content is not known. Throwing.");
          const { sessionError } = blacklistError;
          sessionError.fatal = true;
          return throwError(sessionError);
        }
        log.warn("EME: The current session has already been blacklisted. " +
                 "Blacklisting content.");
        return observableOf({ type: "blacklist-content" as const,
                              value: content });
      }

      const generateRequest$ = sessionInfosEvt.type !== "created-session" ?
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
            ignoreElements());

      return observableMerge(SessionEventsListener(mediaKeySession, keySystemOptions),
                             generateRequest$)
        .pipe(catchError((err : Error | BlacklistedSessionError) => {
          if (!(err instanceof BlacklistedSessionError)) {
            throw err;
          }

          blacklistedSessions.set(mediaKeySession, err);

          const { sessionError } = err;
          if (content == null) {
            log.error("EME: Current session blacklisted and content not known. " +
                      "Throwing.");
            sessionError.fatal = true;
            throw sessionError;
          }

          log.warn("EME: Current session blacklisted. Blacklisting content.");
          return observableOf({ type: "warning" as const,
                                value: sessionError },
                              { type: "blacklist-content" as const,
                                value: content });

        }));
    }));

  return observableMerge(mediaKeysInfos$, bindSession$);
}
