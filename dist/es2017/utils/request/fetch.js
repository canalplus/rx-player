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
import log from "../../log";
import globalScope from "../global_scope";
import isNullOrUndefined from "../is_null_or_undefined";
import getMonotonicTimeStamp from "../monotonic_timestamp";
import RequestError, { RequestErrorTypes } from "./request_error";
const _Headers = typeof Headers === "function" ? Headers : null;
const _AbortController = typeof AbortController === "function" ? AbortController : null;
export default function fetchRequest(options) {
    var _a, _b;
    let headers;
    if (!isNullOrUndefined(options.headers)) {
        if (isNullOrUndefined(_Headers)) {
            headers = options.headers;
        }
        else {
            headers = new _Headers();
            const headerNames = Object.keys(options.headers);
            for (let i = 0; i < headerNames.length; i++) {
                const headerName = headerNames[i];
                headers.append(headerName, options.headers[headerName]);
            }
        }
    }
    log.debug("Fetch: Called with URL", options.url);
    let cancellation = null;
    let isTimedOut = false;
    let isConnectionTimedOut = false;
    const sendingTime = getMonotonicTimeStamp();
    const abortController = !isNullOrUndefined(_AbortController)
        ? new _AbortController()
        : null;
    /**
     * Abort current fetchRequest by triggering AbortController signal.
     * @returns {void}
     */
    function abortFetch() {
        if (isNullOrUndefined(abortController)) {
            log.warn("Fetch: AbortController API not available.");
            return;
        }
        abortController.abort();
    }
    let timeoutId;
    if (options.timeout !== undefined) {
        timeoutId = setTimeout(() => {
            isTimedOut = true;
            if (connectionTimeoutId !== undefined) {
                clearTimeout(connectionTimeoutId);
            }
            abortFetch();
        }, options.timeout);
    }
    let connectionTimeoutId;
    if (options.connectionTimeout !== undefined) {
        connectionTimeoutId = setTimeout(() => {
            isConnectionTimedOut = true;
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
            abortFetch();
        }, options.connectionTimeout);
    }
    const deregisterCancelLstnr = options.cancelSignal.register(function abortRequest(err) {
        cancellation = err;
        abortFetch();
    });
    const fetchOpts = { method: "GET" };
    if (headers !== undefined) {
        fetchOpts.headers = headers;
    }
    fetchOpts.signal = !isNullOrUndefined(abortController) ? abortController.signal : null;
    if (log.hasLevel("DEBUG")) {
        let logLine = "FETCH: Sending GET " + options.url;
        if (options.timeout !== undefined) {
            logLine += " to=" + String(options.timeout / 1000);
        }
        if (options.connectionTimeout !== undefined) {
            logLine += " cto=" + String(options.connectionTimeout / 1000);
        }
        if (((_a = options.headers) === null || _a === void 0 ? void 0 : _a.Range) !== undefined) {
            logLine += " Range=" + ((_b = options.headers) === null || _b === void 0 ? void 0 : _b.Range);
        }
        log.debug(logLine);
    }
    return fetch(options.url, fetchOpts)
        .then((response) => {
        if (connectionTimeoutId !== undefined) {
            clearTimeout(connectionTimeoutId);
        }
        if (response.status >= 300) {
            log.warn("Fetch: Request HTTP Error", response.status, response.url);
            throw new RequestError(response.url, response.status, RequestErrorTypes.ERROR_HTTP_CODE);
        }
        if (isNullOrUndefined(response.body)) {
            throw new RequestError(response.url, response.status, RequestErrorTypes.PARSE_ERROR);
        }
        const contentLengthHeader = response.headers.get("Content-Length");
        const contentLength = !isNullOrUndefined(contentLengthHeader) && !isNaN(+contentLengthHeader)
            ? +contentLengthHeader
            : undefined;
        const reader = response.body.getReader();
        let size = 0;
        return readBufferAndSendEvents();
        async function readBufferAndSendEvents() {
            const data = await reader.read();
            if (!data.done && !isNullOrUndefined(data.value)) {
                size += data.value.byteLength;
                const currentTime = getMonotonicTimeStamp();
                const dataInfo = {
                    url: response.url,
                    currentTime,
                    duration: currentTime - sendingTime,
                    sendingTime,
                    chunkSize: data.value.byteLength,
                    chunk: data.value.buffer,
                    size,
                    totalSize: contentLength,
                };
                options.onData(dataInfo);
                return readBufferAndSendEvents();
            }
            else if (data.done) {
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId);
                }
                deregisterCancelLstnr();
                const receivedTime = getMonotonicTimeStamp();
                const requestDuration = receivedTime - sendingTime;
                return {
                    requestDuration,
                    receivedTime,
                    sendingTime,
                    size,
                    status: response.status,
                    url: response.url,
                };
            }
            return readBufferAndSendEvents();
        }
    })
        .catch((err) => {
        if (cancellation !== null) {
            throw cancellation;
        }
        deregisterCancelLstnr();
        if (isTimedOut) {
            log.warn("Fetch: Request timed out.");
            throw new RequestError(options.url, 0, RequestErrorTypes.TIMEOUT);
        }
        else if (isConnectionTimedOut) {
            log.warn("Fetch: Request connection timed out.");
            throw new RequestError(options.url, 0, RequestErrorTypes.TIMEOUT);
        }
        else if (err instanceof RequestError) {
            throw err;
        }
        log.warn("Fetch: Request Error", err instanceof Error ? err.toString() : "");
        throw new RequestError(options.url, 0, RequestErrorTypes.ERROR_EVENT);
    });
}
/**
 * Returns true if fetch should be supported in the current browser.
 * @return {boolean}
 */
export function fetchIsSupported() {
    return (typeof globalScope.fetch === "function" &&
        !isNullOrUndefined(_AbortController) &&
        !isNullOrUndefined(_Headers));
}
