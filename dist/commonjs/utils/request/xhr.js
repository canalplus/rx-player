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
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../log");
var is_non_empty_string_1 = require("../is_non_empty_string");
var is_null_or_undefined_1 = require("../is_null_or_undefined");
var monotonic_timestamp_1 = require("../monotonic_timestamp");
var request_error_1 = require("./request_error");
var DEFAULT_RESPONSE_TYPE = "json";
function request(options) {
    var requestOptions = {
        url: options.url,
        headers: options.headers,
        responseType: (0, is_null_or_undefined_1.default)(options.responseType)
            ? DEFAULT_RESPONSE_TYPE
            : options.responseType,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
    };
    return new Promise(function (resolve, reject) {
        var onProgress = options.onProgress, cancelSignal = options.cancelSignal;
        var url = requestOptions.url, headers = requestOptions.headers, responseType = requestOptions.responseType, timeout = requestOptions.timeout, connectionTimeout = requestOptions.connectionTimeout;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        var timeoutId;
        if (timeout !== undefined) {
            xhr.timeout = timeout;
            // We've seen on some browser (mainly on some LG TVs), that `xhr.timeout`
            // was either not supported or did not function properly despite the
            // browser being recent enough to support it.
            // That's why we also start a manual timeout. We do this a little later
            // than the "native one" performed on the xhr assuming that the latter
            // is more precise, it might also be more efficient.
            timeoutId = setTimeout(function () {
                clearCancellingProcess();
                reject(new request_error_1.default(url, xhr.status, request_error_1.RequestErrorTypes.TIMEOUT));
            }, timeout + 3000);
        }
        var connectionTimeoutId;
        if (connectionTimeout !== undefined) {
            connectionTimeoutId = setTimeout(function () {
                clearCancellingProcess();
                if (xhr.readyState !== XMLHttpRequest.DONE) {
                    xhr.abort();
                }
                reject(new request_error_1.default(url, xhr.status, request_error_1.RequestErrorTypes.TIMEOUT));
            }, connectionTimeout);
        }
        xhr.responseType = responseType;
        if (xhr.responseType === "document") {
            xhr.overrideMimeType("text/xml");
        }
        if (!(0, is_null_or_undefined_1.default)(headers)) {
            var _headers = headers;
            for (var key in _headers) {
                if (_headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, _headers[key]);
                }
            }
        }
        var sendingTime = (0, monotonic_timestamp_1.default)();
        // Handle request cancellation
        var deregisterCancellationListener = null;
        if (cancelSignal !== undefined) {
            deregisterCancellationListener = cancelSignal.register(function abortRequest(err) {
                clearCancellingProcess();
                if (xhr.readyState !== XMLHttpRequest.DONE) {
                    xhr.abort();
                }
                reject(err);
            });
            if (cancelSignal.isCancelled()) {
                return;
            }
        }
        xhr.onerror = function onXHRError() {
            clearCancellingProcess();
            reject(new request_error_1.default(url, xhr.status, request_error_1.RequestErrorTypes.ERROR_EVENT));
        };
        xhr.ontimeout = function onXHRTimeout() {
            clearCancellingProcess();
            reject(new request_error_1.default(url, xhr.status, request_error_1.RequestErrorTypes.TIMEOUT));
        };
        if (connectionTimeout !== undefined) {
            xhr.onreadystatechange = function clearConnectionTimeout() {
                if (xhr.readyState >= XMLHttpRequest.HEADERS_RECEIVED) {
                    clearTimeout(connectionTimeoutId);
                }
            };
        }
        if (onProgress !== undefined) {
            xhr.onprogress = function onXHRProgress(event) {
                var currentTime = (0, monotonic_timestamp_1.default)();
                onProgress({
                    url: url,
                    duration: currentTime - sendingTime,
                    sendingTime: sendingTime,
                    currentTime: currentTime,
                    size: event.loaded,
                    totalSize: event.total,
                });
            };
        }
        xhr.onload = function onXHRLoad(event) {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                clearCancellingProcess();
                if (xhr.status >= 200 && xhr.status < 300) {
                    var receivedTime = (0, monotonic_timestamp_1.default)();
                    var totalSize = xhr.response instanceof ArrayBuffer ? xhr.response.byteLength : event.total;
                    var status_1 = xhr.status;
                    var loadedResponseType = xhr.responseType;
                    var _url = (0, is_non_empty_string_1.default)(xhr.responseURL) ? xhr.responseURL : url;
                    var responseData = void 0;
                    if (loadedResponseType === "json") {
                        // IE bug where response is string with responseType json
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        responseData =
                            typeof xhr.response === "object"
                                ? xhr.response
                                : toJSONForIE(xhr.responseText);
                    }
                    else {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        responseData = xhr.response;
                    }
                    if ((0, is_null_or_undefined_1.default)(responseData)) {
                        reject(new request_error_1.default(url, xhr.status, request_error_1.RequestErrorTypes.PARSE_ERROR));
                        return;
                    }
                    resolve({
                        status: status_1,
                        url: _url,
                        responseType: loadedResponseType,
                        sendingTime: sendingTime,
                        receivedTime: receivedTime,
                        requestDuration: receivedTime - sendingTime,
                        size: totalSize,
                        responseData: responseData,
                    });
                }
                else {
                    reject(new request_error_1.default(url, xhr.status, request_error_1.RequestErrorTypes.ERROR_HTTP_CODE));
                }
            }
        };
        if (log_1.default.hasLevel("DEBUG")) {
            var logLine = "XHR: Sending GET " + url;
            if (options.responseType !== undefined) {
                logLine += " type=" + options.responseType;
            }
            if (timeout !== undefined) {
                logLine += " to=" + String(timeout / 1000);
            }
            if (connectionTimeout !== undefined) {
                logLine += " cto=" + String(connectionTimeout / 1000);
            }
            if ((headers === null || headers === void 0 ? void 0 : headers.Range) !== undefined) {
                logLine += " Range=" + (headers === null || headers === void 0 ? void 0 : headers.Range);
            }
            log_1.default.debug(logLine);
        }
        xhr.send();
        /**
         * Clear resources and timers created to handle cancellation and timeouts.
         */
        function clearCancellingProcess() {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
            if (connectionTimeoutId !== undefined) {
                clearTimeout(connectionTimeoutId);
            }
            if (deregisterCancellationListener !== null) {
                deregisterCancellationListener();
            }
        }
    });
}
exports.default = request;
/**
 * @param {string} data
 * @returns {Object|null}
 */
function toJSONForIE(data) {
    try {
        return JSON.parse(data);
    }
    catch (e) {
        return null;
    }
}
