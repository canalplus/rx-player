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

import {
  Observable,
} from "rxjs";
import config from "../../config";
import {
  NetworkErrorTypes,
  RequestError,
} from "../../errors";
import log from "../../log";
import isNullOrUndefined from "../is_null_or_undefined";

export interface IDataChunk {
  type : "data-chunk";
  value : {
    currentTime : number;
    duration : number;
    chunkSize : number;
    size : number;
    sendingTime : number;
    url : string;
    totalSize? : number;
    chunk: ArrayBuffer;
  };
}

export interface IDataComplete {
  type : "data-complete";
  value : {
    duration : number;
    receivedTime : number;
    sendingTime : number;
    size : number;
    status : number;
    url : string;
  };
}

export interface IFetchOptions {
  url : string;
  headers? : { [ header: string ] : string }|null;
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

function fetchRequest(
  options : IFetchOptions
) : Observable< IDataChunk | IDataComplete > {
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

  return new Observable((obs) => {
    log.debug("Fetch: Called with URL", options.url);
    let hasAborted = false;
    let timeouted = false;
    let isDone = false;
    const sendingTime = performance.now();
    const abortController: AbortController | null =
      !isNullOrUndefined(_AbortController) ? new _AbortController() :
                                             null;

    /**
     * Abort current fetchRequest by triggering AbortController signal.
     * @returns {void}
     */
    function abortRequest(): void {
      if (!isDone) {
        if (!isNullOrUndefined(abortController)) {
          return abortController.abort();
        }
        log.warn("Fetch: AbortController API not available.");
      }
    }

    const requestTimeout = isNullOrUndefined(options.timeout) ?
      DEFAULT_REQUEST_TIMEOUT :
      options.timeout;
    const timeout = window.setTimeout(() => {
      timeouted = true;
      abortRequest();
    }, requestTimeout);

    fetch(options.url,
          { headers,
            method: "GET",
            signal: !isNullOrUndefined(abortController) ? abortController.signal :
                                                          undefined }
    ).then((response) => {
      if (!isNullOrUndefined(timeout)) {
        clearTimeout(timeout);
      }
      if (response.status >= 300) {
        log.warn("Fetch: Request HTTP Error", response);
        obs.error(new RequestError(response.url,
                                   response.status,
                                   NetworkErrorTypes.ERROR_HTTP_CODE));
        return undefined;
      }

      if (isNullOrUndefined(response.body)) {
        obs.error(new RequestError(response.url,
                                   response.status,
                                   NetworkErrorTypes.PARSE_ERROR));
        return undefined;
      }

      const contentLengthHeader = response.headers.get("Content-Length");
      const contentLength = !isNullOrUndefined(contentLengthHeader) &&
                            !isNaN(+contentLengthHeader) ? +contentLengthHeader :
                                                           undefined;
      const reader = response.body.getReader();
      let size = 0;

      return readBufferAndSendEvents();

      async function readBufferAndSendEvents() : Promise<undefined> {
        const data = await reader.read();

        if (!data.done && !isNullOrUndefined(data.value)) {
          size += data.value.byteLength;
          const currentTime = performance.now();
          const dataChunk = { type: "data-chunk" as const,
                              value: { url: response.url,
                                       currentTime,
                                       duration: currentTime - sendingTime,
                                       sendingTime,
                                       chunkSize: data.value.byteLength,
                                       chunk: data.value.buffer,
                                       size,
                                       totalSize: contentLength } };
          obs.next(dataChunk);
          return readBufferAndSendEvents();
        } else if (data.done) {
          const receivedTime = performance.now();
          const duration = receivedTime - sendingTime;
          isDone = true;
          obs.next({ type: "data-complete" as const,
                     value: { duration,
                              receivedTime,
                              sendingTime,
                              size,
                              status: response.status,
                              url: response.url } });
          obs.complete();
        }
      }
    }).catch((err : unknown) => {
      if (hasAborted) {
        log.debug("Fetch: Request aborted.");
        return;
      }
      if (timeouted) {
        log.warn("Fetch: Request timeouted.");
        obs.error(new RequestError(options.url,
                                   0,
                                   NetworkErrorTypes.TIMEOUT));
        return;
      }
      log.warn("Fetch: Request Error", err instanceof Error ?
                                         err.toString() :
                                         "");
      obs.error(new RequestError(options.url,
                                 0,
                                 NetworkErrorTypes.ERROR_EVENT));
      return;
    });

    return () => {
      hasAborted = true;
      abortRequest();
    };
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

export default fetchRequest;
