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
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  catchError,
  finalize,
  map,
  mergeMap,
  tap,
} from "rxjs/operators";
import config from "../../config";
import {
  ICustomError,
  isKnownError,
  NetworkError,
  OtherError,
  RequestError,
} from "../../errors";
import {
  ILoaderEvent,
  ILoaderProgress,
  ILoaderResponseValue,
  ITransportPipeline,
} from "../../net/types";
import castToObservable from "../../utils/castToObservable";
import tryCatch from "../../utils/rx-tryCatch";
import downloadingBackoff from "./backoff";

interface IPipelineLoaderCache<T> {
  type : "cache";
  value : ILoaderResponseValue<T>;
}

export interface IPipelineLoaderError {
  type : "error";
  value : Error|ICustomError;
}

export interface IPipelineLoaderMetrics {
  type : "metrics";
  value : {
    size? : number;
    duration? : number;
  };
}

export interface IPipelineLoaderRequest<T> {
  type : "request";
  value : T;
}

export interface IPipelineLoaderResponse<T> {
  type : "response";
  value : {
    responseData : T;
    url? : string;
    sentTime? : number;
  };
}

/**
 * Type parameters:
 *   T: Argument given to the loader
 *   U: ResponseType of the request
 */
export type IPipelineLoaderEvent<T, U> =
  IPipelineLoaderRequest<T> |
  IPipelineLoaderResponse<U> |
  ILoaderProgress |
  IPipelineLoaderError |
  IPipelineLoaderMetrics;

const {
  MAX_BACKOFF_DELAY_BASE,
  INITIAL_BACKOFF_DELAY_BASE,
} = config;

/**
 * Generate a new error from the infos given.
 * @param {string} code
 * @param {Error} error
 * @param {Boolean} fatal - Whether the error is fatal to the content's
 * playback.
 * @returns {Error}
 */
function errorSelector(code : string, error : Error, fatal : boolean) : ICustomError {
  if (!isKnownError(error)) {
    if (error instanceof RequestError) {
      return new NetworkError(code, error, fatal);
    }
    return new OtherError(code, error, fatal);
  }
  return error;
}

export interface IPipelineLoaderOptions<T, U> {
  cache? : {
    add : (obj : T, arg : ILoaderResponseValue<U>) => void;
    get : (obj : T) => ILoaderResponseValue<U>;
  };
  maxRetry : number;
  maxRetryOffline : number;
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
 *     This one emit the payload as a value.
 *
 *   - as the request progresses (type "progress").
 *
 *   - each time a request ends (type "metrics").
 *     This one contains informations about the metrics of the request.
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
 *   T: Argument given to the Net's loader
 *   U: ResponseType of the request
 *
 * @param {Object} transportPipeline
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
    (transportPipeline as any).resolver : observableOf.bind(Observable);

  // Subject that will emit non-fatal errors.
  const retryErrorSubject : Subject<Error> = new Subject();

  // Backoff options given to the backoff retry done with the loader function.
  const backoffOptions = {
    baseDelay: INITIAL_BACKOFF_DELAY_BASE,
    maxDelay: MAX_BACKOFF_DELAY_BASE,
    maxRetryRegular: maxRetry,
    maxRetryOffline,
    onRetry: (error : Error) => {
      retryErrorSubject
        .next(errorSelector("PIPELINE_LOAD_ERROR", error, false));
    },
  };

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
      .pipe(catchError((error : Error) : Observable<never> => {
        throw errorSelector("PIPELINE_RESOLVE_ERROR", error, true);
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
  ) : Observable<ILoaderEvent<U>|IPipelineLoaderRequest<T>|IPipelineLoaderCache<U>> {

    /**
     * Call the Pipeline's loader with an exponential Backoff.
     * @returns {Observable}
     */
    function startLoaderWithBackoff(
    ) : Observable<ILoaderEvent<U>|IPipelineLoaderRequest<T>> {
      const request$ = downloadingBackoff<ILoaderEvent<U>>(
        tryCatch<T, ILoaderEvent<U>>(loader as any, loaderArgument),
        backoffOptions
      ).pipe(
        catchError((error : Error) : Observable<never> => {
          throw errorSelector("PIPELINE_LOAD_ERROR", error, true);
        }),

        tap((arg) => {
          if (arg.type === "response" && cache) {
            cache.add(loaderArgument, arg.value);
          }
        })
      );

      return observableConcat(
        observableOf({ type: "request" as "request", value: loaderArgument }),
        request$
      );
    }

    const dataFromCache = cache ? cache.get(loaderArgument) : null;

    if (dataFromCache != null) {
      return castToObservable(dataFromCache).pipe(
        map(response => {
          return {
            type: "cache" as "cache",
            value: response,
          };
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
    const pipeline$ = callResolver(pipelineInputData).pipe(
      mergeMap((resolverResponse : T) => {
        return loadData(resolverResponse).pipe(
          mergeMap((arg) : Observable<IPipelineLoaderEvent<T, U>> => {
            // "cache": data taken from cache by the pipeline
            // "data": the data is available but no request has been done
            // "response": data received through a request
            switch (arg.type) {
              case "cache":
              case "data":
              case "response":
                const response$ = observableOf({
                  type: "response" as "response",
                  value: objectAssign({}, resolverResponse, {
                    responseData: arg.value.responseData,
                    sentTime: arg.type === "response" ? arg.value.sentTime : undefined,
                  }),
                });
                const metrics$ = arg.type !== "response" ?
                  EMPTY : observableOf({
                    type: "metrics" as "metrics",
                    value: {
                      size: arg.value.size,
                      duration: arg.value.duration,
                    },
                  });
                return observableConcat(response$, metrics$);
              default:
                return observableOf(arg);
            }
          }));
      }),
      finalize(() => { retryErrorSubject.complete(); })
    );

    const retryError$ : Observable<IPipelineLoaderError> = retryErrorSubject
      .pipe(map(error => ({ type: "error" as "error", value: error })));

    return observableMerge(pipeline$, retryError$);
  };
}
