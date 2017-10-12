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

import arrayIncludes from "../../utils/array-includes";
import noop from "../../utils/noop";
import tryCatch from "../../utils/rx-tryCatch";
import castToObservable from "../../utils/castToObservable";

import config from "../../config";
import {
  RequestError,
  NetworkError,
  OtherError,
  isKnownError,
  CustomError,
} from "../../errors";

import downloadingBackoff from "./backoff";
import {
  IPipelineMetrics,
  IPipelineError,
  PipelineEvent,
} from "./types";

// TODO Typings is a complete mess in this file.
// Maybe is it too DRY? Refactor.

const DEFAULT_MAXIMUM_RETRY_ON_ERROR =
  config.DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR;

const DEFAULT_MAXIMUM_RETRY_ON_OFFLINE =
  config.DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE;

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
    add : (obj : T, arg : U) => void,
    get : (obj : T) => U,
  };

  maxRetry? : number;
}

/**
 * Returns function allowing to download the wanted transport object through
 * the resolver -> loader -> parser pipeline.
 *
 * (A transport object can be for example: the manifest, audio and video
 * segments, text, images...)
 *
 * The function returned takes the initial data in arguments and returns an
 * Observable which will emit:
 *   - each time a request begins (type "request"). This is not emitted if the
 *     value is retrieved from a local js cache. This one emit the payload
 *     as a value.
 *   - each time a request ends (type "metrics"). This one contains
 *     informations about the metrics of the request.
 *   - each time a minor request error is encountered (type "error"). With the
 *     error as a value.
 *   - Lastly, with the obtained data (type "data").
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
  { resolver, loader, parser } : {
    resolver? : (x : any) => Observable<any>,
    loader? : (x : any) => Observable<any>,
    parser? : (x : any) => Observable<any>,
  },
  options : IPipelineOptions<any, any> = {}
) : (x : any) => Observable<PipelineEvent> {
  const { maxRetry, cache } = options;

  /**
   * Subject that will emit non-fatal errors.
   */
  const retryErrorSubject : Subject<Error> = new Subject();
  const _resolver = resolver || Observable.of;
  const _loader = loader || Observable.of;
  const _parser = parser || Observable.of;

  const totalRetry = typeof maxRetry === "number" ?
    maxRetry : DEFAULT_MAXIMUM_RETRY_ON_ERROR;

  /**
   * Backoff options given to the backoff retry done with the loader function.
   * @see retryWithBackoff
   */
  const backoffOptions = {
    baseDelay: INITIAL_BACKOFF_DELAY_BASE,
    maxDelay: MAX_BACKOFF_DELAY_BASE,
    maxRetryRegular: totalRetry,
    maxRetryOffline: DEFAULT_MAXIMUM_RETRY_ON_OFFLINE,
    onRetry: (error : Error) => {
      retryErrorSubject
        .next(errorSelector("PIPELINE_LOAD_ERROR", error, false));
    },
  };

  function catchedResolver(pipelineInputData : any) : Observable<any> {
    return tryCatch(_resolver, pipelineInputData)
      .catch((error : Error) => {
        throw errorSelector("PIPELINE_RESOLVE_ERROR", error);
      });
  }

  function catchedLoader(
    resolvedInfos : any,
    pipelineInputData : any
  ) : Observable<any> {
    function loaderWithRetry(_resolvedInfos : any) {
      // TODO do something about bufferdepth to avoid infinite errors?
      return downloadingBackoff(
        tryCatch(_loader, _resolvedInfos),
        backoffOptions
      )
        .catch((error : Error) => {
          throw errorSelector("PIPELINE_LOAD_ERROR", error);
        })
        .do(({ type, value }) => {
          if (type === "response" && cache) {
            cache.add(_resolvedInfos, value);
          }
        })
        .startWith({
          type: "request",
          value: pipelineInputData,
        });
    }

    const fromCache = cache ? cache.get(resolvedInfos) : null;
    return fromCache === null ?
      loaderWithRetry(resolvedInfos) :
      castToObservable(fromCache)
      .map(response => {
        return {
          type: "cache",
          value: response,
        };
      }).catch(() => loaderWithRetry(resolvedInfos));
  }

  function catchedParser(loadedInfos : any) : Observable<any> {
    return tryCatch(_parser, loadedInfos)
      .catch((error) => {
        throw errorSelector("PIPELINE_PARSING_ERROR", error);
      });
  }

  return function startPipeline(pipelineInputData : any) {
    const pipeline$ = catchedResolver(pipelineInputData)
      .mergeMap(resolvedInfos => {
        return catchedLoader(resolvedInfos, pipelineInputData)
          .mergeMap(({ type, value }) => {
            // "cache": taken from cache
            // "data": no request have been done
            // "response": a request has been done
            if (arrayIncludes(["cache", "data", "response"], type)) {
              const loaderResponse = value;
              const loadedInfos =
                objectAssign({ response: loaderResponse }, resolvedInfos);

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
                  catchedParser(loadedInfos)
                  .map(parserResponse => {
                    return {
                      type: "data" as "data",
                      value: objectAssign({
                        parsed: parserResponse,
                      }, loadedInfos),
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
      }).do(noop, noop, () => { retryErrorSubject.complete(); });

    const retryError$ : Observable<IPipelineError> = retryErrorSubject
      .map(error => ({
        type: "error" as "error",
        value: error,
      }));

    return Observable.merge(pipeline$, retryError$);
  };
}
