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

import objectAssign from "object-assign";
import { Observable } from "rxjs/Observable";
import { TimeoutError } from "rxjs/util/TimeoutError";

import { tryCatch, castToObservable } from "../../utils/rx-utils";
import { retryWithBackoff } from "../../utils/retry";


import {
  onKeyMessage,
  onKeyError,
  onKeyStatusesChange,
} from "../../compat/events.js";

import {
  ErrorTypes,
  ErrorCodes,
  EncryptedMediaError,
} from "../../errors";

import {
  KEY_STATUS_ERRORS,
} from "./constants.js";

import log from "../../utils/log";
import {
  $storedSessions,
  $loadedSessions,
} from "./globals.js";

function createMessage(name, session, options) {
  return { type: "eme", value: objectAssign({ name, session }, options) };
}

/*
 * listen to "message" events from session containing a challenge
 * blob and map them to licenses using the getLicense method from
 * selected keySystem.
 * @param {MediaKeySession} session
 * @param {Object} keySystem
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function sessionEventsHandler(session, keySystem, errorStream) {
  log.debug("eme: handle message events", session);
  let sessionId;

  function licenseErrorSelector(error, fatal) {
    if (error.type === ErrorTypes.ENCRYPTED_MEDIA_ERROR) {
      error.fatal = fatal;
      return error;
    } else {
      return new EncryptedMediaError("KEY_LOAD_ERROR", error, fatal);
    }
  }

  const getLicenseRetryOptions = {
    totalRetry: 2,
    retryDelay: 200,
    errorSelector: (error) => licenseErrorSelector(error, true),
    onRetry: (error) => errorStream.next(licenseErrorSelector(error, false)),
  };

  const keyErrors = onKeyError(session).map((error) => {
    throw new EncryptedMediaError("KEY_ERROR", error, true);
  });

  const keyStatusesChanges = onKeyStatusesChange(session)
    .mergeMap((keyStatusesEvent) => {
      sessionId = keyStatusesEvent.sessionId;
      log.debug(
        "eme: keystatuseschange event",
        sessionId,
        session,
        keyStatusesEvent
      );

      // find out possible errors associated with this event
      session.keyStatuses.forEach((keyId, keyStatus) => {
        // TODO: remove this hack present because the order of the
        // arguments has changed in spec and is not the same between
        // Edge and Chrome.
        const reason = KEY_STATUS_ERRORS[keyStatus] || KEY_STATUS_ERRORS[keyId];
        if (reason) {
          throw new
            EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", keyStatus, true);
        }
      });

      // otherwise use the keysystem handler if disponible
      if (!keySystem.onKeyStatusesChange) {
        log.info("eme: keystatuseschange event not handled");
        return Observable.empty();
      }

      const license = tryCatch(() =>
        castToObservable(
          keySystem.onKeyStatusesChange(keyStatusesEvent, session)
        )
      );

      return license.catch((error) => {
        throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", error, true);
      });
    });

  const keyMessages = onKeyMessage(session)
    .mergeMap((messageEvent) => {
      sessionId = messageEvent.sessionId;

      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType || "license-request";

      log.debug(
        `eme: event message type ${messageType}`,
        session,
        messageEvent
      );

      const getLicense = Observable.defer(() => {
        return castToObservable(keySystem.getLicense(message, messageType))
          .timeout(10 * 1000)
          .catch(error => {
            if (error instanceof TimeoutError) {
              throw new EncryptedMediaError("KEY_LOAD_TIMEOUT", null, false);
            } else {
              throw error;
            }
          });
      });

      return retryWithBackoff(getLicense, getLicenseRetryOptions);
    });

  const sessionUpdates = Observable.merge(keyMessages, keyStatusesChanges)
    .concatMap((res) => {
      log.debug("eme: update session", sessionId, res);

      return castToObservable(
        session.update(res, sessionId)
      )
        .catch((error) => {
          throw new EncryptedMediaError("KEY_UPDATE_ERROR", error, true);
        })
        .mapTo(createMessage("session-update", session, { updatedWith: res }));
    });

  const sessionEvents = Observable.merge(sessionUpdates, keyErrors);
  if (session.closed) {
    return sessionEvents.takeUntil(castToObservable(session.closed));
  } else {
    return sessionEvents;
  }
}

/**
 * Create Key Session and link MediaKeySession events to the right events
 * handlers.
 * @param {MediaKeys} mediaKeys
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {Object} keySystem
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSession(
  mediaKeys,
  sessionType,
  keySystem,
  initData,
  errorStream
) {
  log.debug(`eme: create a new ${sessionType} session`);
  const session = mediaKeys.createSession(sessionType);
  const sessionEvents = sessionEventsHandler(session, keySystem, errorStream)
    .finally(() => {
      $loadedSessions.deleteAndClose(session);
      $storedSessions.delete(initData);
    })
    .publish();

  return { session, sessionEvents };
}

/**
 * @param {MediaKeys} mediaKeys
 * @param {Object} keySystem
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSessionAndKeyRequest(
  mediaKeys,
  keySystem,
  sessionType,
  initDataType,
  initData,
  errorStream
) {
  const {
    session,
    sessionEvents,
  } = createSession(mediaKeys, sessionType, keySystem, initData, errorStream);

  $loadedSessions.add(initData, session, sessionEvents);

  log.debug("eme: generate request", initDataType, initData);

  const generateRequest = castToObservable(
    session.generateRequest(initDataType, initData)
  )
    .catch((error) => {
      throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error, false);
    })
    .do(() => {
      if (sessionType == "persistent-license") {
        $storedSessions.add(initData, session);
      }
    })
    .mapTo(createMessage("generated-request", session, { initData, initDataType }));

  return Observable.merge(sessionEvents, generateRequest);
}

/**
 * @param {MediaKeys} mediaKeys
 * @param {Object} keySystem
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSessionAndKeyRequestWithRetry(
  mediaKeys,
  keySystem,
  sessionType,
  initDataType,
  initData,
  errorStream
) {
  return createSessionAndKeyRequest(
    mediaKeys,
    keySystem,
    sessionType,
    initDataType,
    initData,
    errorStream
  )
    .catch((error) => {
      if (error.code !== ErrorCodes.KEY_GENERATE_REQUEST_ERROR) {
        throw error;
      }

      const firstLoadedSession = $loadedSessions.getFirst();
      if (!firstLoadedSession) {
        throw error;
      }

      log.warn("eme: could not create a new session, " +
               "retry after closing a currently loaded session",
               error);

      return $loadedSessions.deleteAndClose(firstLoadedSession)
        .mergeMap(() =>
          createSessionAndKeyRequest(
            mediaKeys,
            keySystem,
            sessionType,
            initDataType,
            initData,
            errorStream
          )
        );
    });
}

function createPersistentSessionAndLoad(mediaKeys,
                                         keySystem,
                                         storedSessionId,
                                         initDataType,
                                         initData,
                                         errorStream) {
  log.debug("eme: load persisted session", storedSessionId);

  const sessionType = "persistent-license";
  const {
    session,
    sessionEvents,
  } = createSession(mediaKeys, sessionType, keySystem, initData, errorStream);

  return castToObservable(
    session.load(storedSessionId)
  )
    .catch(() => Observable.of(false))
    .mergeMap((success) => {
      if (success) {
        $loadedSessions.add(initData, session, sessionEvents);
        $storedSessions.add(initData, session);
        return sessionEvents.startWith(
          createMessage("loaded-session", session, { storedSessionId })
        );
      } else {
        log.warn(
          "eme: no data stored for the loaded session, do fallback",
          storedSessionId
        );

        $loadedSessions.deleteById(storedSessionId);
        $storedSessions.delete(initData);

        if (session.sessionId) {
          session.remove();
        }

        return createSessionAndKeyRequestWithRetry(
          mediaKeys,
          keySystem,
          sessionType,
          initDataType,
          initData,
          errorStream
        ).startWith(
          createMessage("loaded-session-failed", session, { storedSessionId })
        );
      }
    });
}

/**
 * @param {MediaKeys} mediaKeys
 * @param {MediaKeySystemConfiguration} mksConfig
 * @param {Object} keySystem
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function manageSessionCreation(
  mediaKeys,
  mksConfig,
  keySystem,
  initDataType,
  initData,
  errorStream
) {
  return Observable.defer(() => {
    // reuse currently loaded sessions without making a new key
    // request
    const loadedSession = $loadedSessions.get(initData);
    if (loadedSession && loadedSession.sessionId) {
      log.debug("eme: reuse loaded session", loadedSession.sessionId);
      return Observable.of(createMessage("reuse-session", loadedSession));
    }

    const sessionTypes = mksConfig.sessionTypes;
    const persistentLicenseSupported = (
      sessionTypes &&
      sessionTypes.indexOf("persistent-license") >= 0
    );

    const sessionType =
      persistentLicenseSupported && keySystem.persistentLicense
        ? "persistent-license"
        : "temporary";

    if (persistentLicenseSupported && keySystem.persistentLicense) {
      const storedEntry = $storedSessions.get(initData);

      // if a persisted session exists in the store associated to this
      // initData, we reuse it without a new license request through
      // the `load` method.
      if (storedEntry) {
        return createPersistentSessionAndLoad(
          mediaKeys,
          keySystem,
          storedEntry.sessionId,
          initDataType,
          initData,
          errorStream);
      }
    }

    // we have a fresh session without persisted informations and need
    // to make a new key request that we will associate to this
    // session
    return createSessionAndKeyRequestWithRetry(
      mediaKeys,
      keySystem,
      sessionType,
      initDataType,
      initData,
      errorStream
    );
  });
}

export default manageSessionCreation;
