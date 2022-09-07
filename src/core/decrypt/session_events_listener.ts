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
  concatMap,
  defer as observableDefer,
  EMPTY,
  identity,
  ignoreElements,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  Subject,
  tap,
  takeUntil,
  timeout,
  TimeoutError,
} from "rxjs";
import {
  events,
  ICustomMediaKeySession,
} from "../../compat";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import {
  IKeySystemOption,
  IPlayerError,
} from "../../public_types";
import castToObservable from "../../utils/cast_to_observable";
import isNonEmptyString from "../../utils/is_non_empty_string";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import retryObsWithBackoff, {
  IBackoffOptions,
} from "../../utils/rx-retry_with_backoff";
import tryCatch from "../../utils/rx-try_catch";
import {
  IEMEWarningEvent,
  ILicense,
} from "./types";
import checkKeyStatuses, {
  IKeyStatusesCheckingOptions,
} from "./utils/check_key_statuses";

const { onKeyError$,
        onKeyMessage$,
        onKeyStatusesChange$ } = events;

/**
 * Error thrown when the MediaKeySession is blacklisted.
 * Such MediaKeySession should not be re-used but other MediaKeySession for the
 * same content can still be used.
 * @class BlacklistedSessionError
 * @extends Error
 */
export class BlacklistedSessionError extends Error {
  public sessionError : IPlayerError;
  constructor(sessionError : IPlayerError) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, BlacklistedSessionError.prototype);
    this.sessionError = sessionError;
  }
}

/**
 * listen to various events from a MediaKeySession and react accordingly
 * depending on the configuration given.
 * @param {MediaKeySession} session - The MediaKeySession concerned.
 * @param {Object} keySystemOptions - The key system options.
 * @param {String} keySystem - The configuration keySystem used for deciphering
 * @returns {Observable}
 */
export default function SessionEventsListener(
  session: MediaKeySession | ICustomMediaKeySession,
  keySystemOptions: IKeySystemOption,
  keySystem: string
) : Observable<IEMEWarningEvent | IKeysUpdateEvent> {
  log.info("DRM: Binding session events", session.sessionId);
  const sessionWarningSubject$ = new Subject<IEMEWarningEvent>();
  const { getLicenseConfig = {} } = keySystemOptions;

  const keyErrors = onKeyError$(session).pipe(map((error) : never => {
    throw new EncryptedMediaError("KEY_ERROR", error.type);
  }));

  const keyStatusesChange$ = onKeyStatusesChange$(session)
    .pipe(mergeMap((keyStatusesEvent: Event) =>
      handleKeyStatusesChangeEvent(session,
                                   keySystemOptions,
                                   keySystem,
                                   keyStatusesEvent)));

  const keyMessages$ : Observable<IEMEWarningEvent |
                                  IKeyMessageHandledEvent > =
    onKeyMessage$(session).pipe(mergeMap((messageEvent: MediaKeyMessageEvent) => {
      const message = new Uint8Array(messageEvent.message);
      const messageType = isNonEmptyString(messageEvent.messageType) ?
        messageEvent.messageType :
        "license-request";

      log.info(`DRM: Received message event, type ${messageType}`,
               session.sessionId);
      const getLicense$ = observableDefer(() => {
        const getLicense = keySystemOptions.getLicense(message, messageType);
        const getLicenseTimeout = isNullOrUndefined(getLicenseConfig.timeout) ?
          10 * 1000 :
          getLicenseConfig.timeout;
        return castToObservable(getLicense)
          .pipe(getLicenseTimeout >= 0 ? timeout(getLicenseTimeout) :
                                         identity /* noop */);
      });

      const backoffOptions = getLicenseBackoffOptions(sessionWarningSubject$,
                                                      getLicenseConfig.retry);
      return retryObsWithBackoff(getLicense$, backoffOptions).pipe(
        map(licenseObject => ({
          type: "key-message-handled" as const,
          value : { session, license: licenseObject },
        })),

        catchError((err : unknown) => {
          const formattedError = formatGetLicenseError(err);

          if (!isNullOrUndefined(err)) {
            const { fallbackOnLastTry } = (err as { fallbackOnLastTry? : boolean });
            if (fallbackOnLastTry === true) {
              log.warn("DRM: Last `getLicense` attempt failed. " +
                       "Blacklisting the current session.");
              throw new BlacklistedSessionError(formattedError);
            }
          }
          throw formattedError;
        }));
    }));

  const sessionUpdates = observableMerge(keyMessages$, keyStatusesChange$)
    .pipe(concatMap((
      evt : IEMEWarningEvent |
            IKeyMessageHandledEvent |
            IKeysUpdateEvent |
            IKeyStatusChangeHandledEvent
    ) : Observable< IEMEWarningEvent |
                    IKeysUpdateEvent > => {
      switch (evt.type) {
        case "key-message-handled":
        case "key-status-change-handled":
          if (isNullOrUndefined(evt.value.license)) {
            log.info("DRM: No message given, skipping session.update");
            return EMPTY;
          }

          return updateSessionWithMessage(session, evt.value.license);
        default:
          return observableOf(evt);
      }
    }));

  const sessionEvents = observableMerge(
    getKeyStatusesEvents(session, keySystemOptions, keySystem),
    sessionUpdates,
    keyErrors,
    sessionWarningSubject$);

  return !isNullOrUndefined(session.closed) ?
           sessionEvents
              // TODO There is a subtle TypeScript issue there that made casting
              // to a type-compatible type mandatory. If a more elegant solution
              // can be found, it should be preffered.
             .pipe(takeUntil(castToObservable(session.closed as Promise<unknown>))) :
           sessionEvents;
}

/**
 * Check current MediaKeyStatus for each key in the given MediaKeySession and
 * return an Observable which either:
 *    - throw if at least one status is a non-recoverable error
 *    - emit warning events for recoverable errors
 *    - emit blacklist-keys events for key IDs that are not decipherable
 * @param {MediaKeySession} session - The MediaKeySession concerned.
 * @param {Object} options - Options related to key statuses checks.
 * @param {String} keySystem - The name of the key system used for deciphering
 * @returns {Observable}
 */
function getKeyStatusesEvents(
  session : MediaKeySession | ICustomMediaKeySession,
  options : IKeyStatusesCheckingOptions,
  keySystem : string
) : Observable<IEMEWarningEvent | IKeysUpdateEvent> {
  return observableDefer(() => {
    if (session.keyStatuses.size === 0) {
      return EMPTY;
    }
    const { warnings,
            blacklistedKeyIds,
            whitelistedKeyIds,
            unlistedKeyIds } = checkKeyStatuses(session, options, keySystem);

    const warnings$ = warnings.length > 0 ? observableOf(...warnings) :
                                            EMPTY;
    const keysUpdate$ = observableOf({ type : "keys-update" as const,
                                       value : { whitelistedKeyIds,
                                                 blacklistedKeyIds,
                                                 unlistedKeyIds } });
    return observableConcat(warnings$, keysUpdate$);
  });
}

/**
 * Format an error returned by a `getLicense` call to a proper form as defined
 * by the RxPlayer's API.
 * @param {*} error
 * @returns {Error}
 */
function formatGetLicenseError(error: unknown) : IPlayerError {
  if (error instanceof TimeoutError) {
    return new EncryptedMediaError("KEY_LOAD_TIMEOUT",
                                   "The license server took too much time to " +
                                   "respond.");
  }

  const err = new EncryptedMediaError("KEY_LOAD_ERROR",
                                      "An error occured when calling `getLicense`.");
  if (!isNullOrUndefined(error) &&
      isNonEmptyString((error as { message? : unknown }).message))
  {
    err.message = (error as { message : string }).message;
  }
  return err;
}

/**
 * Call MediaKeySession.update with the given `message`, if defined.
 * Returns the right event depending on the action taken.
 * @param {MediaKeySession} session
 * @param {ArrayBuffer|TypedArray|null} message
 * @returns {Observable}
 */
function updateSessionWithMessage(
  session : MediaKeySession | ICustomMediaKeySession,
  message : BufferSource
) : Observable<never> {
  log.info("DRM: Updating MediaKeySession with message");
  return castToObservable(session.update(message)).pipe(
    catchError((error: unknown) => {
      const reason = error instanceof Error ? error.toString() :
                                              "`session.update` failed";
      throw new EncryptedMediaError("KEY_UPDATE_ERROR", reason);
    }),
    tap(() => { log.info("DRM: MediaKeySession update succeeded."); }),
    // NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
    // first type parameter as `any` instead of the perfectly fine `unknown`,
    // leading to linter issues, as it forbids the usage of `any`.
    // This is why we're disabling the eslint rule.
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
    ignoreElements());
}

/**
 * @param {MediaKeySession} session
 * @param {Object} keySystemOptions
 * @param {string} keySystem
 * @param {Event} keyStatusesEvent
 * @returns {Observable}
 */
function handleKeyStatusesChangeEvent(
  session : MediaKeySession | ICustomMediaKeySession,
  keySystemOptions : IKeySystemOption,
  keySystem : string,
  keyStatusesEvent : Event
) : Observable<IKeyStatusChangeHandledEvent | IKeysUpdateEvent | IEMEWarningEvent> {
  log.info("DRM: keystatuseschange event received", session.sessionId);
  const callback$ = observableDefer(() => {
    return tryCatch(() => {
      if (typeof keySystemOptions.onKeyStatusesChange !== "function") {
        return EMPTY;
      }
      return castToObservable(keySystemOptions.onKeyStatusesChange(keyStatusesEvent,
                                                                   session));
    }, undefined);
  }).pipe(
    map(licenseObject => ({ type: "key-status-change-handled" as const,
                            value : { session, license: licenseObject } })),
    catchError((error: unknown) => {
      const err = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                          "Unknown `onKeyStatusesChange` error");
      if  (!isNullOrUndefined(error) &&
           isNonEmptyString((error as { message? : unknown }).message))
      {
        err.message = (error as { message : string }).message;
      }
      throw err;
    })
  );
  return observableMerge(getKeyStatusesEvents(session, keySystemOptions, keySystem),
                         callback$);
}

/**
 * Construct backoff options for the getLicense call.
 * @param {Subject} sessionWarningSubject$ - Subject through which retry
 * warnings will be sent.
 * @param {number|undefined} numberOfRetry - Maximum of amount retried.
 * Equal to `2` if not defined.
 * @returns {Object}
 */
function getLicenseBackoffOptions(
  sessionWarningSubject$ : Subject<IEMEWarningEvent>,
  numberOfRetry : number | undefined
) : IBackoffOptions {
  return {
    totalRetry: numberOfRetry ?? 2,
    baseDelay: 200,
    maxDelay: 3000,
    shouldRetry: (error : unknown) => error instanceof TimeoutError ||
                                      isNullOrUndefined(error) ||
                                      (error as { noRetry? : boolean }).noRetry !== true,
    onRetry: (error : unknown) =>
      sessionWarningSubject$.next({ type: "warning",
                                    value: formatGetLicenseError(error) }),
  };
}

/**
 * Some key ids related to the current MediaKeySession have updated their
 * statuses.
 *
 * Note that each `IKeysUpdateEvent` is independent of any other.
 *
 * A new `IKeysUpdateEvent` does not completely replace a previously emitted
 * one, as it can for example be linked to a whole other decryption session.
 *
 * However, if a key id is encountered in both an older and a newer
 * `IKeysUpdateEvent`, only the newer, updated, status should be considered.
 */
export interface IKeysUpdateEvent {
  type: "keys-update";
  value: IKeyUpdateValue;
}

/** Information on key ids linked to a MediaKeySession. */
export interface IKeyUpdateValue {
  /**
   * The list of key ids linked to the corresponding MediaKeySession that are
   * now "blacklisted", i.e. the decryption keys they are linked to are blocked
   * from ever being used anymore.
   *
   * Blacklisted key ids correspond to keys linked to a MediaKeySession that
   * cannot and should not be used, due to various reasons, which mainly involve
   * unmet output restrictions and CDM internal errors linked to that key.
   *
   * Content linked to key ids in `blacklistedKeyIds` should be refrained from
   * being used.
   *
   * Note that a key id may only be blacklisted temporarily.
   */
  blacklistedKeyIds : Uint8Array[];
  /*
   * The list of key ids linked to the corresponding MediaKeySession that are
   * now "whitelisted", i.e. the decryption keys they are linked to can be used
   * to decrypt content.
   *
   * Content linked to key ids in `whitelistedKeyIds` should be safe to play.
   *
   * Note that a key id may only be whitelisted temporarily.
   */
  whitelistedKeyIds : Uint8Array[];
  /**
   * The list of key ids linked to the corresponding MediaKeySession that are
   * "unlisted", i.e. the decryption keys they are linked to cannot be used to
   * decrypt content through the corresponding MediaKeySession, and through it
   * only.
   *
   * Keys from the corresponding MediaKeySession linked to key ids in
   * `unlistedKeyIds` are in effect not able to decrypt linked content, but in
   * opposition to `blacklistedKeyIds`, this status only concerns the current
   * MediaKeySession (whereas `blacklistedKeyIds` assumes the impossibility
   * to use the corresponding key in general, even through another
   * MediaKeySession).
   *
   * In consequence, another MediaKeySession may be created if wanted to reload
   * a key whose key id is present in `unlistedKeyIds`.
   */
  unlistedKeyIds : Uint8Array[];
}

/** Emitted after the `onKeyStatusesChange` callback has been called. */
interface IKeyStatusChangeHandledEvent {
  type: "key-status-change-handled";
  value: { session: MediaKeySession |
                    ICustomMediaKeySession;
           license: ILicense|null; };
}

/** Emitted after the `getLicense` callback has been called */
interface IKeyMessageHandledEvent {
  type: "key-message-handled";
  value: { session: MediaKeySession |
                    ICustomMediaKeySession;
           license: ILicense|null; };
}
