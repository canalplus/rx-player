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
  catchError,
  concat as observableConcat,
  EMPTY,
  filter,
  ignoreElements,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  ReplaySubject,
  shareReplay,
  take,
  tap,
  throwError,
} from "rxjs";
import {
  events,
  generateKeyRequest,
  getInitData,
  ICustomMediaKeySystemAccess,
} from "../../compat/";
import config from "../../config";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import arrayIncludes from "../../utils/array_includes";
import assertUnreachable from "../../utils/assert_unreachable";
import { concat } from "../../utils/byte_parsing";
import filterMap from "../../utils/filter_map";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
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
  IKeyUpdateValue,
} from "./types";
import InitDataStore from "./utils/init_data_store";

const { EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS,
        EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION } = config;
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
    * Keep track of all decryption keys handled by this instance of the
    * `EMEManager`.
    * This allows to avoid creating multiple MediaKeySessions handling the same
    * decryption keys.
    */
  const contentSessions = new InitDataStore<{
    /** Initialization data which triggered the creation of this session. */
    initializationData : IInitializationDataInfo;
    /** Last key update event received for that session. */
    lastKeyUpdate$ : ReplaySubject<IKeyUpdateValue>;
  }>();

  /**
   * Keep track of which initialization data have been blacklisted in the
   * current instance of the `EMEManager`.
   * If the same initialization data is encountered again, we can directly emit
   * the same `BlacklistedSessionError`.
   */
  const blacklistedInitData = new InitDataStore<BlacklistedSessionError>();

  /** Emit the MediaKeys instance and its related information when ready. */
  const mediaKeysInit$ = initMediaKeys(mediaElement, keySystemsConfigs)
    .pipe(
      mergeMap((mediaKeysEvt) => {
        if (mediaKeysEvt.type !== "attached-media-keys") {
          return observableOf(mediaKeysEvt);
        }
        const { mediaKeys, options } = mediaKeysEvt.value;
        const { serverCertificate } = options;
        if (isNullOrUndefined(serverCertificate)) {
          return observableOf(mediaKeysEvt);
        }
        return observableConcat(setServerCertificate(mediaKeys, serverCertificate),
                                observableOf(mediaKeysEvt));
      }),
      shareReplay()); // Share side-effects and cache success

  /** Emit when the MediaKeys instance has been attached the HTMLMediaElement. */
  const attachedMediaKeys$ : Observable<IAttachedMediaKeysEvent> = mediaKeysInit$.pipe(
    filter((evt) : evt is IAttachedMediaKeysEvent => {
      return evt.type === "attached-media-keys";
    }),
    take(1));

  /** Parsed `encrypted` events coming from the HTMLMediaElement. */
  const mediaEncryptedEvents$ = onEncrypted$(mediaElement).pipe(
    tap((evt) => {
      log.debug("EME: Encrypted event received from media element.", evt);
    }),
    filterMap<MediaEncryptedEvent, IInitializationDataInfo, null>(
      (evt) => getInitData(evt), null),
    shareReplay({ refCount: true })); // multiple Observables listen to that one
                                      // as soon as the EMEManager is subscribed

  /** Encryption events coming from the `contentProtections$` argument. */
  const externalEvents$ = contentProtections$.pipe(
    tap((evt) => { log.debug("EME: Encrypted event received from Player", evt); }));

  /** Emit events signaling that an encryption initialization data is encountered. */
  const initializationData$ = observableMerge(externalEvents$, mediaEncryptedEvents$);

  /** Create MediaKeySessions and handle the corresponding events. */
  const bindSession$ = initializationData$.pipe(

    // Add attached MediaKeys info once available
    mergeMap((initializationData) => attachedMediaKeys$.pipe(
      map((mediaKeysEvt) : [IInitializationDataInfo, IAttachedMediaKeysEvent] =>
        [ initializationData, mediaKeysEvt ]))),

    /* Attach server certificate and create/reuse MediaKeySession */
    mergeMap(([initializationData, mediaKeysEvent]) => {
      const { mediaKeySystemAccess, stores, options } = mediaKeysEvent.value;

      const blacklistError = blacklistedInitData.get(initializationData);
      if (blacklistError !== undefined) {
        if (initializationData.type === undefined) {
          log.error("EME: The current session has already been blacklisted " +
                    "but the current content is not known. Throwing.");
          const { sessionError } = blacklistError;
          sessionError.fatal = true;
          return throwError(() => sessionError);
        }
        log.warn("EME: The current session has already been blacklisted. " +
                 "Blacklisting content.");
        return observableOf({ type: "blacklist-protection-data" as const,
                              value: initializationData });
      }

      const lastKeyUpdate$ = new ReplaySubject<IKeyUpdateValue>(1);

      // First, check that this initialization data is not already handled
      if (options.singleLicensePer === "content" && !contentSessions.isEmpty()) {
        const keyIds = initializationData.keyIds;
        if (keyIds === undefined) {
          log.warn("EME: Initialization data linked to unknown key id, we'll " +
                   "not able to fallback from it.");
          return observableOf({ type: "init-data-ignored" as const,
                                value: { initializationData } });
        }
        const firstSession = contentSessions.getAll()[0];
        return firstSession.lastKeyUpdate$.pipe(mergeMap((evt) => {
          const hasAllNeededKeyIds = keyIds.every(keyId => {
            for (let i = 0; i < evt.whitelistedKeyIds.length; i++) {
              if (areArraysOfNumbersEqual(evt.whitelistedKeyIds[i], keyId)) {
                return true;
              }
            }
          });

          if (!hasAllNeededKeyIds) {
            // Not all keys are available in the current session, blacklist those
            return observableOf({ type: "keys-update" as const,
                                  value: { blacklistedKeyIDs: keyIds,
                                           whitelistedKeyIds: [] } });
          }

          // Already handled by the current session.
          // Move corresponding session on top of the cache if it exists
          const { loadedSessionsStore } = mediaKeysEvent.value.stores;
          loadedSessionsStore.reuse(firstSession.initializationData);
          return observableOf({ type: "init-data-ignored" as const,
                                value: { initializationData } });
        }));
      } else if (!contentSessions.storeIfNone(initializationData, { initializationData,
                                                                    lastKeyUpdate$ })) {
        log.debug("EME: Init data already received. Skipping it.");
        return observableOf({ type: "init-data-ignored" as const,
                              value: { initializationData } });
      }

      let wantedSessionType : MediaKeySessionType;
      if (options.persistentLicense !== true) {
        wantedSessionType = "temporary";
      } else if (!canCreatePersistentSession(mediaKeySystemAccess)) {
        log.warn("EME: Cannot create \"persistent-license\" session: not supported");
        wantedSessionType = "temporary";
      } else {
        wantedSessionType = "persistent-license";
      }

      const maxSessionCacheSize = typeof options.maxSessionCacheSize === "number" ?
        options.maxSessionCacheSize :
        EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS;
      return getSession(initializationData,
                        stores,
                        wantedSessionType,
                        maxSessionCacheSize)
        .pipe(mergeMap((sessionEvt) =>  {
          switch (sessionEvt.type) {
            case "cleaning-old-session":
              contentSessions.remove(sessionEvt.value.initializationData);
              return EMPTY;

            case "cleaned-old-session":
              return EMPTY;

            case "created-session":
            case "loaded-open-session":
            case "loaded-persistent-session":
              // Do nothing, just to check every possibility is taken
              break;

            default: // Use TypeScript to check if all possibilities have been checked
              assertUnreachable(sessionEvt);
          }

          const { mediaKeySession,
                  sessionType } = sessionEvt.value;

          /**
           * We only store persistent sessions once its keys are known.
           * This boolean allows to know if this session has already been
           * persisted or not.
           */
          let isSessionPersisted = false;

          // `generateKeyRequest` awaits a single Uint8Array containing all
          // initialization data.
          const concatInitData = concat(...initializationData.values.map(i => i.data));

          const generateRequest$ = sessionEvt.type !== "created-session" ?
              EMPTY :
              generateKeyRequest(mediaKeySession,
                                 initializationData.type,
                                 concatInitData).pipe(
                catchError((error: unknown) => {
                  throw new EncryptedMediaError(
                    "KEY_GENERATE_REQUEST_ERROR",
                     error instanceof Error ? error.toString() :
                                              "Unknown error");
                }),
                ignoreElements());

          return observableMerge(SessionEventsListener(mediaKeySession,
                                                       options,
                                                       mediaKeySystemAccess.keySystem,
                                                       initializationData),
                                 generateRequest$)
            .pipe(
              map((evt) => {
                if (evt.type !== "keys-update") {
                  return evt;
                }

                // We want to add the current key ids in the blacklist if it is
                // not already there.
                //
                // We only do that when `singleLicensePer` is set to something
                // else than the default `"init-data"` because this logic:
                //   1. might result in a quality fallback, which is a v3.x.x
                //      breaking change if some APIs (like `singleLicensePer`)
                //      aren't used.
                //   2. Rely on the EME spec regarding key statuses being well
                //      implemented on all supported devices, which we're not
                //      sure yet. Because in any other `singleLicensePer`, we
                //      need a good implementation anyway, it doesn't matter
                //      there.
                const expectedKeyIds = initializationData.keyIds;
                if (expectedKeyIds !== undefined &&
                    options.singleLicensePer !== "init-data")
                {
                  const missingKeyIds = expectedKeyIds.filter(expected => {
                    return (
                      !evt.value.whitelistedKeyIds.some(whitelisted =>
                        areArraysOfNumbersEqual(whitelisted, expected)) &&
                      !evt.value.blacklistedKeyIDs.some(blacklisted =>
                        areArraysOfNumbersEqual(blacklisted, expected))
                    );
                  });
                  if (missingKeyIds.length > 0) {
                    evt.value.blacklistedKeyIDs.push(...missingKeyIds) ;
                  }
                }

                lastKeyUpdate$.next(evt.value);

                if ((evt.value.whitelistedKeyIds.length === 0 &&
                     evt.value.blacklistedKeyIDs.length === 0) ||
                    sessionType === "temporary" ||
                    stores.persistentSessionsStore === null ||
                    isSessionPersisted)
                {
                  return evt;
                }
                const { persistentSessionsStore } = stores;
                cleanOldStoredPersistentInfo(
                  persistentSessionsStore,
                  EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION - 1);
                persistentSessionsStore.add(initializationData, mediaKeySession);
                isSessionPersisted = true;

                return evt;
              }),
              catchError(err => {
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
    }));

  return observableMerge(mediaKeysInit$,
                         mediaEncryptedEvents$
                           .pipe(map(evt => ({ type: "encrypted-event-received" as const,
                                               value: evt }))),
                         bindSession$);
}

/**
 * Returns `true` if the given MediaKeySystemAccess can create
 * "persistent-license" MediaKeySessions.
 * @param {MediaKeySystemAccess} mediaKeySystemAccess
 * @returns {Boolean}
 */
function canCreatePersistentSession(
  mediaKeySystemAccess : MediaKeySystemAccess | ICustomMediaKeySystemAccess
) : boolean {
  const { sessionTypes } = mediaKeySystemAccess.getConfiguration();
  return sessionTypes !== undefined &&
         arrayIncludes(sessionTypes, "persistent-license");
}
