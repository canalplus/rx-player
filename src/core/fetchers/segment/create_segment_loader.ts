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

import {
  concat as observableConcat,
  EMPTY,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  map,
  mergeMap,
} from "rxjs/operators";
import { ICustomError } from "../../../errors";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import {
  ILoaderDataLoadedValue,
  ILoaderProgress,
  ISegmentLoaderArguments,
  ISegmentLoaderEvent as ISegmentPipelineLoaderEvent,
  ISegmentLoaderObservable,
} from "../../../transports";
import assertUnreachable from "../../../utils/assert_unreachable";
import castToObservable from "../../../utils/cast_to_observable";
import objectAssign from "../../../utils/object_assign";
import tryCatch from "../../../utils/rx-try_catch";
import errorSelector from "../utils/error_selector";
import tryURLsWithBackoff, {
  IBackoffOptions,
} from "../utils/try_urls_with_backoff";

// Data comes from a local cache (no request was done)
interface ISegmentLoaderCachedSegmentEvent<T> { type : "cache";
                                                 value : ILoaderDataLoadedValue<T>; }
export type ISegmentLoaderProgress = ILoaderProgress;

// An Error happened while loading (usually a request error)
export interface ISegmentLoaderWarning { type : "warning";
                                         value : ICustomError; }

// Request metrics are available
export interface ISegmentLoaderMetrics { type : "metrics";
                                         value : { size? : number;
                                                   duration? : number; }; }

// The request begins to be done
export interface ISegmentLoaderRequest { type : "request";
                                         value : ISegmentLoaderArguments; }

// The whole data is available
export interface ISegmentLoaderData<T> { type : "data";
                                         value : { responseData : T }; }

// A chunk of the data is available
export interface ISegmentLoaderChunk { type : "chunk";
                                       value : { responseData : null |
                                                                ArrayBuffer |
                                                                Uint8Array; }; }
// The data has been entirely sent through "chunk" events
export interface ISegmentLoaderChunkComplete { type : "chunk-complete";
                                               value : null; }

// Events a loader emits
// Type parameters: T: Argument given to the loader
//                  U: ResponseType of the request
export type ISegmentLoaderEvent<T> = ISegmentLoaderData<T> |
                                     ISegmentLoaderRequest |
                                     ISegmentLoaderProgress |
                                     ISegmentLoaderWarning |
                                     ISegmentLoaderChunk |
                                     ISegmentLoaderChunkComplete |
                                     ISegmentLoaderMetrics;

/** Cache implementation to avoid re-requesting segment */
export interface ISegmentLoaderCache<T> {
  /** Add a segment to the cache. */
  add : (obj : ISegmentLoaderContent, arg : ILoaderDataLoadedValue<T>) => void;
  /** Retrieve a segment from the cache */
  get : (obj : ISegmentLoaderContent) => ILoaderDataLoadedValue<T> | null;
}

export type ISegmentPipelineLoader<T> =
  (x : ISegmentLoaderArguments) => ISegmentLoaderObservable<T>;

/** Content used by the segment loader as a context to load a new segment. */
export interface ISegmentLoaderContent { manifest : Manifest;
                                         period : Period;
                                         adaptation : Adaptation;
                                         representation : Representation;
                                         segment : ISegment; }

/**
 * Returns function allowing to download the wanted data through the loader.
 *
 * (The data can be for example: audio and video segments, text,
 * images...)
 *
 * The function returned takes the initial data in arguments and returns an
 * Observable which will emit:
 *
 *   - each time a request begins (type "request").
 *     This is not emitted if the value is retrieved from a local js cache.
 *     This event emits the payload as a value.
 *
 *   - as the request progresses (type "progress").
 *
 *   - each time a request ends (type "metrics").
 *     This event contains information about the metrics of the request.
 *
 *   - each time a minor request error is encountered (type "warning").
 *     With the error as a value.
 *
 *   - Lastly, with the fetched data (type "response").
 *
 *
 * Each of these but "warning" can be emitted at most one time.
 *
 * This observable will throw if, following the options given, the request and
 * possible retry all failed.
 *
 * This observable will complete after emitting the data.
 *
 * Type parameters:
 *   - T: type of the data emitted
 *
 * @param {Function} loader
 * @param {Object | undefined} cache
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentLoader<T>(
  loader : ISegmentPipelineLoader<T>,
  cache : ISegmentLoaderCache<T> | undefined,
  backoffOptions : IBackoffOptions
) : (x : ISegmentLoaderContent) => Observable<ISegmentLoaderEvent<T>> {
  /**
   * Load wanted data:
   *   - get it from cache if present
   *   - call the transport loader - with an exponential backoff - if not
   *
   * @param {Object} loaderArgument - Input given to the loader
   * @returns {Observable}
   */
  function loadData(
    wantedContent : ISegmentLoaderContent
  ) : Observable< ISegmentPipelineLoaderEvent<T> |
                  ISegmentLoaderRequest |
                  ISegmentLoaderWarning |
                  ISegmentLoaderCachedSegmentEvent<T>>
  {

    /**
     * Call the Pipeline's loader with an exponential Backoff.
     * @returns {Observable}
     */
    function startLoaderWithBackoff(
    ) : Observable< ISegmentPipelineLoaderEvent<T> |
                    ISegmentLoaderRequest |
                    ISegmentLoaderWarning >
    {
      const request$ = (url : string | null) => {
        const loaderArgument = objectAssign({ url }, wantedContent);
        return observableConcat(
          observableOf({ type: "request" as const, value: loaderArgument }),
          tryCatch(loader, loaderArgument));
      };
      return tryURLsWithBackoff(wantedContent.segment.mediaURLs ?? [null],
                                request$,
                                backoffOptions).pipe(
        catchError((error : unknown) : Observable<never> => {
          throw errorSelector(error);
        }),

        map((evt) : ISegmentPipelineLoaderEvent<T> |
                    ISegmentLoaderWarning |
                    ISegmentLoaderRequest => {
          if (evt.type === "retry") {
            return { type: "warning" as const,
                     value: errorSelector(evt.value) };
          } else if (evt.value.type === "request") {
            return evt.value;
          }

          const response = evt.value;
          if (response.type === "data-loaded" && cache != null) {
            cache.add(wantedContent, response.value);
          }
          return evt.value;
        }));
    }

    const dataFromCache = cache != null ? cache.get(wantedContent) :
                                          null;

    if (dataFromCache != null) {
      return castToObservable(dataFromCache).pipe(
        map(response => {
          return { type: "cache" as const,
                   value: response };
        }),
        catchError(startLoaderWithBackoff)
      );
    }

    return startLoaderWithBackoff();
  }

  /**
   * Load the corresponding data.
   * @param {Object} content
   * @returns {Observable}
   */
  return function loadSegment(
    content : ISegmentLoaderContent
  ) : Observable<ISegmentLoaderEvent<T>> {
    return loadData(content).pipe(
      mergeMap((arg) : Observable<ISegmentLoaderEvent<T>> => {
        const metrics$ =
          arg.type === "data-chunk-complete" ||
          arg.type === "data-loaded" ? observableOf({
                                           type: "metrics" as const,
                                           value: { size: arg.value.size,
                                                    duration: arg.value.duration } }) :
                                       EMPTY;

        // "cache": data taken from the SegmentLoader's cache.
        // "data-created": the data is available but no request has been done
        // "data-loaded": data received through a request
        switch (arg.type) {
          case "warning":
            return observableOf(arg);
          case "cache":
          case "data-created":
          case "data-loaded":
            const chunck$ = observableOf({
              type: "data" as const,
              value: objectAssign({},
                                  content,
                                  { responseData: arg.value.responseData }),
            });
            return observableConcat(chunck$, metrics$);
          case "request":
          case "progress":
            return observableOf(arg);

          case "data-chunk":
            return observableOf({ type: "chunk" as const,
                                  value: objectAssign({}, content, {
                                    responseData: arg.value.responseData }),
            });
          case "data-chunk-complete":
            const _complete$ = observableOf({ type: "chunk-complete" as const,
                                              value: null });
            return observableConcat(_complete$, metrics$);
        }
        return assertUnreachable(arg);
      }));
  };
}
