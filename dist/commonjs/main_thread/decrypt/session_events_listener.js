"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetLicenseTimeoutError = exports.BlacklistedSessionError = void 0;
var event_listeners_1 = require("../../compat/event_listeners");
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var is_non_empty_string_1 = require("../../utils/is_non_empty_string");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var retry_promise_with_backoff_1 = require("../../utils/retry_promise_with_backoff");
var task_canceller_1 = require("../../utils/task_canceller");
var check_key_statuses_1 = require("./utils/check_key_statuses");
/**
 * Listen to various events from a MediaKeySession and react accordingly
 * depending on the configuration given.
 * @param {MediaKeySession} session - The MediaKeySession concerned.
 * @param {Object} keySystemOptions - The key system options.
 * @param {String} keySystem - The configuration keySystem used for deciphering
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 */
function SessionEventsListener(session, keySystemOptions, keySystem, callbacks, cancelSignal) {
    log_1.default.info("DRM: Binding session events", session.sessionId);
    var _a = keySystemOptions.getLicenseConfig, getLicenseConfig = _a === void 0 ? {} : _a;
    /** Allows to manually cancel everything the `SessionEventsListener` is doing. */
    var manualCanceller = new task_canceller_1.default();
    manualCanceller.linkToSignal(cancelSignal);
    if (!(0, is_null_or_undefined_1.default)(session.closed)) {
        session.closed
            .then(function () { return manualCanceller.cancel(); })
            .catch(function (err) {
            // Should never happen
            if (cancelSignal.isCancelled()) {
                return;
            }
            manualCanceller.cancel();
            callbacks.onError(err);
        });
    }
    (0, event_listeners_1.onKeyError)(session, function (evt) {
        manualCanceller.cancel();
        callbacks.onError(new errors_1.EncryptedMediaError("KEY_ERROR", evt.type));
    }, manualCanceller.signal);
    (0, event_listeners_1.onKeyStatusesChange)(session, function () {
        log_1.default.info("DRM: keystatuseschange event received", session.sessionId);
        try {
            checkAndHandleCurrentKeyStatuses();
        }
        catch (error) {
            if (cancelSignal.isCancelled() ||
                (manualCanceller.isUsed() && error instanceof task_canceller_1.CancellationSignal)) {
                return;
            }
            manualCanceller.cancel();
            callbacks.onError(error);
        }
    }, manualCanceller.signal);
    (0, event_listeners_1.onKeyMessage)(session, function (evt) {
        var messageEvent = evt;
        var message = new Uint8Array(messageEvent.message);
        var messageType = (0, is_non_empty_string_1.default)(messageEvent.messageType)
            ? messageEvent.messageType
            : "license-request";
        log_1.default.info("DRM: Received message event, type ".concat(messageType), session.sessionId);
        var backoffOptions = getLicenseBackoffOptions(getLicenseConfig.retry);
        (0, retry_promise_with_backoff_1.default)(function () { return runGetLicense(message, messageType); }, backoffOptions, manualCanceller.signal)
            .then(function (licenseObject) {
            if (manualCanceller.isUsed()) {
                return Promise.resolve();
            }
            if ((0, is_null_or_undefined_1.default)(licenseObject)) {
                log_1.default.info("DRM: No license given, skipping session.update");
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
            .catch(function (err) {
            if (manualCanceller.isUsed()) {
                return;
            }
            manualCanceller.cancel();
            var formattedError = formatGetLicenseError(err);
            if (!(0, is_null_or_undefined_1.default)(err)) {
                var fallbackOnLastTry = err.fallbackOnLastTry;
                if (fallbackOnLastTry === true) {
                    log_1.default.warn("DRM: Last `getLicense` attempt failed. " +
                        "Blacklisting the current session.");
                    callbacks.onError(new BlacklistedSessionError(formattedError));
                    return;
                }
            }
            callbacks.onError(formattedError);
        });
    }, manualCanceller.signal);
    log_1.default.info("DRM: transmitting current keystatuses", session.sessionId);
    checkAndHandleCurrentKeyStatuses();
    return;
    /**
     * Check current MediaKeyStatus for each key in the given MediaKeySession and:
     *   - throw if at least one status is a non-recoverable error
     *   - call warning callback for recoverable errors
     *   - call onKeyUpdate callback when the MediaKeyStatus of any key is updated
     */
    function checkAndHandleCurrentKeyStatuses() {
        if (manualCanceller.isUsed() || session.keyStatuses.size === 0) {
            return;
        }
        var _a = (0, check_key_statuses_1.default)(session, keySystemOptions, keySystem), warning = _a.warning, blacklistedKeyIds = _a.blacklistedKeyIds, whitelistedKeyIds = _a.whitelistedKeyIds;
        if (warning !== undefined) {
            callbacks.onWarning(warning);
            if (manualCanceller.isUsed()) {
                return;
            }
        }
        callbacks.onKeyUpdate({ whitelistedKeyIds: whitelistedKeyIds, blacklistedKeyIds: blacklistedKeyIds });
    }
    function runGetLicense(message, messageType) {
        var timeoutId;
        return new Promise(function (res, rej) {
            try {
                log_1.default.debug("DRM: Calling `getLicense`", messageType);
                var getLicense = keySystemOptions.getLicense(message, messageType);
                var getLicenseTimeout_1 = (0, is_null_or_undefined_1.default)(getLicenseConfig.timeout)
                    ? 10 * 1000
                    : getLicenseConfig.timeout;
                if (getLicenseTimeout_1 >= 0) {
                    timeoutId = setTimeout(function () {
                        rej(new GetLicenseTimeoutError("\"getLicense\" timeout exceeded (".concat(getLicenseTimeout_1, " ms)")));
                    }, getLicenseTimeout_1);
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
            shouldRetry: function (error) {
                return error instanceof GetLicenseTimeoutError ||
                    (0, is_null_or_undefined_1.default)(error) ||
                    error.noRetry !== true;
            },
            onRetry: function (error) { return callbacks.onWarning(formatGetLicenseError(error)); },
        };
    }
}
exports.default = SessionEventsListener;
/**
 * Format an error returned by a `getLicense` call to a proper form as defined
 * by the RxPlayer's API.
 * @param {*} error
 * @returns {Error}
 */
function formatGetLicenseError(error) {
    if (error instanceof GetLicenseTimeoutError) {
        return new errors_1.EncryptedMediaError("KEY_LOAD_TIMEOUT", "The license server took too much time to " + "respond.");
    }
    var err = new errors_1.EncryptedMediaError("KEY_LOAD_ERROR", "An error occured when calling `getLicense`.");
    if (!(0, is_null_or_undefined_1.default)(error) &&
        (0, is_non_empty_string_1.default)(error.message)) {
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
function updateSessionWithMessage(session, message) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1, reason;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log_1.default.info("DRM: Updating MediaKeySession with message");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, session.update(message)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    reason = error_1 instanceof Error ? error_1.toString() : "`session.update` failed";
                    throw new errors_1.EncryptedMediaError("KEY_UPDATE_ERROR", reason);
                case 4:
                    log_1.default.info("DRM: MediaKeySession update succeeded.");
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Error thrown when the MediaKeySession is blacklisted.
 * Such MediaKeySession should not be re-used but other MediaKeySession for the
 * same content can still be used.
 * @class BlacklistedSessionError
 * @extends Error
 */
var BlacklistedSessionError = /** @class */ (function (_super) {
    __extends(BlacklistedSessionError, _super);
    function BlacklistedSessionError(sessionError) {
        var _this = _super.call(this, sessionError.message) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, BlacklistedSessionError.prototype);
        _this.sessionError = sessionError;
        return _this;
    }
    return BlacklistedSessionError;
}(Error));
exports.BlacklistedSessionError = BlacklistedSessionError;
/**
 * Error thrown when a `getLicense` call timeouts.
 * @class GetLicenseTimeoutError
 * @extends Error
 */
var GetLicenseTimeoutError = /** @class */ (function (_super) {
    __extends(GetLicenseTimeoutError, _super);
    function GetLicenseTimeoutError(message) {
        var _this = _super.call(this, message) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, BlacklistedSessionError.prototype);
        _this.message = message;
        return _this;
    }
    return GetLicenseTimeoutError;
}(Error));
exports.GetLicenseTimeoutError = GetLicenseTimeoutError;
