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

import PPromise from "pinkie";
import config from "../../config";
import {
  NetworkErrorTypes,
  RequestError,
} from "../../errors";
import log from "../../log";
import isNullOrUndefined from "../is_null_or_undefined";
import {
  CancellationError,
  CancellationSignal,
} from "../task_canceller";

/** Object returned by `fetchRequest` after the fetch operation succeeded. */
export interface IFetchedStreamComplete {
  /** Duration of the whole request, in milliseconds. */
  duration : number;
  /** Result of `performance.now()` at the time the request was received. */
  receivedTime : number;
  /** Result of `performance.now()` at the time the request was started. */
  sendingTime : number;
  /** Size of the entire emitted data, in bytes. */
  size : number;
  /** HTTP status of the request performed. */
  status : number;
  /** URL of the recuperated data (post-redirection if one). */
  url : string;
}

/** Object emitted by `fetchRequest` when a new chunk of the data is available. */
export interface IFetchedDataObject {
  /** Result of `performance.now()` at the time this data was recuperated. */
  currentTime : number;
  /** Duration of the request until `currentTime`, in milliseconds. */
  duration : number;
  /** Size in bytes of the data emitted as `chunk`. */
  chunkSize : number;
  /** Cumulated size of the received data by the request until now. */
  size : number;
  /** Result of `performance.now()` at the time the request began. */
  sendingTime : number;
  /** URL of the recuperated data (post-redirection if one). */
  url : string;
  /**
   * Value of the "Content-Length" header, which should (yet also might not be)
   * the size of the complete data that will be fetched.
   */
  totalSize? : number;
  /**
   * Current available chunk, which might only be a sub-part of the whole
   * data.
   * To retrieve the whole data, all `chunk` received from `fetchRequest` can be
   * concatenated.
   */
  chunk: ArrayBuffer;
}

/** Options for the `fetchRequest` utils function. */
export interface IFetchOptions {
  /** URL you want to perform the HTTP GET request on. */
  url : string;
  /**
   * Callback called as new data is available.
   * This callback might be called multiple times with chunks of the complete
   * data until the fetch operation is finished.
   */
  onData : (data : IFetchedDataObject) => void;
  /**
   * Signal allowing to cancel the fetch operation.
   * If cancellation happens while the request is pending, `fetchRequest` will
   * reject with the corresponding `CancellationError`.
   */
  cancelSignal : CancellationSignal;
  /** Optional headers for the HTTP GET request perfomed by `fetchRequest`. */
  headers? : { [ header: string ] : string }|null;
  /**
   * Optional timeout for the HTTP GET request perfomed by `fetchRequest`.
   * This timeout is just enabled until the HTTP response from the server, even
   * if not all data has been received yet.
   */
  timeout? : number;
}

const { DEFAULT_REQUEST_TIMEOUT } = config;

type IHeadersConstructor = new() => Headers;
type IAbortControllerConstructor = new() => AbortController;

const _Headers : IHeadersConstructor|null =
  typeof Headers === "function" ? Headers :
                                  null;
const _AbortController : IAbortControllerConstructor|null =
  typeof AbortController === "function" ?
    AbortController :
    null;

export default function fetchRequest(
  options : IFetchOptions
) : PPromise<IFetchedStreamComplete> {
  let headers : Headers | { [key : string ] : string } | undefined;
  if (!isNullOrUndefined(options.headers)) {
    if (isNullOrUndefined(_Headers)) {
      headers = options.headers;
    } else {
      headers = new _Headers();
      const headerNames = Object.keys(options.headers);
      for (let i = 0; i < headerNames.length; i++) {
        const headerName = headerNames[i];
        headers.append(headerName, options.headers[headerName]);
      }
    }
  }

  log.debug("Fetch: Called with URL", options.url);
  let cancellation : CancellationError | null = null;
  let timeouted = false;
  const sendingTime = performance.now();
  const abortController: AbortController | null =
    !isNullOrUndefined(_AbortController) ? new _AbortController() :
                                           null;

  /**
   * Abort current fetchRequest by triggering AbortController signal.
   * @returns {void}
   */
  function abortFetch(): void {
    if (isNullOrUndefined(abortController)) {
      log.warn("Fetch: AbortController API not available.");
      return;
    }
    abortController.abort();
  }

  const requestTimeout = isNullOrUndefined(options.timeout) ?
    DEFAULT_REQUEST_TIMEOUT :
    options.timeout;
  const timeout = window.setTimeout(() => {
    timeouted = true;
    abortFetch();
  }, requestTimeout);

  const deregisterCancelLstnr = options.cancelSignal
    .register(function abortRequest(err : CancellationError) {
      cancellation = err;
      abortFetch();
    });

  return fetch(options.url,
               { headers,
                 method: "GET",
                 signal: !isNullOrUndefined(abortController) ? abortController.signal :
                                                               undefined }
  ).then((response : Response) : PPromise<IFetchedStreamComplete> => {
    if (!isNullOrUndefined(timeout)) {
      clearTimeout(timeout);
    }
    if (response.status >= 300) {
      log.warn("Fetch: Request HTTP Error", response);
      throw new RequestError(response.url,
                             response.status,
                             NetworkErrorTypes.ERROR_HTTP_CODE);
    }

    if (isNullOrUndefined(response.body)) {
      throw new RequestError(response.url,
                             response.status,
                             NetworkErrorTypes.PARSE_ERROR);
    }

    const contentLengthHeader = response.headers.get("Content-Length");
    const contentLength = !isNullOrUndefined(contentLengthHeader) &&
                          !isNaN(+contentLengthHeader) ? +contentLengthHeader :
                                                         undefined;
    const reader = response.body.getReader();
    let size = 0;

    return readBufferAndSendEvents();

    async function readBufferAndSendEvents() : PPromise<IFetchedStreamComplete> {
      const data = await reader.read();

      if (!data.done && !isNullOrUndefined(data.value)) {
        size += data.value.byteLength;
        const currentTime = performance.now();
        const dataInfo = { url: response.url,
                           currentTime,
                           duration: currentTime - sendingTime,
                           sendingTime,
                           chunkSize: data.value.byteLength,
                           chunk: data.value.buffer,
                           size,
                           totalSize: contentLength };
        options.onData(dataInfo);
        return readBufferAndSendEvents();
      } else if (data.done) {
        deregisterCancelLstnr();
        const receivedTime = performance.now();
        const duration = receivedTime - sendingTime;
        return { duration,
                 receivedTime,
                 sendingTime,
                 size,
                 status: response.status,
                 url: response.url };
      }
      return readBufferAndSendEvents();
    }
  }).catch((err : unknown) => {
    if (cancellation !== null) {
      throw cancellation;
    }
    deregisterCancelLstnr();
    if (timeouted) {
      log.warn("Fetch: Request timeouted.");
      throw new RequestError(options.url, 0, NetworkErrorTypes.TIMEOUT);
    } else if (err instanceof RequestError) {
      throw err;
    }
    log.warn("Fetch: Request Error", err instanceof Error ? err.toString() :
                                                            "");
    throw new RequestError(options.url, 0, NetworkErrorTypes.ERROR_EVENT);
  });
}

/**
 * Returns true if fetch should be supported in the current browser.
 * @return {boolean}
 */
export function fetchIsSupported() : boolean {
  return (typeof window.fetch === "function" &&
          !isNullOrUndefined(_AbortController) &&
          !isNullOrUndefined(_Headers));
}
