"use strict";
/*
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
exports.fetchIsSupported = void 0;
var log_1 = require("../../log");
var global_scope_1 = require("../global_scope");
var is_null_or_undefined_1 = require("../is_null_or_undefined");
var monotonic_timestamp_1 = require("../monotonic_timestamp");
var request_error_1 = require("./request_error");
var _Headers = typeof Headers === "function" ? Headers : null;
var _AbortController = typeof AbortController === "function" ? AbortController : null;
function fetchRequest(options) {
    var _a, _b;
    var headers;
    if (!(0, is_null_or_undefined_1.default)(options.headers)) {
        if ((0, is_null_or_undefined_1.default)(_Headers)) {
            headers = options.headers;
        }
        else {
            headers = new _Headers();
            var headerNames = Object.keys(options.headers);
            for (var i = 0; i < headerNames.length; i++) {
                var headerName = headerNames[i];
                headers.append(headerName, options.headers[headerName]);
            }
        }
    }
    log_1.default.debug("Fetch: Called with URL", options.url);
    var cancellation = null;
    var isTimedOut = false;
    var isConnectionTimedOut = false;
    var sendingTime = (0, monotonic_timestamp_1.default)();
    var abortController = !(0, is_null_or_undefined_1.default)(_AbortController)
        ? new _AbortController()
        : null;
    /**
     * Abort current fetchRequest by triggering AbortController signal.
     * @returns {void}
     */
    function abortFetch() {
        if ((0, is_null_or_undefined_1.default)(abortController)) {
            log_1.default.warn("Fetch: AbortController API not available.");
            return;
        }
        abortController.abort();
    }
    var timeoutId;
    if (options.timeout !== undefined) {
        timeoutId = setTimeout(function () {
            isTimedOut = true;
            if (connectionTimeoutId !== undefined) {
                clearTimeout(connectionTimeoutId);
            }
            abortFetch();
        }, options.timeout);
    }
    var connectionTimeoutId;
    if (options.connectionTimeout !== undefined) {
        connectionTimeoutId = setTimeout(function () {
            isConnectionTimedOut = true;
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
            abortFetch();
        }, options.connectionTimeout);
    }
    var deregisterCancelLstnr = options.cancelSignal.register(function abortRequest(err) {
        cancellation = err;
        abortFetch();
    });
    var fetchOpts = { method: "GET" };
    if (headers !== undefined) {
        fetchOpts.headers = headers;
    }
    fetchOpts.signal = !(0, is_null_or_undefined_1.default)(abortController) ? abortController.signal : null;
    if (log_1.default.hasLevel("DEBUG")) {
        var logLine = "FETCH: Sending GET " + options.url;
        if (options.timeout !== undefined) {
            logLine += " to=" + String(options.timeout / 1000);
        }
        if (options.connectionTimeout !== undefined) {
            logLine += " cto=" + String(options.connectionTimeout / 1000);
        }
        if (((_a = options.headers) === null || _a === void 0 ? void 0 : _a.Range) !== undefined) {
            logLine += " Range=" + ((_b = options.headers) === null || _b === void 0 ? void 0 : _b.Range);
        }
        log_1.default.debug(logLine);
    }
    return fetch(options.url, fetchOpts)
        .then(function (response) {
        if (connectionTimeoutId !== undefined) {
            clearTimeout(connectionTimeoutId);
        }
        if (response.status >= 300) {
            log_1.default.warn("Fetch: Request HTTP Error", response.status, response.url);
            throw new request_error_1.default(response.url, response.status, request_error_1.RequestErrorTypes.ERROR_HTTP_CODE);
        }
        if ((0, is_null_or_undefined_1.default)(response.body)) {
            throw new request_error_1.default(response.url, response.status, request_error_1.RequestErrorTypes.PARSE_ERROR);
        }
        var contentLengthHeader = response.headers.get("Content-Length");
        var contentLength = !(0, is_null_or_undefined_1.default)(contentLengthHeader) && !isNaN(+contentLengthHeader)
            ? +contentLengthHeader
            : undefined;
        var reader = response.body.getReader();
        var size = 0;
        return readBufferAndSendEvents();
        function readBufferAndSendEvents() {
            return __awaiter(this, void 0, void 0, function () {
                var data, currentTime, dataInfo, receivedTime, requestDuration;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, reader.read()];
                        case 1:
                            data = _a.sent();
                            if (!data.done && !(0, is_null_or_undefined_1.default)(data.value)) {
                                size += data.value.byteLength;
                                currentTime = (0, monotonic_timestamp_1.default)();
                                dataInfo = {
                                    url: response.url,
                                    currentTime: currentTime,
                                    duration: currentTime - sendingTime,
                                    sendingTime: sendingTime,
                                    chunkSize: data.value.byteLength,
                                    chunk: data.value.buffer,
                                    size: size,
                                    totalSize: contentLength,
                                };
                                options.onData(dataInfo);
                                return [2 /*return*/, readBufferAndSendEvents()];
                            }
                            else if (data.done) {
                                if (timeoutId !== undefined) {
                                    clearTimeout(timeoutId);
                                }
                                deregisterCancelLstnr();
                                receivedTime = (0, monotonic_timestamp_1.default)();
                                requestDuration = receivedTime - sendingTime;
                                return [2 /*return*/, {
                                        requestDuration: requestDuration,
                                        receivedTime: receivedTime,
                                        sendingTime: sendingTime,
                                        size: size,
                                        status: response.status,
                                        url: response.url,
                                    }];
                            }
                            return [2 /*return*/, readBufferAndSendEvents()];
                    }
                });
            });
        }
    })
        .catch(function (err) {
        if (cancellation !== null) {
            throw cancellation;
        }
        deregisterCancelLstnr();
        if (isTimedOut) {
            log_1.default.warn("Fetch: Request timed out.");
            throw new request_error_1.default(options.url, 0, request_error_1.RequestErrorTypes.TIMEOUT);
        }
        else if (isConnectionTimedOut) {
            log_1.default.warn("Fetch: Request connection timed out.");
            throw new request_error_1.default(options.url, 0, request_error_1.RequestErrorTypes.TIMEOUT);
        }
        else if (err instanceof request_error_1.default) {
            throw err;
        }
        log_1.default.warn("Fetch: Request Error", err instanceof Error ? err.toString() : "");
        throw new request_error_1.default(options.url, 0, request_error_1.RequestErrorTypes.ERROR_EVENT);
    });
}
exports.default = fetchRequest;
/**
 * Returns true if fetch should be supported in the current browser.
 * @return {boolean}
 */
function fetchIsSupported() {
    return (typeof global_scope_1.default.fetch === "function" &&
        !(0, is_null_or_undefined_1.default)(_AbortController) &&
        !(0, is_null_or_undefined_1.default)(_Headers));
}
exports.fetchIsSupported = fetchIsSupported;
