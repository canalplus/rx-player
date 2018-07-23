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
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  Subject,
  TimeoutError,
} from "rxjs";
import {
  catchError,
  concatMap,
  map,
  mapTo,
  mergeMap,
  takeUntil,
  timeout,
} from "rxjs/operators";
import { IMediaKeySession } from "../../compat";
import {
  onKeyError$,
  onKeyMessage$,
  onKeyStatusesChange$,
} from "../../compat/events";
import {
  EncryptedMediaError,
  ErrorTypes,
  ICustomError,
  isKnownError,
} from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/castToObservable";
import { retryObsWithBackoff } from "../../utils/retry";
import tryCatch from "../../utils/rx-tryCatch";
import {
  IKeySystemOption,
  KEY_STATUS_ERRORS,
} from "./types";

type TypedArray =
  Int8Array |
  Int16Array |
  Int32Array |
  Uint8Array |
  Uint16Array |
  Uint32Array |
  Uint8ClampedArray |
  Float32Array |
  Float64Array;

export type ILicense =
  TypedArray |
  ArrayBuffer;

interface IMediaKeySessionEvents {
  type: MediaKeyMessageType|"key-status-change";
  value: {
    license: ILicense;
  };
}

export interface IMediaKeySessionHandledEvents {
  type : MediaKeyMessageType|"key-status-change";
  value : {
    session : IMediaKeySession|MediaKeySession;
    license: ILicense;
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
export default function handleSessionEvents(
  session: IMediaKeySession|MediaKeySession,
  keySystem: IKeySystemOption,
  errorStream: Subject<Error|ICustomError>
) : Observable<IMediaKeySessionHandledEvents> {
  log.debug("eme: handle message events", session);

  /**
   * @param {Error|Object} error
   * @param {Boolean} fatal
   * @returns {Error|Object}
   */
  function licenseErrorSelector(
    error: ICustomError|Error,
    fatal: boolean
  ) : ICustomError|Error {
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
    errorSelector: (error: ICustomError|Error) => licenseErrorSelector(error, true),
    onRetry: (
      error: ICustomError|Error) => errorStream.next(licenseErrorSelector(error, false)
    ),
  };

  const keyErrors: Observable<never> = onKeyError$(session)
    .pipe(map((error) => {
      throw new EncryptedMediaError("KEY_ERROR", error, true);
    }));

  const keyStatusesChanges : Observable<IMediaKeySessionEvents> =
    onKeyStatusesChange$(session)
      .pipe(mergeMap((keyStatusesEvent: Event) => {
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

      const handledKeyStatusesChange$ = tryCatch(() => {
        return keySystem && keySystem.onKeyStatusesChange ?
          castToObservable(
            keySystem.onKeyStatusesChange(keyStatusesEvent, session)
          ) as Observable<TypedArray|ArrayBuffer> : EMPTY;
      });

      return handledKeyStatusesChange$
        .pipe() // TS or RxJS Bug?
        .pipe(
          catchError((error: Error) => {
            throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", error, true);
          }),
          map((licenseObject) => {
            return {
              type: "key-status-change" as "key-status-change",
              value : {
                license: licenseObject,
              },
            };
          })
        );
      }));

  const keyMessages$ : Observable<IMediaKeySessionEvents> =
    onKeyMessage$(session).pipe(mergeMap((messageEvent: MediaKeyMessageEvent) => {
      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType || "license-request";

      log.debug(
        `eme: event message type ${messageType}`,
        session,
        messageEvent
      );

      const getLicense$ = observableDefer(() => {
        const getLicense = keySystem.getLicense(message, messageType);
        return castToObservable(getLicense).pipe(
          timeout(10 * 1000),
          catchError((error : Error) => {
            throw error instanceof TimeoutError ?
              new EncryptedMediaError("KEY_LOAD_TIMEOUT", null, false) :
              error;
          })
        );
      // TODO TypeScript/tslint/RxJS bug?
      /* tslint:disable no-unnecessary-type-assertion */
      }) as Observable<TypedArray|ArrayBuffer>;
      /* tslint:enable no-unnecessary-type-assertion */

      return retryObsWithBackoff(getLicense$, getLicenseRetryOptions)
        .pipe(map((license) => {
          return {
            type: messageType,
            value: {
              license,
            },
          };
        }));
    }));

  const sessionUpdates: Observable<IMediaKeySessionHandledEvents> =
    observableMerge(keyMessages$, keyStatusesChanges)
      .pipe(concatMap((evt) => {
        log.debug("eme: update session", evt);
        const license = evt.value.license;
        return castToObservable((session as any).update(license)).pipe(
          catchError((error) => {
            throw new EncryptedMediaError("KEY_UPDATE_ERROR", error, true);
          }),
          mapTo({
            type: evt.type,
            value: {
              session,
              license,
            },
          }));
      }));

  const sessionEvents: Observable<IMediaKeySessionHandledEvents> =
    observableMerge(sessionUpdates, keyErrors);

  if (session.closed) {
    return sessionEvents
      .pipe(takeUntil(castToObservable(session.closed)));
  } else {
    return sessionEvents;
  }
}
