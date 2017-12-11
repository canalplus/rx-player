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
import { ConnectableObservable } from "rxjs/observable/ConnectableObservable";
import { Subject } from "rxjs/Subject";
import { TimeoutError } from "rxjs/util/TimeoutError";

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
import { retryWithBackoff } from "../../utils/retry";
import tryCatch from "../../utils/rx-tryCatch";

import {
  onKeyError$,
  onKeyMessage$,
  onKeyStatusesChange$,
} from "../../compat/events";

import {
  KEY_STATUS_ERRORS,
} from "./constants";
import {
  $loadedSessions,
  $storedSessions,
} from "./globals";
import { IKeySystemOption } from "./key_system";

type ErrorStream = Subject<Error|CustomError>;

interface ISessionEvent {
  type : "ISessionEvent";
  value : {
    name : string;
    session : MediaKeySession;
  };
}

interface ISessionEventOptions {
  updatedWith?: Event;
  initData?: Uint8Array;
  initDataType?: string;
  storedSessionId?: string;
}

type MediaKeySessionType =
  "temporary" |
  "persistent-license" |
  "persistent-release-message" |
  undefined;

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
  session : MediaKeySession,
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
  session: MediaKeySession,
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

  const keyStatusesChanges = onKeyStatusesChange$(session)
    .mergeMap((keyStatusesEvent: Event) => {
      log.debug(
        "eme: keystatuseschange event",
        session,
        keyStatusesEvent
      );

      // find out possible errors associated with this event
      session.keyStatuses.forEach((keyStatus, keyId) => {
        // Hack present because the order of the arguments has changed in spec
        // and is not the same between some versions of Edge and Chrome.
        if (KEY_STATUS_ERRORS[keyId]) {
          throw new
            EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", keyId, true);
        } else if (KEY_STATUS_ERRORS[keyStatus]) {
          throw new
            EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", keyStatus, true);
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
      }
      );

      if (license) {
        return license.catch((error: Error) => {
          throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", error, true);
        });
      }
      log.info("eme: keystatuseschange event not handled");
      return Observable.empty();

    });

  const keyMessages = onKeyMessage$(session)
    .mergeMap((messageEvent: MediaKeyMessageEvent) => {

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

  const sessionUpdates: Observable<Event|ISessionEvent>
    = Observable.merge(keyMessages, keyStatusesChanges)
      .concatMap((res: Event) => {
        log.debug("eme: update session", res);

        return castToObservable(
          session.update(res)
        )
          .catch((error) => {
            throw new EncryptedMediaError("KEY_UPDATE_ERROR", error, true);
          })
          .mapTo(createSessionEvent("session-update", session, { updatedWith: res }));
      });

  const sessionEvents: Observable<Event|ISessionEvent>
    = Observable.merge(sessionUpdates, keyErrors);
  if (session.closed) {
    return sessionEvents.takeUntil(castToObservable(session.closed));
  } else {
    return sessionEvents;
  }
}

/**
 * Create Key MediaKeySessionType and link MediaKeySession events to the right events
 * handlers.
 * @param {MediaKeys} mediaKeys
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {Object} keySystem
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSession(
  mediaKeys: MediaKeys,
  sessionType: MediaKeySessionType,
  keySystem: IKeySystemOption,
  initData: Uint8Array,
  errorStream: ErrorStream
): {
  session: MediaKeySession;
  sessionEvents: ConnectableObservable<Event|ISessionEvent>;
} {
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
 * Create a MediaKeySession and manage it (generate the request, manage
 * communications...).
 * @param {MediaKeys} mediaKeys
 * @param {Object} keySystem
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSessionAndKeyRequest(
  mediaKeys: MediaKeys,
  keySystem: IKeySystemOption,
  sessionType: MediaKeySessionType,
  initDataType: string,
  initData: Uint8Array,
  errorStream: ErrorStream
): Observable<Event|ISessionEvent> {
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
      if (sessionType === "persistent-license") {
        $storedSessions.add(initData, session);
      }
    })
    .mapTo(createSessionEvent("generated-request", session, { initData, initDataType }));

  return Observable.merge(sessionEvents, generateRequest);
}

/**
 * Create a session, if it fails due to a session.generateRequest error, retry
 * in certain cases.
 * @param {MediaKeys} mediaKeys
 * @param {Object} keySystem
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSessionAndKeyRequestWithRetry(
  mediaKeys: MediaKeys,
  keySystem: IKeySystemOption,
  sessionType: MediaKeySessionType,
  initDataType: string,
  initData: Uint8Array,
  errorStream: ErrorStream
): Observable<Event|ISessionEvent> {
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

      // TODO In that case, the first in $loadedSessions could be this session,
      // is this wanted?
      const firstLoadedSession = $loadedSessions.getFirst();
      if (!firstLoadedSession) {
        throw error;
      }

      log.warn("eme: could not create a new session, " +
               "retry after closing a currently loaded session", error);

      return $loadedSessions.deleteAndClose(firstLoadedSession)
        .mergeMap(() =>
          createSessionAndKeyRequest(
            mediaKeys, keySystem, sessionType, initDataType,
            initData, errorStream
          )
        );
    });
}

/**
 * Create persistent MediaKeySession and load data from a sessionId.
 * @param {MediaKeys} mediaKeys
 * @param {Object} keySystem
 * @param {string} storedSessionId
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createPersistentSessionAndLoad(
  mediaKeys: MediaKeys,
  keySystem: IKeySystemOption,
  storedSessionId: string,
  initDataType: string,
  initData: Uint8Array,
  errorStream: ErrorStream
): Observable<Event|ISessionEvent> {
  log.debug("eme: load persisted session", storedSessionId);

  const sessionType = "persistent-license";
  const {
    session,
    sessionEvents,
  } = createSession(mediaKeys, sessionType, keySystem, initData, errorStream);

  return castToObservable(session.load(storedSessionId))
    .catch(() => Observable.of(false))
    .mergeMap((success) => {
      if (success) {
        $loadedSessions.add(initData, session, sessionEvents);
        $storedSessions.add(initData, session);
        return sessionEvents
          .startWith(
            createSessionEvent("loaded-session", session, { storedSessionId })
          );
      } else {
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

        return createSessionAndKeyRequestWithRetry(
          mediaKeys, keySystem, sessionType, initDataType, initData, errorStream
        ).startWith(
          createSessionEvent("loaded-session-failed", session, { storedSessionId })
        );
      }
    });
}

/**
 * Create MediaKeySession and react to its events.
 * @param {MediaKeys} mediaKeys
 * @param {MediaKeySystemConfiguration} mksConfig
 * @param {Object} keySystem
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function manageSessionCreation(
  mediaKeys: MediaKeys,
  mksConfig: MediaKeySystemConfiguration,
  keySystem: IKeySystemOption,
  initDataType: string,
  initData: Uint8Array,
  errorStream: ErrorStream
): Observable<MediaKeys|ISessionEvent|Event> {
  return Observable.defer(() => {
    // reuse currently loaded sessions without making a new key request
    const loadedSession = $loadedSessions.get(initData);
    if (loadedSession && loadedSession.sessionId) {
      log.debug("eme: reuse loaded session", loadedSession.sessionId);
      return Observable.of(createSessionEvent("reuse-session", loadedSession));
    }

    let sessionType: MediaKeySessionType = "temporary"; // (default value)
    const sessionTypes = mksConfig.sessionTypes;
    const hasPersistence = (
      sessionTypes && arrayIncludes(sessionTypes, "persistent-license"));

    if (hasPersistence && keySystem.persistentLicense) {
      sessionType = "persistent-license";

      // if a persisted session exists in the store associated to this initData,
      // we reuse it without a new license request through the `load` method.
      const storedEntry = $storedSessions.get(initData);
      if (storedEntry) {
        return createPersistentSessionAndLoad(
          mediaKeys, keySystem, storedEntry.sessionId, initDataType,
          initData, errorStream);
      }
    }

    // we have a fresh session without persisted informations and need
    // to make a new key request that we will associate to this session
    return createSessionAndKeyRequestWithRetry(
      mediaKeys, keySystem, sessionType, initDataType, initData, errorStream);
  });
}

export default manageSessionCreation;

export {
  ISessionEvent,
  ErrorStream,
};
