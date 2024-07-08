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
import type { CancellationError, CancellationSignal } from "../task_canceller";
import RequestError, { RequestErrorTypes } from "./request_error";

/** Object returned by `fetchRequest` after the fetch operation succeeded. */
export interface IFetchedStreamComplete {
  /** Duration of the whole request, in milliseconds. */
  requestDuration: number;
  /** Monotonically-raising timestamp at the time the request was received. */
  receivedTime: number;
  /** Monotonically-raising timestamp at the time the request was started. */
  sendingTime: number;
  /** Size of the entire emitted data, in bytes. */
  size: number;
  /** HTTP status of the request performed. */
  status: number;
  /** URL of the recuperated data (post-redirection if one). */
  url: string;
}

/** Object emitted by `fetchRequest` when a new chunk of the data is available. */
export interface IFetchedDataObject {
  /** Monotonically-raising timestamp at the time this data was recuperated. */
  currentTime: number;
  /** Duration of the request until `currentTime`, in milliseconds. */
  duration: number;
  /** Size in bytes of the data emitted as `chunk`. */
  chunkSize: number;
  /** Cumulated size of the received data by the request until now. */
  size: number;
  /** Monotonically-raising timestamp at the time the request began. */
  sendingTime: number;
  /** URL of the recuperated data (post-redirection if one). */
  url: string;
  /**
   * Value of the "Content-Length" header, which should (yet also might not be)
   * the size of the complete data that will be fetched.
   */
  totalSize: number | undefined;
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
  url: string;
  /**
   * Callback called as new data is available.
   * This callback might be called multiple times with chunks of the complete
   * data until the fetch operation is finished.
   */
  onData: (data: IFetchedDataObject) => void;
  /**
   * Signal allowing to cancel the fetch operation.
   * If cancellation happens while the request is pending, `fetchRequest` will
   * reject with the corresponding `CancellationError`.
   */
  cancelSignal: CancellationSignal;
  /** Optional headers for the HTTP GET request perfomed by `fetchRequest`. */
  headers?: { [header: string]: string } | undefined | null;
  /**
   * Optional timeout for the HTTP GET request perfomed by `fetchRequest`.
   * This timeout is just enabled until the HTTP response from the server, even
   * if not all data has been received yet.
   */
  timeout?: number | undefined;
  /**
   * Optional connection timeout, in milliseconds, after which the request is canceled
   * if the responses headers has not being received.
   * Do not set or set to "undefined" to disable it.
   */
  connectionTimeout?: number | undefined;
}

type IHeadersConstructor = new () => Headers;
type IAbortControllerConstructor = new () => AbortController;

const _Headers: IHeadersConstructor | null =
  typeof Headers === "function" ? Headers : null;
const _AbortController: IAbortControllerConstructor | null =
  typeof AbortController === "function" ? AbortController : null;

export default function fetchRequest(
  options: IFetchOptions,
): Promise<IFetchedStreamComplete> {
  let headers: Headers | { [key: string]: string } | undefined;
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
  let cancellation: CancellationError | null = null;
  let isTimedOut = false;
  let isConnectionTimedOut = false;
  const sendingTime = getMonotonicTimeStamp();
  const abortController: AbortController | null = !isNullOrUndefined(_AbortController)
    ? new _AbortController()
    : null;

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

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (options.timeout !== undefined) {
    timeoutId = setTimeout(() => {
      isTimedOut = true;
      if (connectionTimeoutId !== undefined) {
        clearTimeout(connectionTimeoutId);
      }
      abortFetch();
    }, options.timeout);
  }

  let connectionTimeoutId: ReturnType<typeof setTimeout> | undefined;
  if (options.connectionTimeout !== undefined) {
    connectionTimeoutId = setTimeout(() => {
      isConnectionTimedOut = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      abortFetch();
    }, options.connectionTimeout);
  }

  const deregisterCancelLstnr = options.cancelSignal.register(function abortRequest(
    err: CancellationError,
  ) {
    cancellation = err;
    abortFetch();
  });

  const fetchOpts: RequestInit = { method: "GET" };
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
    if (options.headers?.Range !== undefined) {
      logLine += " Range=" + options.headers?.Range;
    }
    log.debug(logLine);
  }
  return fetch(options.url, fetchOpts)
    .then((response: Response): Promise<IFetchedStreamComplete> => {
      if (connectionTimeoutId !== undefined) {
        clearTimeout(connectionTimeoutId);
      }
      if (response.status >= 300) {
        log.warn("Fetch: Request HTTP Error", response.status, response.url);
        throw new RequestError(
          response.url,
          response.status,
          RequestErrorTypes.ERROR_HTTP_CODE,
        );
      }

      if (isNullOrUndefined(response.body)) {
        throw new RequestError(
          response.url,
          response.status,
          RequestErrorTypes.PARSE_ERROR,
        );
      }

      const contentLengthHeader = response.headers.get("Content-Length");
      const contentLength =
        !isNullOrUndefined(contentLengthHeader) && !isNaN(+contentLengthHeader)
          ? +contentLengthHeader
          : undefined;
      const reader = response.body.getReader();
      let size = 0;

      return readBufferAndSendEvents();

      async function readBufferAndSendEvents(): Promise<IFetchedStreamComplete> {
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
        } else if (data.done) {
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
    .catch((err: unknown) => {
      if (cancellation !== null) {
        throw cancellation;
      }
      deregisterCancelLstnr();
      if (isTimedOut) {
        log.warn("Fetch: Request timed out.");
        throw new RequestError(options.url, 0, RequestErrorTypes.TIMEOUT);
      } else if (isConnectionTimedOut) {
        log.warn("Fetch: Request connection timed out.");
        throw new RequestError(options.url, 0, RequestErrorTypes.TIMEOUT);
      } else if (err instanceof RequestError) {
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
export function fetchIsSupported(): boolean {
  return (
    typeof globalScope.fetch === "function" &&
    !isNullOrUndefined(_AbortController) &&
    !isNullOrUndefined(_Headers)
  );
}
