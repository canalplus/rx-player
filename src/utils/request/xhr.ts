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

import { RequestError } from "../../errors";
import isNonEmptyString from "../is_non_empty_string";
import isNullOrUndefined from "../is_null_or_undefined";
import {
  CancellationError,
  CancellationSignal,
} from "../task_canceller";


const DEFAULT_RESPONSE_TYPE : XMLHttpRequestResponseType = "json";

/**
 * Perform an HTTP request, according to the options given.
 *
 * Several errors can be rejected. Namely:
 *   - RequestErrorTypes.TIMEOUT_ERROR: the request timeouted (took too long to
 *     respond).
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
export default function request(
  options : IRequestOptions< undefined | null | "" | "text" >
) : Promise<IRequestResponse< string, "text" >>;
export default function request(
  options : IRequestOptions< "arraybuffer" >
) : Promise<IRequestResponse< ArrayBuffer, "arraybuffer" >>;
export default function request(
  options : IRequestOptions< "document" >
) : Promise<IRequestResponse< Document, "document" >>;
export default function request(
  options : IRequestOptions< "json" >
)
// eslint-disable-next-line @typescript-eslint/ban-types
: Promise<IRequestResponse< object, "json" >>;
export default function request(
  options : IRequestOptions< "blob" >,
)
: Promise<IRequestResponse< Blob, "blob" >>;
export default function request<T>(
  options : IRequestOptions< XMLHttpRequestResponseType | null | undefined >
) : Promise<IRequestResponse< T, XMLHttpRequestResponseType >> {

  const requestOptions = {
    url: options.url,
    headers: options.headers,
    responseType: isNullOrUndefined(options.responseType) ? DEFAULT_RESPONSE_TYPE :
                                                            options.responseType,
    timeout: options.timeout,
  };

  return new Promise((resolve, reject) => {
    const { onProgress, cancelSignal } = options;
    const { url,
            headers,
            responseType,
            timeout } = requestOptions;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    let timeoutId : undefined | number;
    if (timeout !== undefined) {
      xhr.timeout = timeout;

      // We've seen on some browser (mainly on some LG TVs), that `xhr.timeout`
      // was either not supported or did not function properly despite the
      // browser being recent enough to support it.
      // That's why we also start a manual timeout. We do this a little later
      // than the "native one" performed on the xhr assuming that the latter
      // is more precise, it might also be more efficient.
      timeoutId = window.setTimeout(() => {
        clearCancellingProcess();
        reject(new RequestError(url, xhr.status, "TIMEOUT", xhr));
      }, timeout + 3000);
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

    const sendingTime = performance.now();

    // Handle request cancellation
    let deregisterCancellationListener : (() => void) | null = null;
    if (cancelSignal !== undefined) {
      deregisterCancellationListener = cancelSignal
        .register(function abortRequest(err : CancellationError) {
          clearCancellingProcess();
          if (!isNullOrUndefined(xhr) && xhr.readyState !== 4) {
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
      reject(new RequestError(url, xhr.status, "ERROR_EVENT", xhr));
    };

    xhr.ontimeout = function onXHRTimeout() {
      clearCancellingProcess();
      reject(new RequestError(url, xhr.status, "TIMEOUT", xhr));
    };

    if (onProgress !== undefined) {
      xhr.onprogress = function onXHRProgress(event) {
        const currentTime = performance.now();
        onProgress({ url,
                     duration: currentTime - sendingTime,
                     sendingTime,
                     currentTime,
                     size: event.loaded,
                     totalSize: event.total });
      };
    }

    xhr.onload = function onXHRLoad(event : ProgressEvent) {
      if (xhr.readyState === 4) {
        clearCancellingProcess();
        if (xhr.status >= 200 && xhr.status < 300) {
          const receivedTime = performance.now();
          const totalSize = xhr.response instanceof
                              ArrayBuffer ? xhr.response.byteLength :
                                            event.total;
          const status = xhr.status;
          const loadedResponseType = xhr.responseType;
          const _url = isNonEmptyString(xhr.responseURL) ? xhr.responseURL :
                                                           url;

          let responseData : T;
          if (loadedResponseType === "json") {
            // IE bug where response is string with responseType json
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            responseData = typeof xhr.response === "object" ?
              xhr.response :
              toJSONForIE(xhr.responseText);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            responseData = xhr.response;
          }

          if (isNullOrUndefined(responseData)) {
            reject(new RequestError(url, xhr.status, "PARSE_ERROR", xhr));
            return;
          }

          resolve({ status,
                    url: _url,
                    responseType: loadedResponseType,
                    sendingTime,
                    receivedTime,
                    requestDuration: receivedTime - sendingTime,
                    size: totalSize,
                    responseData });

        } else {
          reject(new RequestError(url, xhr.status, "ERROR_HTTP_CODE", xhr));
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
function toJSONForIE(data : string) : unknown|null {
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

/** Options given to `request` */
export interface IRequestOptions<ResponseType> {
  /** URL you want to request. */
  url : string;
  /** Dictionary of headers you want to set. `null` or `undefined` for no header. */
  headers? : { [ header: string ] : string } |
             null |
             undefined;
  /** Wanted format for the response */
  responseType? : ResponseType | undefined;
  /**
   * Optional timeout, in milliseconds, after which we will cancel a request.
   * To not set or to set to `undefined` for disable.
   */
  timeout? : number | undefined;
  /**
   * "Cancelation token" used to be able to cancel the request.
   * When this token is "cancelled", the request will be aborted and the Promise
   * returned by `request` will be rejected.
   */
  cancelSignal? : CancellationSignal | undefined;
  /**
   * When defined, this callback will be called on each XHR "progress" event
   * with data related to this request's progress.
   */
  onProgress? : ((info : IProgressInfo) => void) | undefined;
}

/** Data emitted by `request`'s Promise when the request succeeded. */
export interface IRequestResponse<T, U> {
  /** Time taken by the request, in milliseconds. */
  requestDuration : number;
  /** Time (relative to the "time origin") at which the request ended. */
  receivedTime : number;
  /** Data requested. Its type will depend on the responseType. */
  responseData : T;
  /** `responseType` requested, gives an indice on the type of `responseData`. */
  responseType : U;
  /** Time (relative to the "time origin") at which the request began. */
  sendingTime : number;
  /** Full size of the requested data, in bytes. */
  size : number;
  /** HTTP status of the response */
  status : number;
  /**
   * Actual URL requested.
   * Can be different from the one given to `request` due to a possible
   * redirection.
   */
  url : string;
}

export interface IProgressInfo {
  currentTime : number;
  duration : number;
  size : number;
  sendingTime : number;
  url : string;
  totalSize? : number | undefined;
}
