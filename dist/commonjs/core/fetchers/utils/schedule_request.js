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
exports.scheduleRequestPromise = exports.scheduleRequestWithCdns = void 0;
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var cancellable_sleep_1 = require("../../../utils/cancellable_sleep");
var get_fuzzed_delay_1 = require("../../../utils/get_fuzzed_delay");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var noop_1 = require("../../../utils/noop");
var request_1 = require("../../../utils/request");
var task_canceller_1 = require("../../../utils/task_canceller");
/**
 * Called on a loader error.
 * Returns whether the loader request should be retried.
 *
 * TODO the notion of retrying or not could be transport-specific (e.g. 412 are
 * mainly used for Smooth contents) and thus as part of the transport code (e.g.
 * by rejecting with an error always having a `canRetry` property?).
 * Or not, to ponder.
 *
 * @param {Error} error
 * @returns {Boolean} - If true, the request can be retried.
 */
function shouldRetry(error) {
    if (error instanceof request_1.RequestError) {
        if (error.type === errors_1.NetworkErrorTypes.ERROR_HTTP_CODE) {
            return (error.status >= 500 ||
                error.status === 404 ||
                error.status === 415 || // some CDN seems to use that code when
                // requesting low-latency segments too much
                // in advance
                error.status === 412);
        }
        return (error.type === errors_1.NetworkErrorTypes.TIMEOUT ||
            error.type === errors_1.NetworkErrorTypes.ERROR_EVENT);
    }
    else if (error instanceof errors_1.CustomLoaderError) {
        if (typeof error.canRetry === "boolean") {
            return error.canRetry;
        }
        if (error.xhr !== undefined) {
            return (error.xhr.status >= 500 ||
                error.xhr.status === 404 ||
                error.xhr.status === 415 || // some CDN seems to use that code when
                // requesting low-latency segments too much
                // in advance
                error.xhr.status === 412);
        }
        return false;
    }
    return (0, errors_1.isKnownError)(error) && error.code === "INTEGRITY_ERROR";
}
/**
 * Specific algorithm used to perform segment and manifest requests.
 *
 * Here how it works:
 *
 *   1. You give it one or multiple of the CDN available for the resource you
 *      want to request (from the most important one to the least important),
 *      a callback doing the request with the chosen CDN in argument, and some
 *      options.
 *
 *   2. it tries to call the request callback with the most prioritized CDN
 *      first:
 *        - if it works as expected, it resolves the returned Promise with that
 *          request's response.
 *        - if it fails, it calls ther `onRetry` callback given with the
 *          corresponding error, un-prioritize that CDN and try with the new
 *          most prioritized CDN.
 *
 *      Each CDN might be retried multiple times, depending on the nature of the
 *      error and the Configuration given.
 *
 *      Multiple retries of the same CDN are done after a delay to avoid
 *      overwhelming it, this is what we call a "backoff". That delay raises
 *      exponentially as multiple consecutive errors are encountered on this
 *      CDN.
 *
 * @param {Array.<string>|null} cdns - The different CDN on which the
 * wanted resource is available. `scheduleRequestWithCdns` will call the
 * `performRequest` callback with the right element from that array if different
 * from `null`.
 *
 * Can be set to `null` when that resource is not reachable through a CDN, in
 * which case the `performRequest` callback may be called with `null`.
 * @param {Object|null} cdnPrioritizer - Interface allowing to give the priority
 * between multiple CDNs.
 * @param {Function} performRequest - Callback implementing the request in
 * itself. Resolving when the resource request succeed and rejecting with the
 * corresponding error when the request failed.
 * @param {Object} options - Configuration allowing to tweak the number on which
 * the algorithm behind `scheduleRequestWithCdns` bases itself.
 * @param {Object} cancellationSignal - CancellationSignal allowing to cancel
 * the logic of `scheduleRequestWithCdns`.
 * To trigger if the resource is not needed anymore.
 * @returns {Promise} - Promise resolving, with the corresponding
 * `performRequest`'s data, when the resource request succeed and rejecting in
 * the following scenarios:
 *   - `scheduleRequestWithCdns` has been cancelled due to `cancellationSignal`
 *     being triggered. In that case a `CancellationError` is thrown.
 *
 *   - The resource request(s) failed and will not be retried anymore.
 */
function scheduleRequestWithCdns(cdns, cdnPrioritizer, performRequest, options, cancellationSignal) {
    return __awaiter(this, void 0, void 0, function () {
        /**
         * Returns what is now the most prioritary CDN to request the wanted resource.
         *
         * A return value of `null` indicates that the resource can be requested
         * through another mean than by doing an HTTP request.
         *
         * A return value of `undefined` indicates that there's no CDN left to request
         * the resource.
         * @returns {Object|null|undefined}
         */
        function getCdnToRequest() {
            if (cdns === null) {
                var nullAttemptObject = missedAttempts.get(null);
                if (nullAttemptObject !== undefined && nullAttemptObject.isBlacklisted) {
                    return undefined;
                }
                return null;
            }
            else if (cdnPrioritizer === null) {
                return getPrioritaryRequestableCdnFromSortedList(cdns);
            }
            else {
                var prioritized = cdnPrioritizer.getCdnPreferenceForResource(cdns);
                return getPrioritaryRequestableCdnFromSortedList(prioritized);
            }
        }
        /**
         * Perform immediately the request for the given CDN.
         *
         * If it fails, forbid the CDN from being used - optionally and in some
         * conditions, only temporarily, then try the next CDN according to
         * previously-set delays (with a potential sleep before to respect them).
         *
         * Reject if both the request fails and there's no CDN left to use.
         * @param {string|null} cdn
         * @returns {Promise}
         */
        function requestCdn(cdn) {
            return __awaiter(this, void 0, void 0, function () {
                var res, error_1, missedAttemptsObj, errorCounter, delay, fuzzedDelay;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, performRequest(cdn, cancellationSignal)];
                        case 1:
                            res = _a.sent();
                            return [2 /*return*/, res];
                        case 2:
                            error_1 = _a.sent();
                            if (task_canceller_1.default.isCancellationError(error_1)) {
                                throw error_1;
                            }
                            if (cdn !== null && cdnPrioritizer !== null) {
                                // We failed requesting the resource on this CDN.
                                // Globally give priority to the next CDN through the CdnPrioritizer.
                                cdnPrioritizer.downgradeCdn(cdn);
                            }
                            missedAttemptsObj = missedAttempts.get(cdn);
                            if (missedAttemptsObj === undefined) {
                                missedAttemptsObj = {
                                    errorCounter: 1,
                                    blockedUntil: undefined,
                                    isBlacklisted: false,
                                };
                                missedAttempts.set(cdn, missedAttemptsObj);
                            }
                            else {
                                missedAttemptsObj.errorCounter++;
                            }
                            if (!shouldRetry(error_1)) {
                                missedAttemptsObj.blockedUntil = undefined;
                                missedAttemptsObj.isBlacklisted = true;
                                return [2 /*return*/, retryWithNextCdn(error_1)];
                            }
                            if (missedAttemptsObj.errorCounter > maxRetry) {
                                missedAttemptsObj.blockedUntil = undefined;
                                missedAttemptsObj.isBlacklisted = true;
                            }
                            else {
                                errorCounter = missedAttemptsObj.errorCounter;
                                delay = Math.min(baseDelay * Math.pow(2, errorCounter - 1), maxDelay);
                                fuzzedDelay = (0, get_fuzzed_delay_1.default)(delay);
                                missedAttemptsObj.blockedUntil = (0, monotonic_timestamp_1.default)() + fuzzedDelay;
                            }
                            return [2 /*return*/, retryWithNextCdn(error_1)];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        }
        /**
         * After a request error, find the new most prioritary CDN and perform the
         * request with it, optionally after a delay.
         *
         * If there's no CDN left to test, reject the original request error.
         * @param {*} prevRequestError
         * @returns {Promise}
         */
        function retryWithNextCdn(prevRequestError) {
            return __awaiter(this, void 0, void 0, function () {
                var nextCdn;
                return __generator(this, function (_a) {
                    nextCdn = getCdnToRequest();
                    if (cancellationSignal.isCancelled()) {
                        throw cancellationSignal.cancellationError;
                    }
                    if (nextCdn === undefined) {
                        throw prevRequestError;
                    }
                    onRetry(prevRequestError);
                    if (cancellationSignal.isCancelled()) {
                        throw cancellationSignal.cancellationError;
                    }
                    return [2 /*return*/, waitPotentialBackoffAndRequest(nextCdn, prevRequestError)];
                });
            });
        }
        /**
         * Request the corresponding CDN after the optional backoff needed before
         * requesting it.
         *
         * If a new CDN become prioritary in the meantime, request it instead, again
         * awaiting its optional backoff delay if it exists.
         * @param {string|null} nextWantedCdn
         * @param {*} prevRequestError
         * @returns {Promise}
         */
        function waitPotentialBackoffAndRequest(nextWantedCdn, prevRequestError) {
            var nextCdnAttemptObj = missedAttempts.get(nextWantedCdn);
            if (nextCdnAttemptObj === undefined || nextCdnAttemptObj.blockedUntil === undefined) {
                return requestCdn(nextWantedCdn);
            }
            var now = (0, monotonic_timestamp_1.default)();
            var blockedFor = nextCdnAttemptObj.blockedUntil - now;
            if (blockedFor <= 0) {
                return requestCdn(nextWantedCdn);
            }
            var canceller = new task_canceller_1.default();
            var unlinkCanceller = canceller.linkToSignal(cancellationSignal);
            return new Promise(function (res, rej) {
                /* eslint-disable-next-line @typescript-eslint/no-misused-promises */
                cdnPrioritizer === null || cdnPrioritizer === void 0 ? void 0 : cdnPrioritizer.addEventListener("priorityChange", function () {
                    var updatedPrioritaryCdn = getCdnToRequest();
                    if (cancellationSignal.isCancelled()) {
                        throw cancellationSignal.cancellationError;
                    }
                    if (updatedPrioritaryCdn === undefined) {
                        return cleanAndReject(prevRequestError);
                    }
                    if (updatedPrioritaryCdn !== nextWantedCdn) {
                        canceller.cancel();
                        waitPotentialBackoffAndRequest(updatedPrioritaryCdn, prevRequestError).then(cleanAndResolve, cleanAndReject);
                    }
                }, canceller.signal);
                (0, cancellable_sleep_1.default)(blockedFor, canceller.signal).then(function () { return requestCdn(nextWantedCdn).then(cleanAndResolve, cleanAndReject); }, noop_1.default);
                function cleanAndResolve(response) {
                    unlinkCanceller();
                    res(response);
                }
                function cleanAndReject(err) {
                    unlinkCanceller();
                    rej(err);
                }
            });
        }
        /**
         * Takes in input the list of CDN that can be used to request the resource, in
         * a general preference order.
         *
         * Returns the actual most prioritary Cdn to request, based on the current
         * attempts already done for that resource.
         *
         * Returns `undefined` if there's no Cdn left to request the resource.
         * @param {Array.<Object>} sortedCdns
         * @returns {Object|undefined}
         */
        function getPrioritaryRequestableCdnFromSortedList(sortedCdns) {
            var _a;
            if (missedAttempts.size === 0) {
                return sortedCdns[0];
            }
            var now = (0, monotonic_timestamp_1.default)();
            return (_a = sortedCdns
                .filter(function (c) { var _a; return ((_a = missedAttempts.get(c)) === null || _a === void 0 ? void 0 : _a.isBlacklisted) !== true; })
                .reduce(function (acc, x) {
                var _a;
                var blockedUntil = (_a = missedAttempts.get(x)) === null || _a === void 0 ? void 0 : _a.blockedUntil;
                if (blockedUntil !== undefined && blockedUntil <= now) {
                    blockedUntil = undefined;
                }
                if (acc === undefined) {
                    return [x, blockedUntil];
                }
                if (acc[1] === undefined) {
                    return acc;
                }
                if (blockedUntil === undefined) {
                    return [x, undefined];
                }
                if (blockedUntil < acc[1]) {
                    return [x, blockedUntil];
                }
                return acc;
            }, undefined)) === null || _a === void 0 ? void 0 : _a[0];
        }
        var baseDelay, maxDelay, maxRetry, onRetry, missedAttempts, initialCdnToRequest;
        return __generator(this, function (_a) {
            if (cancellationSignal.cancellationError !== null) {
                return [2 /*return*/, Promise.reject(cancellationSignal.cancellationError)];
            }
            baseDelay = options.baseDelay, maxDelay = options.maxDelay, maxRetry = options.maxRetry, onRetry = options.onRetry;
            if (cdns !== null && cdns.length === 0) {
                log_1.default.warn("Fetchers: no CDN given to `scheduleRequestWithCdns`.");
            }
            missedAttempts = new Map();
            initialCdnToRequest = getCdnToRequest();
            if (initialCdnToRequest === undefined) {
                throw new Error("No CDN to request");
            }
            return [2 /*return*/, requestCdn(initialCdnToRequest)];
        });
    });
}
exports.scheduleRequestWithCdns = scheduleRequestWithCdns;
/**
 * Lightweight version of the request algorithm, this time with only a simple
 * Promise given.
 * @param {Function} performRequest
 * @param {Object} options
 * @returns {Promise}
 */
function scheduleRequestPromise(performRequest, options, cancellationSignal) {
    // same than for a single unknown CDN
    return scheduleRequestWithCdns(null, null, performRequest, options, cancellationSignal);
}
exports.scheduleRequestPromise = scheduleRequestPromise;
