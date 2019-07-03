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
  identity,
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
  startWith,
  takeUntil,
  timeout,
} from "rxjs/operators";
import {
  events,
  ICustomMediaKeySession,
} from "../../compat";
import {
  EncryptedMediaError,
  ICustomError,
} from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import retryObsWithBackoff from "../../utils/rx-retry_with_backoff";
import tryCatch from "../../utils/rx-try_catch";
import checkKeyStatuses from "./check_key_statuses";
import {
  IEMEWarningEvent,
  IKeySystemOption,
  IMediaKeySessionHandledEvents,
  TypedArray,
} from "./types";

const { onKeyError$,
        onKeyMessage$,
        onKeyStatusesChange$ } = events;

// Error that can be thrown from the external `getLicense` callback
interface IGetLicenseError { message? : string;
                             noRetry? : boolean;
                             fallbackOnLastTry? : boolean; }

// Error thrown by `getLicense` once catched
interface IParsedGetLicenseError extends Error { noRetry? : boolean;
                                                 fallbackOnLastTry? : boolean; }

/**
 * @param {Error|Object} error
 * @returns {Error|Object}
 */
function formatGetLicenseError(error: unknown) : ICustomError {
  if (error instanceof TimeoutError) {
     return new EncryptedMediaError("KEY_LOAD_TIMEOUT",
                                    "The license server took too much time to " +
                                    "respond.");
  }
  return new EncryptedMediaError("KEY_LOAD_ERROR",
                                 error instanceof Error ? error.toString() :
                                                          "`getLicense` failed");
}

/**
 * Error thrown when the MediaKeySession is blacklisted.
 * Such MediaKeySession should not be re-used but other MediaKeySession for the
 * same content can still be used.
 * played.
 * @class BlacklistedSessionError
 * @extends Error
 */
export class BlacklistedSessionError extends Error {
  public sessionError : ICustomError;
  constructor(sessionError : ICustomError) {
    super();
    this.sessionError = sessionError;
  }
}

/**
 * listen to various events from a MediaKeySession and react accordingly
 * depending on the configuration given.
 * @param {MediaKeySession} session - The MediaKeySession concerned.
 * @param {Object} keySystem - The key system configuration.
 * @returns {Observable}
 */
export default function SessionEventsListener(
  session: MediaKeySession|ICustomMediaKeySession,
  keySystem: IKeySystemOption
) : Observable<IMediaKeySessionHandledEvents | IEMEWarningEvent> {
  log.debug("EME: Binding session events", session);

  function getKeyStatusesEvents() {
    const [warnings, blacklistedKeyIDs] = checkKeyStatuses(session, keySystem);
    const warnings$ = observableOf(...warnings);
    const blackListUpdate$ = blacklistedKeyIDs.length > 0 ?
      observableOf({ type: "blacklist-keys" as const,
                     value: blacklistedKeyIDs }) :
      EMPTY;
    return observableConcat(warnings$, blackListUpdate$);
  }

  const sessionWarningSubject$ = new Subject<IEMEWarningEvent>();
  const { getLicenseConfig = {} } = keySystem;
  const getLicenseRetryOptions = {
    totalRetry: getLicenseConfig.retry != null ? getLicenseConfig.retry :
                                                 2,
    retryDelay: 200,

    shouldRetry: (error : unknown) =>
      error instanceof TimeoutError ||
      (error != null && (error as IParsedGetLicenseError).noRetry !== true),

    onRetry: (error : unknown) =>
      sessionWarningSubject$.next({ type: "warning",
                                    value: formatGetLicenseError(error) }) };

  const keyErrors : Observable<never> = onKeyError$(session)
    .pipe(map((error) => {
      throw new EncryptedMediaError("KEY_ERROR", error.type);
    }));

  const keyStatusesChanges : Observable< IMediaKeySessionHandledEvents |
                                         IEMEWarningEvent > =
    onKeyStatusesChange$(session)
      .pipe(mergeMap((keyStatusesEvent: Event) => {
        log.debug("EME: keystatuseschange event", session, keyStatusesEvent);

        const keyStatusesEvents$ = getKeyStatusesEvents();
        const handledKeyStatusesChange$ = tryCatch(() => {
          return keySystem && keySystem.onKeyStatusesChange ?
                   castToObservable(
                     keySystem.onKeyStatusesChange(keyStatusesEvent, session)
                   ) as Observable<TypedArray|ArrayBuffer|null> :
                   EMPTY;
        }, undefined).pipe(
          map(licenseObject => ({ type: "key-status-change-handled" as const,
                                  value : { session, license: licenseObject } })),
          catchError((error: unknown) => {
            let message;
            if (error instanceof Error) {
              message = error.toString();
            } else if (error != null &&
                       typeof (error as { message : string }).message === "string")
            {
              message = (error as { message : string }).message;
            } else {
              message = "Unknown `onKeyStatusesChange` error";
            }
            throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", message);
          })
        );
        return observableConcat(keyStatusesEvents$, handledKeyStatusesChange$);
      }));

  const keyMessages$ : Observable<IEMEWarningEvent | IMediaKeySessionHandledEvents> =
    onKeyMessage$(session).pipe(mergeMap((messageEvent: MediaKeyMessageEvent) => {
      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType ||
                          "license-request";

      log.debug(`EME: Event message type ${messageType}`, session, messageEvent);

      const getLicense$ = observableDefer(() => {
        const getLicense = keySystem.getLicense(message, messageType);
        const getLicenseTimeout = getLicenseConfig.timeout != null ?
          getLicenseConfig.timeout :
          10 * 1000;
        return (castToObservable(getLicense) as Observable<TypedArray|ArrayBuffer|null>)
          .pipe(
            catchError((error : unknown) : never =>
            {
              const err : IParsedGetLicenseError =
                new Error("An error occured when calling `getLicense`.");

              if (error != null) {
                const { message: errorMessage,
                        noRetry,
                        fallbackOnLastTry } = error as IGetLicenseError;
                if (typeof errorMessage === "string") {
                  err.message = errorMessage;
                }
                if (typeof noRetry === "boolean") {
                  err.noRetry = noRetry;
                }
                if (typeof fallbackOnLastTry === "boolean") {
                  err.fallbackOnLastTry = fallbackOnLastTry;
                }
              }
              throw err;
            }),

            getLicenseTimeout >= 0 ? timeout(getLicenseTimeout) :
                                     identity /* noop */
          );
      });

      return retryObsWithBackoff(getLicense$, getLicenseRetryOptions)
        .pipe(
          map(licenseObject => ({
            type: "key-message-handled" as const,
            value : { session, license: licenseObject },
          })),

          catchError((err : unknown) => {
            const formattedError = formatGetLicenseError(err);
            if (err instanceof TimeoutError) {
               throw new EncryptedMediaError("KEY_LOAD_TIMEOUT",
                                             "The `getLicense` request timeouted.");
            }

            if (!(err instanceof Error)) {
              throw new EncryptedMediaError("KEY_LOAD_ERROR",
                                            "An unknown error happened " +
                                            "when fetching the license");
            }

            const error = new EncryptedMediaError("KEY_LOAD_ERROR", err.message);

            const { fallbackOnLastTry } = err as IParsedGetLicenseError;
            if (fallbackOnLastTry !== true) {
              throw error;
            }

            log.warn("EME: Last `getLicense` attempt failed. " +
                     "Blacklisting the current session.");

            formattedError.fatal = false;
            throw new BlacklistedSessionError(formattedError);
          })
        );
    }));

  const sessionUpdates = observableMerge(keyMessages$, keyStatusesChanges)
    .pipe(
      concatMap((
        evt : IMediaKeySessionHandledEvents | IEMEWarningEvent
      ) : Observable< IMediaKeySessionHandledEvents | IEMEWarningEvent > => {
        if (evt.type !== "key-message-handled" &&
            evt.type !== "key-status-change-handled")
        {
          return observableOf(evt);
        }

        const license = evt.value.license;

        if (license == null) {
          log.info("EME: No license given, skipping session.update");
          return observableOf(evt);
        }

        log.debug("EME: Update session", evt);
        return castToObservable(session.update(license)).pipe(
          catchError((error: unknown) => {
            const reason = error instanceof Error ? error.toString() :
                                                    "`session.update` failed";
            throw new EncryptedMediaError("KEY_UPDATE_ERROR", reason);
          }),
          mapTo({ type: "session-updated" as const,
                  value: { session, license } }),
          startWith(evt)
        );
      }));

  const sessionEvents : Observable<IMediaKeySessionHandledEvents |
                                   IEMEWarningEvent> =
    observableMerge(getKeyStatusesEvents(),
                    sessionUpdates,
                    keyErrors,
                    sessionWarningSubject$);

  return session.closed ?
           sessionEvents.pipe(takeUntil(castToObservable(session.closed))) :
           sessionEvents;
}
