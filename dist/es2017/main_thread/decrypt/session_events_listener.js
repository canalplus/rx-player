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
import { onKeyError, onKeyMessage, onKeyStatusesChange, } from "../../compat/event_listeners";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import isNonEmptyString from "../../utils/is_non_empty_string";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import retryPromiseWithBackoff from "../../utils/retry_promise_with_backoff";
import TaskCanceller, { CancellationSignal } from "../../utils/task_canceller";
import checkKeyStatuses from "./utils/check_key_statuses";
/**
 * Listen to various events from a MediaKeySession and react accordingly
 * depending on the configuration given.
 * @param {MediaKeySession} session - The MediaKeySession concerned.
 * @param {Object} keySystemOptions - The key system options.
 * @param {String} keySystem - The configuration keySystem used for deciphering
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 */
export default function SessionEventsListener(session, keySystemOptions, keySystem, callbacks, cancelSignal) {
    log.info("DRM: Binding session events", session.sessionId);
    const { getLicenseConfig = {} } = keySystemOptions;
    /** Allows to manually cancel everything the `SessionEventsListener` is doing. */
    const manualCanceller = new TaskCanceller();
    manualCanceller.linkToSignal(cancelSignal);
    if (!isNullOrUndefined(session.closed)) {
        session.closed
            .then(() => manualCanceller.cancel())
            .catch((err) => {
            // Should never happen
            if (cancelSignal.isCancelled()) {
                return;
            }
            manualCanceller.cancel();
            callbacks.onError(err);
        });
    }
    onKeyError(session, (evt) => {
        manualCanceller.cancel();
        callbacks.onError(new EncryptedMediaError("KEY_ERROR", evt.type));
    }, manualCanceller.signal);
    onKeyStatusesChange(session, () => {
        try {
            checkAndHandleCurrentKeyStatuses();
        }
        catch (error) {
            if (cancelSignal.isCancelled() ||
                (manualCanceller.isUsed() && error instanceof CancellationSignal)) {
                return;
            }
            manualCanceller.cancel();
            callbacks.onError(error);
        }
    }, manualCanceller.signal);
    onKeyMessage(session, (evt) => {
        const messageEvent = evt;
        const message = new Uint8Array(messageEvent.message);
        const messageType = isNonEmptyString(messageEvent.messageType)
            ? messageEvent.messageType
            : "license-request";
        log.info(`DRM: Received message event, type ${messageType}`, session.sessionId);
        const backoffOptions = getLicenseBackoffOptions(getLicenseConfig.retry);
        retryPromiseWithBackoff(() => runGetLicense(message, messageType), backoffOptions, manualCanceller.signal)
            .then((licenseObject) => {
            if (manualCanceller.isUsed()) {
                return Promise.resolve();
            }
            if (isNullOrUndefined(licenseObject)) {
                log.info("DRM: No license given, skipping session.update");
            }
            else {
                try {
                    return updateSessionWithMessage(session, licenseObject);
                }
                catch (err) {
                    manualCanceller.cancel();
                    callbacks.onError(err);
                }
            }
        })
            .catch((err) => {
            if (manualCanceller.isUsed()) {
                return;
            }
            manualCanceller.cancel();
            const formattedError = formatGetLicenseError(err);
            if (!isNullOrUndefined(err)) {
                const { fallbackOnLastTry } = err;
                if (fallbackOnLastTry === true) {
                    log.warn("DRM: Last `getLicense` attempt failed. " +
                        "Blacklisting the current session.");
                    callbacks.onError(new BlacklistedSessionError(formattedError));
                    return;
                }
            }
            callbacks.onError(formattedError);
        });
    }, manualCanceller.signal);
    checkAndHandleCurrentKeyStatuses();
    return;
    /**
     * Check current MediaKeyStatus for each key in the given MediaKeySession and:
     *   - throw if at least one status is a non-recoverable error
     *   - call warning callback for recoverable errors
     *   - call onKeyUpdate callback when the MediaKeyStatus of any key is updated
     */
    function checkAndHandleCurrentKeyStatuses() {
        log.info("DRM: keystatuseschange event received", session.sessionId);
        if (manualCanceller.isUsed() || session.keyStatuses.size === 0) {
            return;
        }
        const { warning, blacklistedKeyIds, whitelistedKeyIds } = checkKeyStatuses(session, keySystemOptions, keySystem);
        if (warning !== undefined) {
            callbacks.onWarning(warning);
            if (manualCanceller.isUsed()) {
                return;
            }
        }
        callbacks.onKeyUpdate({ whitelistedKeyIds, blacklistedKeyIds });
    }
    function runGetLicense(message, messageType) {
        let timeoutId;
        return new Promise((res, rej) => {
            try {
                log.debug("DRM: Calling `getLicense`", messageType);
                const getLicense = keySystemOptions.getLicense(message, messageType);
                const getLicenseTimeout = isNullOrUndefined(getLicenseConfig.timeout)
                    ? 10 * 1000
                    : getLicenseConfig.timeout;
                if (getLicenseTimeout >= 0) {
                    timeoutId = setTimeout(() => {
                        rej(new GetLicenseTimeoutError(`"getLicense" timeout exceeded (${getLicenseTimeout} ms)`));
                    }, getLicenseTimeout);
                }
                Promise.resolve(getLicense).then(clearTimeoutAndResolve, clearTimeoutAndReject);
            }
            catch (err) {
                clearTimeoutAndReject(err);
            }
            function clearTimeoutAndResolve(data) {
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId);
                }
                res(data);
            }
            function clearTimeoutAndReject(err) {
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId);
                }
                rej(err);
            }
        });
    }
    /**
     * Construct backoff options for the getLicense call.
     * @param {number|undefined} numberOfRetry - Maximum of amount retried.
     * Equal to `2` if not defined.
     * @returns {Object}
     */
    function getLicenseBackoffOptions(numberOfRetry) {
        return {
            totalRetry: numberOfRetry !== null && numberOfRetry !== void 0 ? numberOfRetry : 2,
            baseDelay: 200,
            maxDelay: 3000,
            shouldRetry: (error) => error instanceof GetLicenseTimeoutError ||
                isNullOrUndefined(error) ||
                error.noRetry !== true,
            onRetry: (error) => callbacks.onWarning(formatGetLicenseError(error)),
        };
    }
}
/**
 * Format an error returned by a `getLicense` call to a proper form as defined
 * by the RxPlayer's API.
 * @param {*} error
 * @returns {Error}
 */
function formatGetLicenseError(error) {
    if (error instanceof GetLicenseTimeoutError) {
        return new EncryptedMediaError("KEY_LOAD_TIMEOUT", "The license server took too much time to " + "respond.");
    }
    const err = new EncryptedMediaError("KEY_LOAD_ERROR", "An error occured when calling `getLicense`.");
    if (!isNullOrUndefined(error) &&
        isNonEmptyString(error.message)) {
        err.message = error.message;
    }
    return err;
}
/**
 * Call MediaKeySession.update with the given `message`, if defined.
 * @param {MediaKeySession} session
 * @param {ArrayBuffer|TypedArray|null} message
 * @returns {Promise}
 */
async function updateSessionWithMessage(session, message) {
    log.info("DRM: Updating MediaKeySession with message");
    try {
        await session.update(message);
    }
    catch (error) {
        const reason = error instanceof Error ? error.toString() : "`session.update` failed";
        throw new EncryptedMediaError("KEY_UPDATE_ERROR", reason);
    }
    log.info("DRM: MediaKeySession update succeeded.");
}
/**
 * Error thrown when the MediaKeySession is blacklisted.
 * Such MediaKeySession should not be re-used but other MediaKeySession for the
 * same content can still be used.
 * @class BlacklistedSessionError
 * @extends Error
 */
export class BlacklistedSessionError extends Error {
    constructor(sessionError) {
        super();
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(this, BlacklistedSessionError.prototype);
        this.sessionError = sessionError;
    }
}
/**
 * Error thrown when a `getLicense` call timeouts.
 * @class GetLicenseTimeoutError
 * @extends Error
 */
export class GetLicenseTimeoutError extends Error {
    constructor(message) {
        super();
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(this, BlacklistedSessionError.prototype);
        this.message = message;
    }
}
