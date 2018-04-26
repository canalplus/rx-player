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
import { retryObsWithBackoff } from "../../utils/retry";
import tryCatch from "../../utils/rx-tryCatch";
import {
  IKeySystemOption,
  KEY_STATUS_ERRORS,
} from "./constants";
import {
  IMediaKeyMessageEvent,
  IMediaKeyMessageEventType,
  ISessionCreationEvent,
  ISessionEvent,
  ISessionManagementEvent,
  ISessionRequestEvent,
  mediaKeyMessageEvent,
  sessionCreationEvent,
  sessionManagementEvent,
  sessionRequestEvent,
} from "./eme_events";
import {
  IKeySystemAccessInfos,
} from "./find_key_system";
import {
  $loadedSessions,
  $storedSessions,
} from "./globals";

export interface IMediaKeysInfos extends IKeySystemAccessInfos {
  mediaKeys : MediaKeys|IMockMediaKeys;
}

interface IMediaKeyMessage {
  license: LicenseObject;
  msg: IMediaKeyMessageEventType;
}

type LicenseObject =
  TypedArray |
  ArrayBuffer;

/**
 * listen to "message" events from session containing a challenge
 * blob and map them to licenses using the getLicense method from
 * selected keySystem.
 * @param {MediaKeySession} session
 * @param {Object} keySystem
 * @param {Subject} errorStream
 * @returns {Observable}
 */
export function handleSessionEvents(
  session: IMediaKeySession|MediaKeySession,
  keySystem: IKeySystemOption,
  errorStream: Subject<Error|CustomError>
) : Observable<IMediaKeyMessageEvent> {
  log.debug("eme: handle message events", session);

  /**
   * @param {Error|Object} error
   * @param {Boolean} fatal
   * @returns {Error|Object}
   */
  function licenseErrorSelector(
    error: CustomError|Error,
    fatal: boolean
  ) : CustomError|Error {
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

  const keyErrors: Observable<never> = onKeyError$(session).map((error) => {
    throw new EncryptedMediaError("KEY_ERROR", error, true);
  });

  const keyStatusesChanges : Observable<IMediaKeyMessage> =
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
      }).map((licenseObject) => {
        return {
          license: licenseObject as LicenseObject,
          msg: "key-status-change" as "key-status-change",
        };
      });
    });

  const keyMessages$ : Observable<IMediaKeyMessage> =
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

      return retryObsWithBackoff(getLicense$, getLicenseRetryOptions).map((license) => {
        return {
          license,
          msg: messageType,
        };
      });
    });

  const sessionUpdates: Observable<IMediaKeyMessageEvent> =
    Observable.merge(keyMessages$, keyStatusesChanges)
      .concatMap((res) => {
        log.debug("eme: update session", res);

        const { license, msg } = res;
        const sessionEvent =
          mediaKeyMessageEvent(msg, session, license);
        return castToObservable(
          (session as any).update(license)
        )
          .catch((error) => {
            throw new EncryptedMediaError("KEY_UPDATE_ERROR", error, true);
          })
          .mapTo(sessionEvent);
      });

  const sessionEvents: Observable<IMediaKeyMessageEvent> =
    Observable.merge(sessionUpdates, keyErrors);

  if (session.closed) {
    return sessionEvents.takeUntil(castToObservable(session.closed));
  } else {
    return sessionEvents;
  }
}

/**
 * Create MediaKeySession and cache loaded session.
 * @param {MediaKeys} mediaKeys
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {UInt8Array} initData
 * @returns {Observable}
 */
export function createSession(
  mediaKeys: IMockMediaKeys|MediaKeys,
  sessionType: MediaKeySessionType,
  initData: Uint8Array,
  initDataType: string
) : Observable<IMediaKeySession|MediaKeySession> {
  log.debug(`eme: create a new ${sessionType} session`);
  if (mediaKeys.createSession == null) {
    throw new Error("Invalid MediaKeys implementation: Missing createSession");
  }

  // TODO TS bug? I don't get the problem here.
  const session : IMediaKeySession|MediaKeySession =
    (mediaKeys as any).createSession(sessionType);

  $loadedSessions.add(initData, initDataType, session);
  return Observable.of(session);
}

/**
 * Generate a request from session.
 * @param {MediaKeySession} session
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {string} sessionType
 * @returns {Observable}
 */
export function generateKeyRequest(
  session: MediaKeySession|IMediaKeySession,
  initData: Uint8Array,
  initDataType: string
) : Observable<ISessionRequestEvent> {
  return Observable.defer(() => {
    return castToObservable(
      (session as any).generateRequest(initDataType, initData)
    )
      .catch((error) => {
        throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error, false);
      })
      .mapTo(
        sessionRequestEvent(
          "generated-request",
          session,
          initData,
          initDataType
        )
      );
  });
}

/**
 * If session creating fails, retry once session creation/reuse.
 * @param initData
 * @param initDataType
 * @param mediaKeysInfos
 * @returns {Observable}
 */
export function createOrReuseSessionWithRetry(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<ISessionCreationEvent|ISessionManagementEvent> {
  return createOrReuseSession(
    initData,
    initDataType,
    mediaKeysInfos
  ).catch((error) => {
    if (error.code !== ErrorCodes.KEY_GENERATE_REQUEST_ERROR) {
      throw error;
    }
    const loadedSessions = $loadedSessions.getSessions();
    if (!loadedSessions.length) {
      throw error;
    }

    log.warn("eme: could not create a new session, " +
      "retry after closing a currently loaded session", error);

    return $loadedSessions.closeSession(loadedSessions[0])
      .mergeMap(() => {
        return createOrReuseSession(
          initData,
          initDataType,
          mediaKeysInfos
        );
      }
      );
  });
}

/**
 * Create session, or reuse persistent stored session.
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {Object} mediaKeysInfos
 */
function createOrReuseSession(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<ISessionCreationEvent|ISessionManagementEvent> {

  const loadedSession = $loadedSessions.get(initData, initDataType);

  if (loadedSession) {
    const keyStatusesMap = loadedSession.keyStatuses;
    const keyStatuses: string[] = [];
    keyStatusesMap.forEach((keyStatus: string) => {
      keyStatuses.push(keyStatus);
    });

    if (
      keyStatuses.length > 0 &&
      (
        !arrayIncludes(keyStatuses, "expired") &&
        !arrayIncludes(keyStatuses, "internal-error")
      )
    ) {
      log.debug("eme: reuse loaded session", loadedSession.sessionId);
      return Observable.of(
        sessionManagementEvent(
          "reuse-loaded-session",
          loadedSession
        ));
    } else {
      $loadedSessions.closeSession(loadedSession);
      $storedSessions.delete(initData);
    }
  }

  const {
    keySystem,
    keySystemAccess,
    mediaKeys,
  } = mediaKeysInfos;
  const mksConfig = keySystemAccess.getConfiguration();
  const sessionTypes = mksConfig.sessionTypes;
  const hasPersistence = (
    sessionTypes && arrayIncludes(sessionTypes, "persistent-license")
  );

  const sessionType = hasPersistence && keySystem.persistentLicense ?
    "persistent-license" : "temporary";

  return createSession(mediaKeys, sessionType, initData, initDataType)
    .mergeMap((session) => {
      if (hasPersistence && keySystem.persistentLicense) {
        // if a persisted session exists in the store associated to this initData,
        // we reuse it without a new license request through the `load` method.
        const storedEntry = $storedSessions.get(initData);
        if (storedEntry) {
          return loadPersistentSession(
            storedEntry.sessionId, initData, initDataType, session
          );
        }
      }
      return Observable.of(
        sessionCreationEvent(
          "created-temporary-session",
          session,
          initData,
          initDataType
        ));
    });
}

/**
 * Load persistent session from stored session id.
 * If loading fails, delete persistent session from cache.
 * If loading succeed, update cache with new session.
 * @param {string} storedSessionId
 * @param {Uint8Array} initData
 * @param {MediaKeySession} session
 */
function loadPersistentSession(
  storedSessionId: string,
  initData: Uint8Array,
  initDataType: string,
  session: MediaKeySession|IMediaKeySession
) : Observable<ISessionCreationEvent|ISessionManagementEvent> {
  log.debug("eme: load persisted session", storedSessionId);

  return castToObservable(session.load(storedSessionId))
    .catch((error) => {
      log.warn("eme: no data stored for the loaded session.",
        storedSessionId);

      const loadedSession = $loadedSessions.get(initData, initDataType);
      if (loadedSession != null) {
        $loadedSessions.closeSession(loadedSession);
      }
      $storedSessions.delete(initData);

      throw error;
    })
    .map((success) => {
      if (success) {
        $loadedSessions.add(initData, initDataType, session);
          return sessionManagementEvent(
            "loaded-persistent-session",
            session,
            storedSessionId
          );
      } else {
        return sessionCreationEvent(
            "created-persistent-session",
            session,
            initData,
            initDataType
          );
      }
    }).do(() => $storedSessions.add(initData, session));
}

export {
  ISessionManagementEvent,
  IMediaKeyMessageEvent,
  ISessionEvent,
  ISessionCreationEvent
};
