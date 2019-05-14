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
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
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
import {
  events,
  ICustomMediaKeySession,
} from "../../compat";
import {
  EncryptedMediaError,
  ErrorTypes,
  ICustomError,
  isKnownError,
} from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import retryObsWithBackoff from "../../utils/rx-retry_with_backoff";
import tryCatch from "../../utils/rx-try_catch";
import {
  IEMEWarningEvent,
  IKeySystemOption,
  KEY_STATUS_ERRORS,
} from "./types";

const { onKeyError$,
        onKeyMessage$,
        onKeyStatusesChange$ } = events;

type TypedArray = Int8Array |
                  Int16Array |
                  Int32Array |
                  Uint8Array |
                  Uint16Array |
                  Uint32Array |
                  Uint8ClampedArray |
                  Float32Array |
                  Float64Array;

export type ILicense = TypedArray |
                       ArrayBuffer;

interface IMediaKeySessionEvents { type: MediaKeyMessageType |
                                         "key-status-change";
                                   value: { license: ILicense |
                                                     null; }; }

export interface IMediaKeySessionHandledEvents {
  type : MediaKeyMessageType |
         "key-status-change";
  value : { session : MediaKeySession |
                      ICustomMediaKeySession;
            license: ILicense; };
}

const KEY_STATUS_EXPIRED = "expired";

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

  return new EncryptedMediaError("KEY_LOAD_ERROR",
                                 error.message || error.toString(),
                                 fatal);
}

/**
 * listen to "message" events from session containing a challenge
 * blob and map them to licenses using the getLicense method from
 * selected keySystem.
 * @param {MediaKeySession} session
 * @param {Object} keySystem
 * @returns {Observable}
 */
export default function handleSessionEvents(
  session: MediaKeySession|ICustomMediaKeySession,
  keySystem: IKeySystemOption
) : Observable<IMediaKeySessionHandledEvents|IEMEWarningEvent> {
  log.debug("EME: Handle message events", session);

  const sessionWarningSubject$ = new Subject<IEMEWarningEvent>();
  const getLicenseRetryOptions = { totalRetry: 2,
                                   retryDelay: 200,

                                   errorSelector: (error: ICustomError|Error) =>
                                     licenseErrorSelector(error, true),

                                   onRetry: (error: ICustomError|Error) =>
                                     sessionWarningSubject$.next({
                                       type: "warning",
                                       value: licenseErrorSelector(error, false),
                                     }) };

  const keyErrors : Observable<never> = onKeyError$(session)
    .pipe(map((error) => {
      throw new EncryptedMediaError("KEY_ERROR", error.type, true);
    }));

  const keyStatusesChanges : Observable<IMediaKeySessionEvents|IEMEWarningEvent> =
    onKeyStatusesChange$(session)
      .pipe(mergeMap((keyStatusesEvent: Event) => {
        log.debug("EME: keystatuseschange event", session, keyStatusesEvent);

        // find out possible errors associated with this event
        const warnings : IEMEWarningEvent[] = [];
        (session.keyStatuses as any).forEach((keyStatus : string, keyId : string) => {
          // Hack present because the order of the arguments has changed in spec
          // and is not the same between some versions of Edge and Chrome.
          if (keyStatus === KEY_STATUS_EXPIRED || keyId === KEY_STATUS_EXPIRED) {
            const { throwOnLicenseExpiration } = keySystem;
            const error = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                                  "A decryption key expired",
                                                  false);

            if (throwOnLicenseExpiration !== false) {
              throw error;
            }
            warnings.push({ type: "warning", value: error });
          }

          if (KEY_STATUS_ERRORS[keyId]) {
            throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                          "An invalid key status has been " +
                                          "encountered: " + keyId,
                                          true);
          } else if (KEY_STATUS_ERRORS[keyStatus]) {
            throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                          "An invalid key status has been " +
                                          "encountered: " + keyStatus,
                                          true);
          }
        });

        const warnings$ = warnings.length ? observableOf(...warnings) :
                                            EMPTY;
        const handledKeyStatusesChange$ = tryCatch(() => {
          return keySystem &&
                 keySystem.onKeyStatusesChange ?
                   castToObservable(
                     keySystem.onKeyStatusesChange(keyStatusesEvent, session)
                   ) as Observable<TypedArray|ArrayBuffer|null> :
                   EMPTY;
        }, undefined).pipe() // TS or RxJS Bug?
          .pipe(
            catchError((error: Error) => {
              throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                            error.toString(),
                                            true);
            }),
            map((licenseObject) => ({ type: "key-status-change" as "key-status-change",
                                      value : { license: licenseObject }, }))
          );
        return observableConcat(warnings$, handledKeyStatusesChange$);
      }));

  const keyMessages$ : Observable<IMediaKeySessionEvents> =
    onKeyMessage$(session).pipe(mergeMap((messageEvent: MediaKeyMessageEvent) => {
      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType ||
                          "license-request";

      log.debug(`EME: Event message type ${messageType}`, session, messageEvent);

      const getLicense$ = observableDefer(() => {
        const getLicense = keySystem.getLicense(message, messageType);
        return (castToObservable(getLicense) as Observable<TypedArray|ArrayBuffer|null>)
          .pipe(
            timeout(10 * 1000),
            catchError((error : unknown) : never => {
              if (error instanceof TimeoutError) {
                throw new EncryptedMediaError("KEY_LOAD_TIMEOUT",
                                              "The license server took more " +
                                              "than 10 seconds to respond.",
                                              false);
              }
              if (error instanceof Error) {
                throw error;
              }
              throw new Error("An error occured when calling `getLicense`.");
            })
        );
      });

      return retryObsWithBackoff(getLicense$, getLicenseRetryOptions)
        .pipe(map((license) => {
          return { type: messageType,
                   value: { license } };
        }));
    }));

  const sessionUpdates = observableMerge(keyMessages$, keyStatusesChanges)
    .pipe(
      concatMap((evt : IMediaKeySessionEvents|IEMEWarningEvent) :
        Observable<IMediaKeySessionHandledEvents|IEMEWarningEvent> => {
          if (evt.type === "warning") {
            return observableOf(evt);
          }

          const license = evt.value.license;

          if (license == null) {
            log.info("EME: No license given, skipping session.update");
            return EMPTY;
          }

          log.debug("EME: Update session", evt);
          return castToObservable(session.update(license)).pipe(
            catchError((error: Error) => {
              throw new EncryptedMediaError("KEY_UPDATE_ERROR", error.toString(), true);
            }),
            mapTo({ type: evt.type,
                    value: { session, license }, }));
        }));

  const sessionEvents : Observable<IMediaKeySessionHandledEvents|IEMEWarningEvent> =
    observableMerge(sessionUpdates, keyErrors, sessionWarningSubject$);

  return session.closed ?
           sessionEvents.pipe(takeUntil(castToObservable(session.closed))) :
           sessionEvents;
}
