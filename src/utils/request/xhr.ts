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

import { Observable } from "rxjs";
import config from "../../config";
import { RequestError } from "../../errors";
import isNonEmptyString from "../is_non_empty_string";
import isNullOrUndefined from "../is_null_or_undefined";

const { DEFAULT_REQUEST_TIMEOUT } = config;

const DEFAULT_RESPONSE_TYPE : XMLHttpRequestResponseType = "json";

// Interface for "progress" events
export interface IRequestProgress { type : "progress";
                                    value : { currentTime : number;
                                              duration : number;
                                              size : number;
                                              sendingTime : number;
                                              url : string;
                                              totalSize? : number; };
}

// Interface for "response" events
export interface IRequestResponse<T, U> { type : "data-loaded";
                                          value : { duration : number;
                                                    receivedTime : number;
                                                    responseData : T;
                                                    responseType : U;
                                                    sendingTime : number;
                                                    size : number;
                                                    status : number;
                                                    url : string; }; }

// Arguments for the "request" utils
export interface IRequestOptions<T, U> { url : string;
                                         headers? : { [ header: string ] : string } |
                                                    null;
                                         responseType? : T;
                                         timeout? : number;
                                         sendProgressEvents? : U; }

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

/**
 * # request function
 *
 * Translate GET requests into Rx.js Observables.
 *
 * ## Overview
 *
 * Perform the request on subscription.
 * Emit zero, one or more progress event(s) and then the data if the request
 * was successful.
 *
 * Throw if an error happened or if the status code is not in the 200 range at
 * the time of the response.
 * Complete after emitting the data.
 * Abort the xhr on unsubscription.
 *
 * ## Emitted Objects
 *
 * The emitted objects are under the following form:
 * ```
 *   {
 *     type {string}: the type of event
 *     value {Object}: the event value
 *   }
 * ```
 *
 * The type of event can either be "progress" or "data-loaded". The value is
 * under a different form depending on the type.
 *
 * For "progress" events, the value should be the following object:
 * ```
 *   {
 *     url {string}: url on which the request is being done
 *     sendingTime {Number}: timestamp at which the request was sent.
 *     currentTime {Number}: timestamp at which the progress event was
 *                           triggered
 *     size {Number}: current size downloaded, in bytes (without
 *                          overhead)
 *     totalSize {Number|undefined}: total size to download, in bytes
 *                                   (without overhead)
 *   }
 * ```
 *
 * For "data-loaded" events, the value should be the following object:
 * ```
 *   {
 *     status {Number}: xhr status code
 *     url {string}: URL on which the request was done (can be different than
 *                   the one given in arguments when we go through
 *                   redirections).
 *     responseType {string}: the responseType of the request
 *                            (e.g. "json", "document"...).
 *     sendingTime {Number}: time at which the request was sent, in ms.
 *     receivedTime {Number}: timest at which the response was received, in ms.
 *     size {Number}: size of the received data, in bytes.
 *     responseData {*}: Data in the response. Format depends on the
 *                       responseType.
 *   }
 * ```
 *
 * For any successful request you should have 0+ "progress" events and 1
 * "data-loaded" event.
 *
 * For failing request, you should have 0+ "progress" events and 0 "data-loaded"
 * event (the Observable will throw before).
 *
 * ## Errors
 *
 * Several errors can be emitted (the Rx.js way). Namely:
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
 * @returns {Observable}
 */

// overloading to the max
function request(options : IRequestOptions< undefined | null | "" | "text",
                                            false | undefined>)
                : Observable<IRequestResponse< string, "text" >>;
function request(options : IRequestOptions< undefined | null | "" | "text",
                                            true >)
                : Observable<IRequestResponse< string, "text" > |
                             IRequestProgress >;

function request(options : IRequestOptions< "arraybuffer",
                                            false | undefined>)
                : Observable<IRequestResponse< ArrayBuffer, "arraybuffer" >>;
function request(options : IRequestOptions<"arraybuffer", true>)
                : Observable<IRequestResponse<ArrayBuffer, "arraybuffer"> |
                             IRequestProgress >;

function request(options : IRequestOptions< "document",
                                            false | undefined >)
                : Observable<IRequestResponse< Document, "document" >>;
function request(options : IRequestOptions< "document",
                                            true >)
                : Observable<IRequestResponse< Document, "document" > |
                             IRequestProgress >;

function request(options : IRequestOptions< "json",
                                            false | undefined >)
                : Observable<IRequestResponse< object, "json" >>;
function request(options : IRequestOptions< "json", true >)
                : Observable<IRequestResponse< object, "json" > |
                             IRequestProgress >;

function request(options : IRequestOptions< "blob",
                                            false|undefined >)
                : Observable<IRequestResponse< Blob, "blob" >>;
function request(options : IRequestOptions<"blob", true>)
                : Observable<IRequestResponse< Blob, "blob" > |
                             IRequestProgress >;

function request<T>(
  options : IRequestOptions< XMLHttpRequestResponseType | null | undefined,
                             false | undefined >)
  : Observable<IRequestResponse< T, XMLHttpRequestResponseType >>;
function request<T>(
  options : IRequestOptions< XMLHttpRequestResponseType | null | undefined,
                            true >)
  : Observable<IRequestResponse< T, XMLHttpRequestResponseType > |
               IRequestProgress
>;
function request<T>(
  options : IRequestOptions< XMLHttpRequestResponseType | null | undefined,
                            boolean | undefined >
) : Observable<IRequestResponse< T, XMLHttpRequestResponseType > |
               IRequestProgress
> {
  const requestOptions = {
    url: options.url,
    headers: options.headers,
    responseType: isNullOrUndefined(options.responseType) ? DEFAULT_RESPONSE_TYPE :
                                                            options.responseType,
    timeout: isNullOrUndefined(options.timeout) ? DEFAULT_REQUEST_TIMEOUT :
                                                  options.timeout,
  };

  return new Observable((obs) => {
    const { url,
            headers,
            responseType,
            timeout } = requestOptions;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    if (timeout >= 0) {
      xhr.timeout = timeout;
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

    xhr.onerror = function onXHRError() {
      obs.error(new RequestError(url, xhr.status, "ERROR_EVENT", xhr));
    };

    xhr.ontimeout = function onXHRTimeout() {
      obs.error(new RequestError(url, xhr.status, "TIMEOUT", xhr));
    };

    if (options.sendProgressEvents === true) {
      xhr.onprogress = function onXHRProgress(event) {
        const currentTime = performance.now();
        obs.next({ type: "progress",
                   value: { url,
                            duration: currentTime - sendingTime,
                            sendingTime,
                            currentTime,
                            size: event.loaded,
                            totalSize: event.total } });
      };
    }

    xhr.onload = function onXHRLoad(event : ProgressEvent) {
      if (xhr.readyState === 4) {
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
            responseData = typeof xhr.response === "object" ?
              /* tslint:disable no-unsafe-any */
              xhr.response :
              /* tslint:enable no-unsafe-any */
              toJSONForIE(xhr.responseText);
          } else {
            /* tslint:disable no-unsafe-any */
            responseData = xhr.response;
            /* tslint:enable no-unsafe-any */
          }

          if (isNullOrUndefined(responseData)) {
            obs.error(new RequestError(url, xhr.status, "PARSE_ERROR", xhr));
            return;
          }

          obs.next({ type: "data-loaded",
                     value: { status,
                              url: _url,
                              responseType: loadedResponseType,
                              sendingTime,
                              receivedTime,
                              duration: receivedTime - sendingTime,
                              size: totalSize,
                              responseData, }, });
          obs.complete();

        } else {
          obs.error(new RequestError(url, xhr.status, "ERROR_HTTP_CODE", xhr));
        }
      }
    };

    xhr.send();
    return () => {
      if (!isNullOrUndefined(xhr) && xhr.readyState !== 4) {
        xhr.abort();
      }
    };
  });
}

export default request;
