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
import { IMediaKeySession } from "../../compat";
import {
  onKeyError$,
  onKeyMessage$,
  onKeyStatusesChange$,
} from "../../compat/events";
import {
  CustomError,
  EncryptedMediaError,
  ErrorTypes,
  isKnownError,
} from "../../errors";
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
  mediaKeyMessageEvent,
} from "./eme_events";

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

export {
  ISessionManagementEvent,
  IMediaKeyMessageEvent,
  ISessionEvent,
  ISessionCreationEvent
};
