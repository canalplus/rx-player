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
import { RequestError, RequestErrorTypes } from "../../errors";

const toJSONForIE = data => {
  try {
    return JSON.parse(data);
  } catch(e) {
    return null;
  }
};

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
 *   {
 *     type {string}: the type of event
 *     value {Object}: the event value
 *   }
 *
 * The type of event can either be "progress" or "response". The value is under
 * a different form depending on the type.
 *
 * For "progress" events, the value should be the following object:
 *   {
 *     url {string}: url on which the request is being done
 *     sentTime {Number}: timestamp at which the request was sent.
 *     currentTime {Number}: timestamp at which the progress event was
 *                           triggered
 *     loadedSize {Number}: current size downloaded, in bytes (without
 *                          overhead)
 *     totalSize {Number|undefined}: total size to download, in bytes
 *                                   (without overhead)
 *   }
 *
 * For "response" events, the value should be the following object:
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
 *
 * For any succesful request you should have 0+ "request" events and 1
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
 * @param {string} options.url
 * @param {Object} [options.headers]
 * @param {string} [options.method="GET"]
 * @param {string} [options.responseType="json"]
 * @param {Number} [options.timeout=30000]
 * @param {Boolean} [options.ignoreProgressEvents]
 * @param {*} [options.body]
 *
 * @returns {Observable}
 */

export default (options) => {
  const request = {
    url: "",
    headers: null,
    method: "GET",
    responseType: "json",
    timeout: 30 * 1000,
    // resultSelector: null, XXX
    body: null,
  };

  for (const prop in request) {
    if (options.hasOwnProperty(prop)) {
      request[prop] = options[prop];
    }
  }

  return Observable.create(obs => {
    const { url, headers, method, responseType, timeout, body } = request;
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
      for (const key in headers) {
        xhr.setRequestHeader(key, headers[key]);
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
        obs.next({
          type: "progress",
          value: {
            url,
            sentTime,
            currentTime: Date.now(),
            loadedSize: event.loaded,
            totalSize: event.total,
          },
        });
      };
    }

    xhr.onload = function onXHRLoad(event) {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          const receivedTime = Date.now();
          const totalSize = event.total;
          const status = xhr.status;
          const responseType = xhr.responseType;
          const url = xhr.responseURL || url;

          let responseData;
          if (responseType === "json") {
            // IE bug where response is string with responseType json
            if (typeof xhr.response != "string") {
              responseData = xhr.response;
            } else {
              responseData = toJSONForIE(xhr.responseText);
            }
          } else {
            responseData = xhr.response;
          }

          if (responseData == null) {
            const errorCode = RequestErrorTypes.PARSE_ERROR;
            obs.error(new RequestError(xhr, url, errorCode));
            return;
          }

          obs.next({
            type: "response",
            value: {
              status,
              url,
              responseType,
              sentTime,
              receivedTime,
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
};
