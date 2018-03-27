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
  ILoaderProgress,
  ILoaderResponse,
  ITransportPipeline,
} from "../../net/types";
import arrayIncludes from "../../utils/array-includes";
import castToObservable from "../../utils/castToObservable";
import tryCatch from "../../utils/rx-tryCatch";
import downloadingBackoff from "./backoff";

export interface IPipelineError {
  type : "error";
  value : Error|CustomError;
}

export interface IPipelineMetrics {
  type : "metrics";
  value : {
    size : number;
    duration : number;
  };
}

export interface IPipelineData {
  type : "data";
  value : any;
}

export interface IPipelineCache {
  type : "cache";
  value : any;
}

export interface IPipelineRequest {
  type : "request";
  value : any;
}

export type PipelineEvent =
  ILoaderResponse<any> |
  ILoaderProgress |
  IPipelineError |
  IPipelineData |
  IPipelineMetrics |
  IPipelineCache |
  IPipelineRequest;

// TODO Typings is a complete mess in this file.
// Maybe is it too DRY? Refactor.

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
    add : (obj : T, arg : U) => void;
    get : (obj : T) => U;
  };

  maxRetry : number;
  maxRetryOffline : number;
}

export type IPipeline = (x : any) => Observable<PipelineEvent>;

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
 *   - each time a request begins. This is not emitted if the value is retrieved
 *     from a local js cache. This one emit the payload as a value.
 *
 *   - each time a request ends (type "metrics"). This one contains
 *     informations about the metrics of the request.
 *
 *   - each time a minor request error is encountered (type "error"). With the
 *     error as a value.
 *
 *   - Lastly, with the obtained data (type "data").
 *
 *
 * Each of these but "error" can be emitted at most one time.
 *
 * This observable will throw if, following the options given, the request and
 * possible retry all failed.
 *
 * This observable will complete after emitting the data.
 * @param {Object} transportObject
 * @param {Function} transportObject.resolver
 * @param {Function} transportObject.loader
 * @param {Function} transportObject.parser
 * @param {Object} [options={}]
 * @param {Number} [options.maxRetry=DEFAULT_MAXIMUM_RETRY_ON_ERROR]
 * @param {Object} [options.cache]
 * @returns {Function}
 */
export default function createPipeline(
  transportPipeline : ITransportPipeline,
  options : IPipelineOptions<any, any>
) : IPipeline {
  const {
    cache,
    maxRetry,
    maxRetryOffline,
  } = options;

  const {
    loader,
    parser,
  } = transportPipeline;

  // TODO for me, this is a TS bug to document as resolver exists in one of the
  // type possibilities
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
  function callResolver(resolverArgument : any) : Observable<any> {
    return tryCatch(resolver, resolverArgument)
      .catch((error : Error) => {
        throw errorSelector("PIPELINE_RESOLVE_ERROR", error);
      });
  }

  /**
   * Load wanted data:
   *   - get it from cache if present
   *   - call the transport loader - with an exponential backoff - if not
   * @param {Object} loaderArgument - Input given to the loader
   */
  function loadData(
    loaderArgument : any
  ) : Observable<any> {

    function startLoaderWithBackoff() {
      return downloadingBackoff<any>(
        tryCatch(loader as any, loaderArgument),
        backoffOptions
      )
        .catch((error : Error) => {
          throw errorSelector("PIPELINE_LOAD_ERROR", error);
        })
        .do((arg : { type : string; value : any }) => {
          const { type, value } = arg;
          if (type === "response" && cache) {
            cache.add(loaderArgument, value);
          }
        }, undefined, undefined)
        .startWith({
          type: "request",
          value: loaderArgument,
        });
    }

    const dataFromCache = cache ? cache.get(loaderArgument) : null;

    if (dataFromCache != null) {
      return castToObservable(dataFromCache)
        .map(response => {
          return {
            type: "cache",
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
  function callParser(parserArgument : any) : Observable<any> {
    return tryCatch(parser as any, parserArgument)
      .catch((error) => {
        throw errorSelector("PIPELINE_PARSING_ERROR", error);
      });
  }

  return function startPipeline(pipelineInputData : any) {
    const pipeline$ = callResolver(pipelineInputData)
      .mergeMap(resolverResponse => {
        return loadData(resolverResponse)
          .mergeMap(({ type, value }) => {
            // "cache": data taken from cache by the pipeline
            // "data": the data is available but no request has been done
            // "response": data received through a request
            if (arrayIncludes(["cache", "data", "response"], type)) {
              const loaderResponse = value;
              const loadedDataInfos =
                objectAssign({ response: loaderResponse }, resolverResponse);

              // add metrics if a request was made
              const metrics : Observable<IPipelineMetrics> =
                type === "response" ?
                  Observable.of({
                    type: "metrics" as "metrics",
                    value: {
                      size: value.size,
                      duration: value.duration,
                    },
                  }) :
                  Observable.empty();

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
            } else {
              return Observable.of({
                type,
                value,
              });
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
