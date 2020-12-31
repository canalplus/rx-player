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
import config from "../../config";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import assertUnreachable from "../../utils/assert_unreachable";
import filterMap from "../../utils/filter_map";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import cleanOldStoredPersistentInfo from "./clean_old_stored_persistent_info";
import getSession from "./get_session";
import initMediaKeys from "./init_media_keys";
import SessionEventsListener, {
  BlacklistedSessionError,
} from "./session_events_listener";
import setServerCertificate from "./set_server_certificate";
import {
  IAttachedMediaKeysEvent,
  IContentProtection,
  IEMEManagerEvent,
  IInitializationDataInfo,
  IKeySystemOption,
} from "./types";
import InitDataStore from "./utils/init_data_store";

const { EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION } = config;
const { onEncrypted$ } = events;

/**
 * EME abstraction used to communicate with the Content Decryption Module (or
 * CDM) to be able to decrypt contents.
 *
 * The `EMEManager` can be given one or multiple key systems. It will choose the
 * appropriate one depending on user settings and browser support.
 * @param {HTMLMediaElement} mediaElement - The MediaElement which will be
 * associated to a MediaKeys object
 * @param {Array.<Object>} keySystemsConfigs - key system configuration
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

   /**
    * Keep track of all initialization data handled for the current `EMEManager`
    * instance.
    * This allows to avoid handling multiple times the same encrypted events.
    */
  const handledInitData = new InitDataStore<boolean>();

  /**
   * Keep track of which initialization data have been blacklisted (linked to
   * non-decypherable content).
   * If the same initialization data is encountered again, we can directly emit
   * the same `BlacklistedSessionError`.
   */
  const blacklistedInitData = new InitDataStore<BlacklistedSessionError>();

  /** Emit the MediaKeys instance and its related information when ready. */
  const mediaKeysInfos$ = initMediaKeys(mediaElement, keySystemsConfigs)
    .pipe(shareReplay()); // Share side-effects and cache success

  /** Emit when the MediaKeys instance has been attached the HTMLMediaElement. */
  const attachedMediaKeys$ = mediaKeysInfos$.pipe(
    filter((evt) : evt is IAttachedMediaKeysEvent => {
      return evt.type === "attached-media-keys";
    }),
    take(1));

  /** Parsed `encrypted` events coming from the HTMLMediaElement. */
  const mediaEncryptedEvents$ = onEncrypted$(mediaElement).pipe(
    tap((evt) => {
      log.debug("EME: Encrypted event received from media element.", evt);
    }),
    filterMap<MediaEncryptedEvent, IInitializationDataInfo, null>((evt) => {
      const { initData, initDataType } = getInitData(evt);
      if (initData === null) {
        return null;
      }
      return { type: initDataType, data: initData };
    }, null),
    shareReplay({ refCount: true })); // multiple Observables listen to that one
                                      // as soon as the EMEManager is subscribed

  /** Encryption events coming from the `contentProtections$` argument. */
  const externalEvents$ = contentProtections$.pipe(
    tap((evt) => { log.debug("EME: Encrypted event received from Player", evt); }));

  /** Emit events signaling that an encryption initialization data is encountered. */
  const encryptedEvents$ = observableMerge(externalEvents$, mediaEncryptedEvents$);

  /** Create MediaKeySessions and handle the corresponding events. */
  const bindSession$ = encryptedEvents$.pipe(
    // Add attached MediaKeys info once available
    mergeMap((encryptedEvt) => attachedMediaKeys$.pipe(
      map((mediaKeysEvt) : [IInitializationDataInfo, IAttachedMediaKeysEvent] =>
        [ encryptedEvt, mediaKeysEvt ]))),
    /* Attach server certificate and create/reuse MediaKeySession */
    mergeMap(([encryptedEvent, mediaKeysEvent], i) => {
      const mediaKeysInfos = mediaKeysEvent.value;
      const { instances, stores, options } = mediaKeysInfos;
      const { serverCertificate } = options;

      const { type: initDataType, data: initData } = encryptedEvent;
      const blacklistError = blacklistedInitData.get(encryptedEvent);
      if (blacklistError !== undefined) {
        if (initDataType === undefined) {
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

      if (!handledInitData.storeIfNone(encryptedEvent, true)) {
        log.debug("EME: Init data already received. Skipping it.");
        return observableOf({ type: "init-data-ignored" as const,
                              value: { initializationData: encryptedEvent } });
      }

      const wantedSessionType = options.persistentLicense === true ?
        "persistent-license" :
        "temporary";
      const session$ = getSession(encryptedEvent, stores, wantedSessionType)
        .pipe(map((evt) => {
          if (evt.type === "cleaning-old-session") {
            handledInitData.remove(encryptedEvent);
          }
          return {
            type: evt.type,
            value: objectAssign({
              initializationData: encryptedEvent,
              keySystemOptions: options,
              stores,
              keySystem: instances.mediaKeySystemAccess.keySystem,
              mediaKeySystemAccess: instances.mediaKeySystemAccess,
              mediaKeys : instances.mediaKeys,
            }, evt.value),
          };
        }));

      // set server certificate when it is defined, at first received encrypted
      // event
      if (i === 0 && !isNullOrUndefined(serverCertificate)) {
        return observableConcat(setServerCertificate(instances.mediaKeys,
                                                     serverCertificate),
                                session$);
      }
      return session$;
    }),

    /* Trigger license request and manage MediaKeySession events */
    mergeMap((sessionInfosEvt) =>  {
      switch (sessionInfosEvt.type) {
        case "warning":
        case "blacklist-protection-data":
        case "init-data-ignored":
          return observableOf(sessionInfosEvt);

        case "cleaned-old-session":
        case "cleaning-old-session":
          return EMPTY;

        case "created-session":
        case "loaded-open-session":
        case "loaded-persistent-session":
          // Do nothing, just to check every possibility is taken
          break;

        default: // Use TypeScript to check if all possibilities have been checked
          assertUnreachable(sessionInfosEvt);
      }
      const { initializationData,
              mediaKeySession,
              sessionType,
              keySystemOptions,
              stores,
              keySystem } = sessionInfosEvt.value;

      const generateRequest$ = sessionInfosEvt.type !== "created-session" ?
          EMPTY :
          generateKeyRequest(mediaKeySession, initializationData).pipe(
            tap(() => {
              const { persistentSessionsStore } = stores;
              if (sessionType === "persistent-license" &&
                  persistentSessionsStore !== null)
              {
                cleanOldStoredPersistentInfo(
                  persistentSessionsStore,
                  EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION - 1);
                persistentSessionsStore.add(initializationData, mediaKeySession);
              }
            }),
            catchError((error: unknown) => {
              throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR",
                                            error instanceof Error ? error.toString() :
                                                                     "Unknown error");
            }),
            ignoreElements());

      return observableMerge(SessionEventsListener(mediaKeySession,
                                                   keySystemOptions,
                                                   keySystem,
                                                   initializationData),
                             generateRequest$)
        .pipe(catchError(err => {
          if (!(err instanceof BlacklistedSessionError)) {
            throw err;
          }

          blacklistedInitData.store(initializationData, err);

          const { sessionError } = err;
          if (initializationData.type === undefined) {
            log.error("EME: Current session blacklisted and content not known. " +
                      "Throwing.");
            sessionError.fatal = true;
            throw sessionError;
          }

          log.warn("EME: Current session blacklisted. Blacklisting content.");
          return observableOf({ type: "warning" as const,
                                value: sessionError },
                              { type: "blacklist-protection-data" as const,
                                value: initializationData });
        }));
    }));

  return observableMerge(mediaKeysInfos$,
                         mediaEncryptedEvents$
                           .pipe(map(evt => ({ type: "encrypted-event-received" as const,
                                               value: evt }))),
                         bindSession$);
}
