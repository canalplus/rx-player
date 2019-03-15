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

import objectAssign from "object-assign";
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
  tap,
} from "rxjs/operators";
import config from "../../../config";
import {
  formatError,
  ICustomError,
  NetworkError,
  RequestError,
} from "../../../errors";
import {
  ILoaderDataLoadedValue,
  ILoaderProgress,
  ISegmentLoaderEvent,
  ITransportPipeline,
} from "../../../transports";
import castToObservable from "../../../utils/cast_to_observable";
import tryCatch from "../../../utils/rx-try_catch";
import backoff from "./backoff";

// Data comes from a local cache (no request was done)
interface IPipelineLoaderCache<T> { type : "cache";
                                    value : ILoaderDataLoadedValue<T>; }

export type IPipelineLoaderProgress = ILoaderProgress;

// An Error happened while loading (usually a request error)
export interface IPipelineWarning { type : "warning";
                                        value : ICustomError; }

// Request metrics are available
export interface IPipelineLoaderMetrics { type : "metrics";
                                          value : { size? : number;
                                                    duration? : number; }; }

// The request begins to be done
export interface IPipelineLoaderRequest<T> { type : "request";
                                             value : T; }

export interface IPipelineLoaderResponse<T> {
  type : "response";
  value : IPipelineLoaderResponseValue<T>;
}

export interface IPipelineLoaderResponseValue<T> { responseData : T;
                                                   url? : string;
                                                   sendingTime? : number; }

// Events a loader emits
// Type parameters: T: Argument given to the loader
//                  U: ResponseType of the request
export type IPipelineLoaderEvent<T, U> = IPipelineLoaderRequest<T> |
                                         IPipelineLoaderResponse<U> |
                                         IPipelineLoaderProgress |
                                         IPipelineWarning |
                                         IPipelineLoaderMetrics;

// Options you can pass on to the loader
export interface IPipelineLoaderOptions<T, U> {
  cache? : { add : (obj : T, arg : ILoaderDataLoadedValue<U>) => void;
             get : (obj : T) => ILoaderDataLoadedValue<U>; }; // Caching logic
  maxRetry : number; // Maximum number of time a request on error will be retried
  maxRetryOffline : number; // Maximum number of time a request be retried when
                            // the user is offline
}

const { MAX_BACKOFF_DELAY_BASE,
        INITIAL_BACKOFF_DELAY_BASE } = config;

/**
 * Generate a new error from the infos given.
 * @param {Error} error
 * @returns {Error}
 */
function errorSelector(error : unknown) : ICustomError {
  if (error instanceof RequestError) {
    return new NetworkError("PIPELINE_LOAD_ERROR", error);
  }
  return formatError(error, { defaultCode: "PIPELINE_LOAD_ERROR",
                              defaultReason: "Unknown error when loading content" });
}

/**
 * Returns function allowing to download the wanted data through a
 * resolver -> loader pipeline.
 *
 * (The data can be for example: the manifest, audio and video segments, text,
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
 *     This event contains informations about the metrics of the request.
 *
 *   - each time a minor request error is encountered (type "error").
 *     With the error as a value.
 *
 *   - Lastly, with the fetched data (type "response").
 *
 *
 * Each of these but "error" can be emitted at most one time.
 *
 * This observable will throw if, following the options given, the request and
 * possible retry all failed.
 *
 * This observable will complete after emitting the data.
 *
 * Type parameters:
 *   - T: Argument given to the loader
 *   - U: ResponseType of the request
 *
 * @param {Object} transportPipeline - Pipelines declared by the corresponding
 * transport protocol
 * @param {Object} options
 * @returns {Function}
 */
export default function createLoader<T, U>(
  transportPipeline : ITransportPipeline,
  options : IPipelineLoaderOptions<T, U>
) : (x : T) => Observable<IPipelineLoaderEvent<T, U>> {
  const { cache, maxRetry, maxRetryOffline } = options;
  const { loader } = transportPipeline;

  // TODO Remove the resolver completely
  const resolver = (transportPipeline as any).resolver != null ?
                     (transportPipeline as any).resolver :
                     /* tslint:disable:deprecation */
                     observableOf; // TS Issue triggers an Rx deprecation
                     /* tslint:enable:deprecation */

  // Backoff options given to the backoff retry done with the loader function.
  const backoffOptions = { baseDelay: INITIAL_BACKOFF_DELAY_BASE,
                           maxDelay: MAX_BACKOFF_DELAY_BASE,
                           maxRetryRegular: maxRetry,
                           maxRetryOffline };
  /**
   * Call the transport's resolver - if it exists - with the given data.
   *
   * Throws with the right error if it fails.
   * @param {Object} resolverArgument
   * @returns {Observable}
   */
  function callResolver(resolverArgument : T) : Observable<T> {
    return tryCatch<T, T>(resolver, resolverArgument)
      .pipe()
      .pipe(catchError((error : unknown) : Observable<never> => {
        throw errorSelector(error);
      }));
  }

  /**
   * Load wanted data:
   *   - get it from cache if present
   *   - call the transport loader - with an exponential backoff - if not
   *
   * @param {Object} loaderArgument - Input given to the loader
   * @returns {Observable}
   */
  function loadData(
    loaderArgument : T
  ) : Observable< ISegmentLoaderEvent<U> |
                  IPipelineLoaderRequest<T> |
                  IPipelineLoaderCache<U> |
                  IPipelineWarning>
  {

    /**
     * Call the Pipeline's loader with an exponential Backoff.
     * @returns {Observable}
     */
    function startLoaderWithBackoff() : Observable<ISegmentLoaderEvent<U> |
                                                   IPipelineWarning |
                                                   IPipelineLoaderRequest<T>>
    {
      const request$ = backoff<ISegmentLoaderEvent<U>>(
        tryCatch<T, ISegmentLoaderEvent<U>>(loader as any, loaderArgument),
        backoffOptions
      ).pipe(
        catchError((error : unknown) : Observable<never> => {
          throw errorSelector(error);
        }),

        map((evt) : IPipelineWarning | ISegmentLoaderEvent<U> => {
          return evt.type === "response" ? evt.value :
                                           ({ type: "warning" as const,
                                              value: errorSelector(evt.value) });
        }),
        tap((arg) => {
          if (arg.type === "data-loaded" && cache != null) {
            cache.add(loaderArgument, arg.value);
          }
        })
      );

      return observableConcat(
        observableOf({ type: "request" as const, value: loaderArgument }),
        request$
      );
    }

    const dataFromCache = cache != null ? cache.get(loaderArgument) :
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
   * @param {Object} pipelineInputData
   * @returns {Observable}
   */
  return function startPipeline(
    pipelineInputData : T
  ) : Observable<IPipelineLoaderEvent<T, U>> {
    return callResolver(pipelineInputData).pipe(
      mergeMap((resolverResponse : T) => {
        return loadData(resolverResponse).pipe(
          mergeMap((arg) : Observable<IPipelineLoaderEvent<T, U>> => {
            // "cache": data taken from cache by the pipeline
            // "data-created": the data is available but no request has been done
            // "data-loaded": data received through a request
            switch (arg.type) {
              case "cache":
              case "data-created":
              case "data-loaded":
                const response$ = observableOf({
                  type: "response" as "response",
                  value: objectAssign({}, resolverResponse, {
                    responseData: arg.value.responseData,
                    url: arg.type === "data-loaded" ? arg.value.url :
                                                      undefined,
                    sendingTime: arg.type === "data-loaded" ? arg.value.sendingTime :
                                                              undefined,
                    receivedTime: arg.type === "data-loaded" ? arg.value.receivedTime :
                                                               undefined,
                  }),
                });
                const metrics$ =
                  arg.type === "data-loaded" ? observableOf({
                                                 type: "metrics" as const,
                                                 value: {
                                                   size: arg.value.size,
                                                   duration: arg.value.duration,
                                                 },
                                               }) :
                                               EMPTY;
                return observableConcat(response$, metrics$);
              default:
                return observableOf(arg);
            }
          }));
      })
    );
  };
}
