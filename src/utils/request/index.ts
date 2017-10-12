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

import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import { RequestError, RequestErrorTypes } from "../../errors";

const DEFAULT_RESPONSE_TYPE : XMLHttpRequestResponseType = "json";
const DEFAULT_REQUEST_TIMEOUT = 30 * 1000; // TODO move to config?

// Interface for "progress" events
export interface IRequestProgress {
  type : "progress";
  value : {
    currentTime : number;
    duration : number;
    size : number;
    sentTime : number;
    url : string;
    totalSize? : number;
  };
}

// Interface for "response" events
export interface IRequestResponse<T, U> {
  type : "response";
  value : {
    duration : number;
    receivedTime : number;
    responseData : T;
    responseType : U;
    sentTime : number;
    size : number;
    status : number;
    url : string;
  };
}

// Arguments for the "request" utils
export interface IRequestOptions<T, U> {
  url : string;
  method? : string;
  headers? : { [ header: string ] : string }|null;
  responseType? : T;
  timeout? : number;
  ignoreProgressEvents? : U;
  body? : any;
}

function toJSONForIE(data : string) : any|null {
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

/**
 * # request function
 *
 * Translate AJAX Requests into Rx.js Observables.
 *
 * ## Overview
 *
 * Perform the request on subscription, the Rx.js way.
 * Emit progress and response. Throw if an error happened or if the status code
 * is not in the 200 range. Complete after emitting the response.
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
 * The type of event can either be "progress" or "response". The value is under
 * a different form depending on the type.
 *
 * For "progress" events, the value should be the following object:
 * ```
 *   {
 *     url {string}: url on which the request is being done
 *     sentTime {Number}: timestamp at which the request was sent.
 *     currentTime {Number}: timestamp at which the progress event was
 *                           triggered
 *     size {Number}: current size downloaded, in bytes (without
 *                          overhead)
 *     totalSize {Number|undefined}: total size to download, in bytes
 *                                   (without overhead)
 *   }
 * ```
 *
 * For "response" events, the value should be the following object:
 * ```
 *   {
 *     status {Number}: xhr status code
 *     url {string}: url on which the request was done
 *     responseType {string}: the responseType of the request
 *                            (e.g. "json", "document"...)
 *     sentTime {Number}: timestamp at which the request was sent.
 *     receivedTime {Number}: timestamp at which the response was received.
 *     size {Number}: size of the received data, in bytes
 *     responseData {*}: Data in the response. Format depends on the
 *                       responseType.
 *   }
 * ```
 *
 * For any succesful request you should have 0+ "progress" events and 1
 * "response" event.
 *
 * ## Errors
 *
 * Several errors can be emitted (the Rx.js way). Namely:
 *   - timeout error (code RequestErrorTypes.TIMEOUT_ERROR)
 *   - parse error (code RequestErrorTypes.PARSE_ERROR)
 *   - http code error (RequestErrorTypes.ERROR_HTTP_CODE)
 *   - error from the xhr's "error" event (RequestErrorTypes.ERROR_EVENT)
 *
 * @param {Object} options
 * @returns {Observable}
 */

// overloading to the max
function request(options :
  IRequestOptions<undefined|null|""|"text", false|undefined>
) : Observable<IRequestResponse<string, "text">|IRequestProgress>;
function request(options : IRequestOptions<undefined|null|""|"text", true>) :
  Observable<IRequestResponse<string, "text">>;
function request(options : IRequestOptions<"arraybuffer", false|undefined>) :
  Observable<IRequestResponse<ArrayBuffer, "arraybuffer">|IRequestProgress>;
function request(options : IRequestOptions<"arraybuffer", true>) :
  Observable<IRequestResponse<ArrayBuffer, "arraybuffer">>;
function request(options : IRequestOptions<"document", false|undefined>) :
  Observable<IRequestResponse<Document, "document">|IRequestProgress>;
function request(options : IRequestOptions<"document", true>) :
  Observable<IRequestResponse<Document, "document">>;
function request(options : IRequestOptions<"json", false|undefined>) :
  Observable<IRequestResponse<any, "json">|IRequestProgress>;
function request(options : IRequestOptions<"json", true>) :
  Observable<IRequestResponse<any, "json">>;
function request(options : IRequestOptions<"blob", false|undefined>) :
  Observable<IRequestResponse<Blob, "blob">|IRequestProgress>;
function request(options : IRequestOptions<"blob", true>) :
  Observable<IRequestResponse<Blob, "blob">>;
function request<T>(
  options : IRequestOptions<
    XMLHttpRequestResponseType|null|undefined, false|undefined
  >
) : Observable<
  IRequestResponse<T, XMLHttpRequestResponseType>|IRequestProgress
>;
function request<T>(
  options : IRequestOptions<XMLHttpRequestResponseType|null|undefined, true>
) : Observable<IRequestResponse<T, XMLHttpRequestResponseType>>;

function request<T>(
  options : IRequestOptions<
    XMLHttpRequestResponseType|null|undefined, boolean|undefined
  >
) : Observable<
  IRequestResponse<T, XMLHttpRequestResponseType>|IRequestProgress
> {
  const requestOptions = {
    url: options.url,
    body: options.body,
    headers: options.headers,
    method: options.method == null ?
      "GET" : options.method,
    responseType: options.responseType == null ?
      DEFAULT_RESPONSE_TYPE : options.responseType,
    timeout: options.timeout == null ?
      DEFAULT_REQUEST_TIMEOUT : options.timeout,
  };

  return Observable.create((
    obs : Observer<IRequestResponse<T, string>|IRequestProgress>
  ) => {
    const {
      url,
      headers,
      method,
      responseType,
      timeout,
      body,
    } = requestOptions;
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    if (timeout >= 0) {
      xhr.timeout = timeout;
    }

    xhr.responseType = responseType;

    if (xhr.responseType === "document") {
      xhr.overrideMimeType("text/xml");
    }

    if (headers) {
      const _headers = headers;
      for (const key in _headers) {
        if (_headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, _headers[key]);
        }
      }
    }

    const sentTime = Date.now();

    xhr.onerror = function onXHRError() {
      const errorCode = RequestErrorTypes.ERROR_EVENT;
      obs.error(new RequestError(xhr, url, errorCode));
    };

    xhr.ontimeout = function onXHRTimeout() {
      const errorCode = RequestErrorTypes.TIMEOUT;
      obs.error(new RequestError(xhr, url, errorCode));
    };

    if (!options.ignoreProgressEvents) {
      xhr.onprogress = function onXHRProgress(event) {
        const currentTime = Date.now();
        obs.next({
          type: "progress",
          value: {
            url,
            duration: currentTime - sentTime,
            sentTime,
            currentTime,
            size: event.loaded,
            totalSize: event.total,
          },
        });
      };
    }

    // Note: Waiting for https://github.com/Microsoft/TypeScript/issues/19830
    xhr.onload = function onXHRLoad(event : ProgressEvent) {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          const receivedTime = Date.now();
          const totalSize = event.total;
          const status = xhr.status;
          const loadedResponseType = xhr.responseType;
          const _url = xhr.responseURL || url;

          let responseData;
          if (loadedResponseType === "json") {
            // IE bug where response is string with responseType json
            if (typeof xhr.response !== "string") {
              responseData = xhr.response;
            } else {
              responseData = toJSONForIE(xhr.responseText);
            }
          } else {
            responseData = xhr.response;
          }

          if (responseData == null) {
            const errorCode = RequestErrorTypes.PARSE_ERROR;
            obs.error(new RequestError(xhr, _url, errorCode));
            return;
          }

          obs.next({
            type: "response",
            value: {
              status,
              url: _url,
              responseType: loadedResponseType,
              sentTime,
              receivedTime,
              duration: receivedTime - sentTime,
              size: totalSize,
              responseData,
            },
          });
          obs.complete();

        } else {
          const errorCode = RequestErrorTypes.ERROR_HTTP_CODE;
          obs.error(new RequestError(xhr, url, errorCode));
        }
      }
    };

    if (body !== undefined) {
      xhr.send(body);
    } else {
      xhr.send();
    }

    return () => {
      if (xhr && xhr.readyState !== 4) {
        xhr.abort();
      }
    };
  });
}

export default request;
