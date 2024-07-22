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
import type { CancellationSignal } from "../task_canceller";
/**
 * Perform an HTTP request, according to the options given.
 *
 * Several errors can be rejected. Namely:
 *   - RequestErrorTypes.TIMEOUT: the request timed out (took too long)
 *
 *   - RequestErrorTypes.PARSE_ERROR: the browser APIs used to parse the
 *                                    data failed.
 *   - RequestErrorTypes.ERROR_HTTP_CODE: the HTTP code at the time of reception
 *                                        was not in the 200-299 (included)
 *                                        range.
 *   - RequestErrorTypes.ERROR_EVENT: The XHR had an error event before the
 *                                    response could be fetched.
 * @param {Object} options
 * @returns {Promise.<Object>}
 */
export default function request(options: IRequestOptions<undefined | null | "" | "text">): Promise<IRequestResponse<string, "text">>;
export default function request(options: IRequestOptions<"arraybuffer">): Promise<IRequestResponse<ArrayBuffer, "arraybuffer">>;
export default function request(options: IRequestOptions<"document">): Promise<IRequestResponse<Document, "document">>;
export default function request(options: IRequestOptions<"json">): Promise<IRequestResponse<object, "json">>;
export default function request(options: IRequestOptions<"blob">): Promise<IRequestResponse<Blob, "blob">>;
/** Options given to `request` */
export interface IRequestOptions<ResponseType> {
    /** URL you want to request. */
    url: string;
    /** Dictionary of headers you want to set. `null` or `undefined` for no header. */
    headers?: Record<string, string> | null | undefined;
    /** Wanted format for the response */
    responseType?: ResponseType | undefined;
    /**
     * Optional timeout, in milliseconds, after which we will cancel a request.
     * To not set or to set to `undefined` for disable.
     */
    timeout?: number | undefined;
    /**
     * Optional connection timeout, in milliseconds, after which the request is canceled
     * if the responses headers has not being received.
     * Do not set or set to "undefined" to disable it.
     */
    connectionTimeout?: number | undefined;
    /**
     * "Cancelation token" used to be able to cancel the request.
     * When this token is "cancelled", the request will be aborted and the Promise
     * returned by `request` will be rejected.
     */
    cancelSignal?: CancellationSignal | undefined;
    /**
     * When defined, this callback will be called on each XHR "progress" event
     * with data related to this request's progress.
     */
    onProgress?: ((info: IProgressInfo) => void) | undefined;
}
/** Data emitted by `request`'s Promise when the request succeeded. */
export interface IRequestResponse<T, U> {
    /** Time taken by the request, in milliseconds. */
    requestDuration: number;
    /** Time (relative to the "time origin") at which the request ended. */
    receivedTime: number;
    /** Data requested. Its type will depend on the responseType. */
    responseData: T;
    /** `responseType` requested, gives an indice on the type of `responseData`. */
    responseType: U;
    /** Time (relative to the "time origin") at which the request began. */
    sendingTime: number;
    /** Full size of the requested data, in bytes. */
    size: number;
    /** HTTP status of the response */
    status: number;
    /**
     * Actual URL requested.
     * Can be different from the one given to `request` due to a possible
     * redirection.
     */
    url: string;
}
export interface IProgressInfo {
    currentTime: number;
    duration: number;
    size: number;
    sendingTime: number;
    url: string;
    totalSize?: number | undefined;
}
//# sourceMappingURL=xhr.d.ts.map