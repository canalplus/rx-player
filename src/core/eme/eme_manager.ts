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
  take,
  tap,
} from "rxjs/operators";
import {
  events,
  generateKeyRequest,
  getInitData,
} from "../../compat/";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import getSession, {
  IEncryptedEvent,
} from "./get_session";
import initMediaKeys from "./init_media_keys";
import SessionEventsListener, {
  BlacklistedSessionError,
} from "./session_events_listener";
import setServerCertificate from "./set_server_certificate";
import {
  IAttachedMediaKeysEvent,
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
  const handledInitData = new InitDataStore<boolean>();

  // Keep track of the blacklisted init data with the corresponding session
  // error.
  // If a new event emit data which has already been blacklisted, we can
  // directly send the corresponding event.
  const blacklistedInitData = new InitDataStore<BlacklistedSessionError>();

  // store the mediaKeys when ready
  const mediaKeysInfos$ = initMediaKeys(mediaElement, keySystemsConfigs)
    .pipe(shareReplay()); // cache success

  const attachedMediaKeys$ = mediaKeysInfos$.pipe(
    filter((evt) : evt is IAttachedMediaKeysEvent => {
      return evt.type === "attached-media-keys";
    }),
    take(1));

  const mediaEncryptedEvents$ = onEncrypted$(mediaElement).pipe(
    tap((evt) => {
      log.debug("EME: Encrypted event received from media element.", evt);
    }),
    mergeMap((evt) : Observable<IEncryptedEvent> => {
      const { initData, initDataType } = getInitData(evt);
      if (initData == null) {
        return EMPTY;
      }
      return observableOf({ type: initDataType, data: initData });
    }),
    shareReplay({ refCount: true })); // multiple Observables listen to that one
                                      // as soon as the EMEManager is subscribed

  const externalEvents$ = contentProtections$.pipe(
    tap((evt) => { log.debug("EME: Encrypted event received from Player", evt); }));

  // Merge all encrypted events
  const encryptedEvents$ = observableMerge(externalEvents$, mediaEncryptedEvents$);

  const bindSession$ = encryptedEvents$.pipe(
    // Add attached MediaKeys info once available
    mergeMap((encryptedEvt) => attachedMediaKeys$.pipe(
      map((mediaKeysEvt) : [IEncryptedEvent, IAttachedMediaKeysEvent] =>
        [ encryptedEvt, mediaKeysEvt ])
      )),
    /* Attach server certificate and create/reuse MediaKeySession */
    mergeMap(([encryptedEvent, mediaKeysEvent], i) => {
      const mediaKeysInfos = mediaKeysEvent.value;
      const { keySystemOptions, mediaKeys } = mediaKeysInfos;
      const { serverCertificate } = keySystemOptions;

      const { type: initDataType, data: initData } = encryptedEvent;

      const blacklistError = blacklistedInitData.get(initDataType, initData);
      if (blacklistError != null) {
        if (initDataType == null) {
          log.error("EME: The current session has already been blacklisted " +
                    "but the current content is not known. Throwing.");
          const { sessionError } = blacklistError;
          sessionError.fatal = true;
          return throwError(sessionError);
        }
        log.warn("EME: The current session has already been blacklisted. " +
                 "Blacklisting content.");
        return observableOf({ type: "blacklist-protection-data" as const,
                              value: { type: initDataType,
                                       data: initData } });
      }

      if (handledInitData.get(initDataType, initData) === true) {
        log.debug("EME: Init data already received. Skipping it.");
        return observableOf({ type: "init-data-already-handled" as const,
                              value: { type: initDataType, data: initData } });
      }
      handledInitData.set(initDataType, initData, true);

      const session$ = getSession(encryptedEvent, mediaKeysInfos)
        .pipe(map((evt) => ({
          type: evt.type,
          value: { initData: evt.value.initData,
                   initDataType: evt.value.initDataType,
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
      switch (sessionInfosEvt.type) {
        case "warning":
        case "blacklist-protection-data":
        case "init-data-already-handled":
          return observableOf(sessionInfosEvt);
      }
      const { initData,
              initDataType,
              mediaKeySession,
              sessionType,
              keySystemOptions,
              sessionStorage } = sessionInfosEvt.value;

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
        .pipe(catchError(err => {
          if (!(err instanceof BlacklistedSessionError)) {
            throw err;
          }

          blacklistedInitData.set(initDataType, initData, err);

          const { sessionError } = err;
          if (initDataType == null) {
            log.error("EME: Current session blacklisted and content not known. " +
                      "Throwing.");
            sessionError.fatal = true;
            throw sessionError;
          }

          log.warn("EME: Current session blacklisted. Blacklisting content.");
          return observableOf({ type: "warning" as const,
                                value: sessionError },
                              { type: "blacklist-protection-data" as const,
                                value: { type: initDataType,
                                         data: initData } });
        }));
    }));

  return observableMerge(mediaKeysInfos$,
                         mediaEncryptedEvents$
                           .pipe(map(evt => ({ type: "encrypted-event-received" as const,
                                               value: evt }))),
                         bindSession$);
}
