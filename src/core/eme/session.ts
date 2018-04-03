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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { TimeoutError } from "rxjs/util/TimeoutError";
import {
  IMediaKeySession,
  IMockMediaKeys,
} from "../../compat";
import {
  onKeyError$,
  onKeyMessage$,
  onKeyStatusesChange$,
} from "../../compat/events";
import {
  CustomError,
  EncryptedMediaError,
  ErrorCodes,
  ErrorTypes,
  isKnownError,
} from "../../errors";
import arrayIncludes from "../../utils/array-includes";
import castToObservable from "../../utils/castToObservable";
import log from "../../utils/log";
import noop from "../../utils/noop";
import { retryObsWithBackoff } from "../../utils/retry";
import tryCatch from "../../utils/rx-tryCatch";
import {
  KEY_STATUS_ERRORS,
} from "./constants";
import {
  $loadedSessions,
  $storedSessions,
} from "./globals";
import {
  IKeySystemAccessInfos,
  IKeySystemOption,
} from "./key_system";

type ErrorStream = Subject<Error|CustomError>;

export interface IMediaKeysInfos extends IKeySystemAccessInfos {
  mediaKeys : MediaKeys|IMockMediaKeys;
}

interface ISessionEvent {
  type : "ISessionEvent";
  value : {
    name : string;
    session : IMediaKeySession|MediaKeySession;
  };
}

interface ISessionEventOptions {
  updatedWith?: LicenseObject;
  initData?: Uint8Array;
  initDataType?: string;
  storedSessionId?: string;
}

type LicenseObject =
  TypedArray |
  ArrayBuffer;

/**
 * Create the Object emitted by the EME Observable.
 * @param {string} name - name of the event
 * @param {MediaKeySession} session - MediaKeySession concerned
 * @param {Object} [options] - Supplementary data, will be merged with the
 * session information in the returned object.
 * @returns {Object}
 */
function createSessionEvent(
  name : string,
  session : IMediaKeySession|MediaKeySession,
  options? : ISessionEventOptions
) : ISessionEvent {
  return {
    type: "ISessionEvent",
    value: objectAssign({ name, session }, options),
  };
}

/**
 * listen to "message" events from session containing a challenge
 * blob and map them to licenses using the getLicense method from
 * selected keySystem.
 * @param {MediaKeySession} session
 * @param {Object} keySystem
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function sessionEventsHandler(
  session: IMediaKeySession|MediaKeySession,
  keySystem: IKeySystemOption,
  errorStream: ErrorStream
): Observable<Event|ISessionEvent> {
  log.debug("eme: handle message events", session);

  /**
   * @param {Error|Object} error
   * @param {Boolean} fatal
   * @returns {Error|Object}
   */
  function licenseErrorSelector(
    error: CustomError|Error,
    fatal: boolean
  ): CustomError|Error {
    if (isKnownError(error)) {
      if (error.type === ErrorTypes.ENCRYPTED_MEDIA_ERROR) {
        error.fatal = fatal;
        return error;
      }
    }
    return new EncryptedMediaError("KEY_LOAD_ERROR", error, fatal);
  }

  const getLicenseRetryOptions = {
    totalRetry: 2,
    retryDelay: 200,
    errorSelector: (error: CustomError|Error) => licenseErrorSelector(error, true),
    onRetry: (
      error: CustomError|Error) => errorStream.next(licenseErrorSelector(error, false)
    ),
  };

  const keyErrors: Observable<Event> = onKeyError$(session).map((error) => {
    throw new EncryptedMediaError("KEY_ERROR", error, true);
  });

  const keyStatusesChanges : Observable<LicenseObject> =
    onKeyStatusesChange$(session).mergeMap((keyStatusesEvent: Event) => {
      log.debug(
        "eme: keystatuseschange event",
        session,
        keyStatusesEvent
      );

      // find out possible errors associated with this event
      session.keyStatuses.forEach((keyStatus : string, keyId : string) => {
        // Hack present because the order of the arguments has changed in spec
        // and is not the same between some versions of Edge and Chrome.
        if (KEY_STATUS_ERRORS[keyId]) {
          throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", keyId, true);
        } else if (KEY_STATUS_ERRORS[keyStatus]) {
          throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", keyStatus, true);
        }
      });

      const license = tryCatch(() => {
        if (keySystem && keySystem.onKeyStatusesChange) {
          return castToObservable(
            keySystem.onKeyStatusesChange(keyStatusesEvent, session)
          );
        } else {
          return Observable.empty();
        }
      });

      return license.catch((error: Error) => {
        throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", error, true);
      }) as Observable<LicenseObject>;
    });

  const keyMessages$ : Observable<LicenseObject> =
    onKeyMessage$(session).mergeMap((messageEvent: MediaKeyMessageEvent) => {
      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType || "license-request";

      log.debug(
        `eme: event message type ${messageType}`,
        session,
        messageEvent
      );

      const getLicense$ : Observable<LicenseObject> = Observable.defer(() => {
        const getLicense = keySystem.getLicense(message, messageType);
        return castToObservable(getLicense)
          .timeout(10 * 1000)
          .catch(error => {
            if (error instanceof TimeoutError) {
              throw new EncryptedMediaError("KEY_LOAD_TIMEOUT", null, false);
            } else {
              throw error;
            }
          }) as Observable<LicenseObject>;
      });

      return retryObsWithBackoff(getLicense$, getLicenseRetryOptions);
    });

  const sessionUpdates: Observable<Event|ISessionEvent> =
    Observable.merge(keyMessages$, keyStatusesChanges)
      .concatMap((res) => {
        log.debug("eme: update session", res);

        const sessionEvent = createSessionEvent(
          "session-update", session, { updatedWith: res });
        return castToObservable(
          session.update(res)
        )
          .catch((error) => {
            throw new EncryptedMediaError("KEY_UPDATE_ERROR", error, true);
          })
          .mapTo(sessionEvent);
      });

  const sessionEvents: Observable<Event|ISessionEvent> =
    Observable.merge(sessionUpdates, keyErrors);

  if (session.closed) {
    return sessionEvents.takeUntil(castToObservable(session.closed));
  } else {
    return sessionEvents;
  }
}

/**
 * Create Key MediaKeySession and link MediaKeySession events to the right events
 * handlers.
 * @param {MediaKeys} mediaKeys
 * @param {string} sessionType
 * @param {UInt8Array} initData
 * @returns {Observable}
 */
function createSession(
  mediaKeys: IMockMediaKeys|MediaKeys,
  sessionType: MediaKeySessionType,
  initData: Uint8Array
): Observable<IMediaKeySession|MediaKeySession> {
  log.debug(`eme: create a new ${sessionType} session`);
  if (mediaKeys.createSession == null) {
    throw new Error("Invalid MediaKeys implementation: Missing createSession");
  }

  // TODO TS bug? I don't get the problem here.
  const session : IMediaKeySession|MediaKeySession =
    (mediaKeys as any).createSession(sessionType);

  $loadedSessions.add(initData, session);
  return Observable.of(session);
}

export function handleSessionEvents(
  session: MediaKeySession|IMediaKeySession,
  keySystem: IKeySystemOption,
  initData: Uint8Array,
  errorStream: ErrorStream
): Observable<Event|ISessionEvent> {
  const sessionEvents = sessionEventsHandler(session, keySystem, errorStream)
    .finally(() => {
      $loadedSessions.deleteAndClose(session);
      $storedSessions.delete(initData);
    });

  return sessionEvents;
}

/**
 * @param {MediaKeySession} session
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {string} sessionType
 * @returns {Observable}
 */
function generateKeyRequest(
  session: MediaKeySession|IMediaKeySession,
  initData: Uint8Array,
  initDataType: string,
  sessionType: string
) : Observable<ISessionEvent> {

  const generateRequest = castToObservable(
    session.generateRequest(initDataType, initData)
  )
    .catch((error) => {
      throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error, false);
    })

    .do(() => {
      if (sessionType === "persistent-license") {
        $storedSessions.add(initData, session);
      }
    })

    .mapTo(createSessionEvent("generated-request", session, { initData, initDataType }));

  return generateRequest;
}

/**
 * React to each "encrypted" events.
 * @param {MediaKeySession} session
 * @param {MediaEncryptedEvent} encryptedEvent
 * @returns {Observable}
 */
function generateRequestOnSession(
  session: MediaKeySession|IMediaKeySession,
  encryptedEvent : MediaEncryptedEvent
): Observable<ISessionEvent> {
    return Observable.defer(() => {

      if (encryptedEvent.initData == null) {
        const error = new Error("no init data found on media encrypted event.");
        throw new EncryptedMediaError("INVALID_ENCRYPTED_EVENT", error, true);
      }

      const initData = new Uint8Array(encryptedEvent.initData);
      const initDataType = encryptedEvent.initDataType;

      const generateKeyRequest$ =
        generateKeyRequest(session, initData, initDataType, "temporary");

        return generateKeyRequest$;
    });
}

/**
 * @param {MediaEncryptedEvent} encryptedEvent
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
export function createOrReuseSessionWithRetry(
  encryptedEvent: MediaEncryptedEvent,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<ISessionEvent> {
  return createOrReuseSession(
    encryptedEvent,
    mediaKeysInfos
  ).catch((error) => {
    if (error.code !== ErrorCodes.KEY_GENERATE_REQUEST_ERROR) {
      throw error;
    }
    const firstLoadedSession = $loadedSessions.getFirst();
    if (!firstLoadedSession) {
      throw error;
    }

    log.warn("eme: could not create a new session, " +
      "retry after closing a currently loaded session", error);

    return $loadedSessions.deleteAndClose(firstLoadedSession)
      .mergeMap(() => {
        return createOrReuseSession(
          encryptedEvent,
          mediaKeysInfos
        );
      }
      );
  });
}

function createOrReuseSession(
  encryptedEvent: MediaEncryptedEvent,
  mediaKeysInfos: IMediaKeysInfos
): Observable<ISessionEvent> {
  // reuse currently loaded sessions without making a new key request
  const initData = new Uint8Array(encryptedEvent.initData || new ArrayBuffer(0));
  const initDataType = encryptedEvent.initDataType;

  const loadedSession = $loadedSessions.get(initData);
  if (loadedSession && loadedSession.sessionId) {
    log.debug("eme: reuse loaded session", loadedSession.sessionId);
    return Observable.of(createSessionEvent("reuse-session", loadedSession));
  } else {
    return createSession(mediaKeysInfos.mediaKeys, "temporary", initData)
      .mergeMap((session) => {

        const {
          keySystem,
          keySystemAccess,
          mediaKeys,
        } = mediaKeysInfos;
        const mksConfig = keySystemAccess.getConfiguration();

        let sessionType : MediaKeySessionType = "temporary"; // (default value)
        const sessionTypes = mksConfig.sessionTypes;
        const hasPersistence = (
          sessionTypes && arrayIncludes(sessionTypes, "persistent-license"));

        if (hasPersistence && keySystem.persistentLicense) {
          sessionType = "persistent-license";

          // if a persisted session exists in the store associated to this initData,
          // we reuse it without a new license request through the `load` method.
          const storedEntry = $storedSessions.get(initData);
          if (storedEntry) {
            return loadPersistentSession(storedEntry.sessionId, initData, session)
              .catch(() => {
                return createSession(mediaKeys, "persistent-license", initData)
                  .mergeMap((_session) => {
                    return generateKeyRequest(
                      _session, initData, initDataType, sessionType);
                  }).startWith(
                    createSessionEvent(
                      "loaded-session-failed",
                      session,
                      { storedSessionId: storedEntry.sessionId }
                    ));
              });
          }
        }
        return generateRequestOnSession(
            session, encryptedEvent);
      });
  }
}

export function loadPersistentSession(
  storedSessionId: string,
  initData: Uint8Array,
  session: MediaKeySession|IMediaKeySession
): Observable<ISessionEvent> {
  log.debug("eme: load persisted session", storedSessionId);

  return castToObservable(session.load(storedSessionId))
    .catch((error) => {
        // Failed. Try to create a new persistent session from scratch
      log.warn("eme: no data stored for the loaded session, do fallback",
        storedSessionId);

      $loadedSessions.deleteById(storedSessionId);
      $storedSessions.delete(initData);

      if (session.sessionId) {
        castToObservable(session.remove())
          .subscribe(noop, (e) => {
            log.warn("Failed to remove session:" + e.message);
          });
      }
      throw error;
    })
    .mergeMap(() => {
        $loadedSessions.add(initData, session);
        $storedSessions.add(initData, session);
        return Observable.of(
          createSessionEvent("loaded-session", session, { storedSessionId }));
    });
}

export {
  ISessionEvent,
  ErrorStream,
};
