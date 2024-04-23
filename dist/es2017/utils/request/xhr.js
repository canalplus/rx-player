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
import isNonEmptyString from "../is_non_empty_string";
import isNullOrUndefined from "../is_null_or_undefined";
import getMonotonicTimeStamp from "../monotonic_timestamp";
import RequestError, { RequestErrorTypes } from "./request_error";
const DEFAULT_RESPONSE_TYPE = "json";
export default function request(options) {
    const requestOptions = {
        url: options.url,
        headers: options.headers,
        responseType: isNullOrUndefined(options.responseType)
            ? DEFAULT_RESPONSE_TYPE
            : options.responseType,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
    };
    return new Promise((resolve, reject) => {
        const { onProgress, cancelSignal } = options;
        const { url, headers, responseType, timeout, connectionTimeout } = requestOptions;
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        let timeoutId;
        if (timeout !== undefined) {
            xhr.timeout = timeout;
            // We've seen on some browser (mainly on some LG TVs), that `xhr.timeout`
            // was either not supported or did not function properly despite the
            // browser being recent enough to support it.
            // That's why we also start a manual timeout. We do this a little later
            // than the "native one" performed on the xhr assuming that the latter
            // is more precise, it might also be more efficient.
            timeoutId = setTimeout(() => {
                clearCancellingProcess();
                reject(new RequestError(url, xhr.status, RequestErrorTypes.TIMEOUT));
            }, timeout + 3000);
        }
        let connectionTimeoutId;
        if (connectionTimeout !== undefined) {
            connectionTimeoutId = setTimeout(() => {
                clearCancellingProcess();
                if (xhr.readyState !== XMLHttpRequest.DONE) {
                    xhr.abort();
                }
                reject(new RequestError(url, xhr.status, RequestErrorTypes.TIMEOUT));
            }, connectionTimeout);
        }
        xhr.responseType = responseType;
        if (xhr.responseType === "document") {
            xhr.overrideMimeType("text/xml");
        }
        if (!isNullOrUndefined(headers)) {
            const _headers = headers;
            for (const key in _headers) {
                if (_headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, _headers[key]);
                }
            }
        }
        const sendingTime = getMonotonicTimeStamp();
        // Handle request cancellation
        let deregisterCancellationListener = null;
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
            reject(new RequestError(url, xhr.status, RequestErrorTypes.ERROR_EVENT));
        };
        xhr.ontimeout = function onXHRTimeout() {
            clearCancellingProcess();
            reject(new RequestError(url, xhr.status, RequestErrorTypes.TIMEOUT));
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
                const currentTime = getMonotonicTimeStamp();
                onProgress({
                    url,
                    duration: currentTime - sendingTime,
                    sendingTime,
                    currentTime,
                    size: event.loaded,
                    totalSize: event.total,
                });
            };
        }
        xhr.onload = function onXHRLoad(event) {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                clearCancellingProcess();
                if (xhr.status >= 200 && xhr.status < 300) {
                    const receivedTime = getMonotonicTimeStamp();
                    const totalSize = xhr.response instanceof ArrayBuffer ? xhr.response.byteLength : event.total;
                    const status = xhr.status;
                    const loadedResponseType = xhr.responseType;
                    const _url = isNonEmptyString(xhr.responseURL) ? xhr.responseURL : url;
                    let responseData;
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
                    if (isNullOrUndefined(responseData)) {
                        reject(new RequestError(url, xhr.status, RequestErrorTypes.PARSE_ERROR));
                        return;
                    }
                    resolve({
                        status,
                        url: _url,
                        responseType: loadedResponseType,
                        sendingTime,
                        receivedTime,
                        requestDuration: receivedTime - sendingTime,
                        size: totalSize,
                        responseData,
                    });
                }
                else {
                    reject(new RequestError(url, xhr.status, RequestErrorTypes.ERROR_HTTP_CODE));
                }
            }
        };
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
