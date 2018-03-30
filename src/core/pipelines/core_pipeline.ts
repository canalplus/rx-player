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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import config from "../../config";
import {
  CustomError,
  isKnownError,
  NetworkError,
  OtherError,
  RequestError,
} from "../../errors";
import {
  // ILoaderData,
  ILoaderEvent,
  ILoaderProgress,
  ILoaderResponse,
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

export interface IPipelineError {
  type : "error";
  value : Error|CustomError;
}

export interface IPipelineMetrics {
  type : "metrics";
  value : {
    size? : number;
    duration? : number;
  };
}

export interface IPipelineData<T> {
  type : "data";
  value : {
    parsed : T;
  };
}

export interface IPipelineCache<T> {
  type : "cache";
  value : {
    parsed : T;
  };
}

export interface IPipelineRequest<T> {
  type : "request";
  value : T;
}

/**
 * Type parameters:
 *   T: Argument given to the loader
 *   U: ResponseType of the request
 *   V: Response given by the parser
 */
export type ICorePipelineEvent<T, U, V> =
  IPipelineRequest<T> |
  ILoaderResponse<U> |
  ILoaderProgress |
  IPipelineError |
  IPipelineCache<V> |
  IPipelineData<V> |
  IPipelineMetrics;

const {
  MAX_BACKOFF_DELAY_BASE,
  INITIAL_BACKOFF_DELAY_BASE,
} = config;

/**
 * Generate a new error from the infos given.
 * Also attach the pipeline type (audio/manifest...) to the _pipelineType_
 * property of the returned error.
 * @param {string} code
 * @param {Error} error
 * @param {Boolean} [fatal=true] - Whether the error is fatal to the content's
 * playback.
 * @returns {Error}
 */
function errorSelector(
  code : string,
  error : Error,
  fatal : boolean = true
) : CustomError {
  if (!isKnownError(error)) {
    if (error instanceof RequestError) {
      return new NetworkError(code, error, fatal);
    }
    return new OtherError(code, error, fatal);
  }
  return error;
}

export interface IPipelineOptions<T, U> {
  cache? : {
    add : (obj : T, arg : ILoaderResponseValue<U>) => void;
    get : (obj : T) => ILoaderResponseValue<U>;
  };

  maxRetry : number;
  maxRetryOffline : number;
}

/**
 * TODO All that any casting is ugly
 *
 * Returns function allowing to download the wanted transport object through
 * the resolver -> loader -> parser pipeline.
 *
 * (A transport object can be for example: the manifest, audio and video
 * segments, text, images...)
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
 *   - Lastly, with the obtained data (type "data" or "cache).
 *
 *
 * Each of these but "error" can be emitted at most one time.
 *
 * This observable will throw if, following the options given, the request and
 * possible retry all failed.
 *
 * This observable will complete after emitting the data.
 *
 * @param {Object} transportObject
 * @param {Object} options
 * @returns {Function}
 *
 * Type parameters:
 *   T: Argument given to the Net's loader
 *   U: ResponseType of the request
 *   V: Response given by the Net's parser
 */
export default function createPipeline<T, U, V>(
  transportPipeline : ITransportPipeline,
  options : IPipelineOptions<T, U>
) : (x : T) => Observable<ICorePipelineEvent<T, U, V>> {
  const {
    cache,
    maxRetry,
    maxRetryOffline,
  } = options;

  const {
    loader,
    parser,
  } = transportPipeline;

  // TODO Remove the resolver completely
  const resolver = (transportPipeline as any).resolver != null ?
    (transportPipeline as any).resolver : Observable.of.bind(Observable);

  /**
   * Subject that will emit non-fatal errors.
   */
  const retryErrorSubject : Subject<Error> = new Subject();

  /**
   * Backoff options given to the backoff retry done with the loader function.
   * @see retryWithBackoff
   */
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
      .catch((error : Error) : Observable<never> => {
        throw errorSelector("PIPELINE_RESOLVE_ERROR", error);
      });
  }

  /**
   * Load wanted data:
   *   - get it from cache if present
   *   - call the transport loader - with an exponential backoff - if not
   *
   * @param {Object} loaderArgument - Input given to the loader
   */
  function loadData(
    loaderArgument : T
  ) : Observable<ILoaderEvent<U>|IPipelineRequest<T>|IPipelineLoaderCache<U>> {

    /**
     * Call the Pipeline's loader with an exponential Backoff.
     * @returns {Observable}
     */
    function startLoaderWithBackoff(
    ) : Observable<ILoaderEvent<U>|IPipelineRequest<T>> {
      const request$ = downloadingBackoff<ILoaderEvent<U>>(
        tryCatch<T, ILoaderEvent<U>>(loader as any, loaderArgument),
        backoffOptions
      )

        .catch((error : Error) : Observable<never> => {
          throw errorSelector("PIPELINE_LOAD_ERROR", error);
        })

        .do((arg) => {
          if (arg.type === "response" && cache) {
            cache.add(loaderArgument, arg.value);
          }
        });

      return Observable.of({
        type: "request" as "request",
        value: loaderArgument,
      }).concat(request$);
    }

    const dataFromCache = cache ? cache.get(loaderArgument) : null;

    if (dataFromCache != null) {
      return castToObservable(dataFromCache)
        .map(response => {
          return {
            type: "cache" as "cache",
            value: response,
          };
        })
        .catch(startLoaderWithBackoff);
    }

    return startLoaderWithBackoff();
  }

  /**
   * Call the transport's parser with the given data.
   *
   * Throws with the right error if it fails.
   * @param {Object} parserArgument
   * @returns {Observable}
   */
  function callParser<Y>(parserArgument : Y) : Observable<V> {
    return tryCatch<Y, V>(parser as any, parserArgument)
      .catch((error) : Observable<never> => {
        throw errorSelector("PIPELINE_PARSING_ERROR", error);
      });
  }

  return function startPipeline(
    pipelineInputData : T
  ) : Observable<ICorePipelineEvent<T, U, V>> {
    const pipeline$ = callResolver(pipelineInputData)
      .mergeMap((resolverResponse : T) => {
        return loadData(resolverResponse)
          .mergeMap((arg) : Observable<ICorePipelineEvent<T, U, V>> => {
            // "cache": data taken from cache by the pipeline
            // "data": the data is available but no request has been done
            // "response": data received through a request
            switch (arg.type) {
              case "cache":
              case "data":
              case "response":
                const loaderResponse = arg.value;
                const loadedDataInfos =
                  objectAssign({ response: loaderResponse }, resolverResponse);

                // add metrics if a request was made
                const metrics : Observable<IPipelineMetrics> =
                  arg.type === "response" ?
                    Observable.of({
                      type: "metrics" as "metrics",
                      value: {
                        size: arg.value.size,
                        duration: arg.value.duration,
                      },
                    }) : Observable.empty();

                return metrics
                  .concat(
                    callParser(loadedDataInfos)
                    .map(parserResponse => {
                      return {
                        type: "data" as "data",
                        value: objectAssign({
                          parsed: parserResponse,
                        }, loadedDataInfos),
                      };
                    })
                  );
              default:
                return Observable.of(arg);
            }
          });
      })
      .finally(() => { retryErrorSubject.complete(); });

    const retryError$ : Observable<IPipelineError> = retryErrorSubject
      .map(error => ({
        type: "error" as "error",
        value: error,
      }));

    return Observable.merge(pipeline$, retryError$);
  };
}
