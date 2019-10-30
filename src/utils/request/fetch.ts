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

// function fetchRequest(options : IRequestOptions< undefined | null | "" | "text",
//                                             false | undefined>)
//                      : Observable<IRequestResponse< string, "text" >>;
// function fetchRequest(options : IRequestOptions< undefined | null | "" | "text",
//                                             true >)
//                      : Observable<IRequestResponse< string, "text" > |
//                                   IRequestProgress< string > >;

// function fetchRequest(options : IRequestOptions< "arraybuffer",
//                                             false | undefined>)
//                      : Observable<IRequestResponse< ArrayBuffer, "arraybuffer" >>;
// function fetchRequest(options : IRequestOptions<"arraybuffer", true>)
//                      : Observable<IRequestResponse< ArrayBuffer, "arraybuffer" > |
//                                   IRequestProgress < ArrayBuffer > >;
//                                   // IRequestProgress |
//                                   // IRequestDataChunk< ArrayBuffer, "arraybuffer" >>;

// function fetchRequest(options : IRequestOptions< "document",
//                                             false | undefined >)
//                 : Observable<IRequestResponse< Document, "document" >>;
// function fetchRequest(options : IRequestOptions< "document",
//                                             true >)
//                 : Observable<IRequestResponse< Document, "document" > |
//                              IRequestProgress< undefined > >;

// function fetchRequest(options : IRequestOptions< "json",
//                                             false | undefined >)
//                 : Observable<IRequestResponse< object, "json" >>;
// function fetchRequest(options : IRequestOptions< "json", true >)
//                 : Observable<IRequestResponse< object, "json" > |
//                              IRequestProgress< undefined > >;

// function fetchRequest(options : IRequestOptions< "blob",
//                                             false|undefined >)
//                 : Observable<IRequestResponse< Blob, "blob" >>;
// function fetchRequest(options : IRequestOptions<"blob", true>)
//                 : Observable<IRequestResponse< Blob, "blob" > |
//                              IRequestProgress< Blob > >;

// function fetchRequest<T>(
//   options : IRequestOptions< XMLHttpRequestResponseType | null | undefined,
//                              false | undefined >)
//   : Observable<IRequestResponse< T, XMLHttpRequestResponseType >>;
// function fetchRequest<T>(
//   options : IRequestOptions< XMLHttpRequestResponseType | null | undefined,
//                             true >)
//   : Observable<IRequestResponse< T, XMLHttpRequestResponseType > |
//                IRequestProgress< T | undefined >
// >;
// function fetchRequest<T>(
//   options : IRequestOptions< XMLHttpRequestResponseType | null | undefined,
//                             boolean | undefined >
// ) : Observable<IRequestResponse< T, XMLHttpRequestResponseType > |
//                IRequestProgress< T | undefined >
// > {
// const responseType = !options.responseType ||
//                      options.responseType === "document" ? "text" :
//                                                            options.responseType;

// return (() => {
//   switch (responseType) {
//     case "arraybuffer":
//       return response.arrayBuffer();
//     case "json":
//       return response.json();
//     case "blob":
//       return response.blob();
//     case "text":
//       return response.text();
//   }
// })().then((responseData) => {
//   isDone = true;
//   const receivedTime = performance.now();
//   obs.next({ type: "response" as const,
//              value: { responseType,
//                       status: response.status,
//                       url: response.url,
//                       sendingTime,
//                       receivedTime,
//                duration: receivedTime - sendingTime,
//                       size: responseData instanceof ArrayBuffer ?
//                               responseData.byteLength :
//                               0,
//                       responseData } });
// }).catch((err) => {
//   log.warn("Fetch: Request Parsing Error", err && err.toString());
//   if (hasAborted) { // is that even possible?
//     return;
//   }
//   obs.error(new RequestError(null,
//                              response.url,
//                              response.status,
//                              NetworkErrorTypes.PARSE_ERROR));
//   return;
// });
