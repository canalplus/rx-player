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
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import arrayIncludes from "../../utils/array-includes.js";
import config from "../../config.js";
import { tryCatch, castToObservable } from "../../utils/rx-utils";
import {
  RequestError,
  NetworkError,
  OtherError,
  isKnownError,
} from "../../errors";
import downloadingBackoff from "./backoff.js";

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
 * @param {string} pipelineType
 * @param {Error} error
 * @param {Boolean} [fatal=true] - Whether the error is fatal to the content's
 * playback.
 * @returns {Error}
 */
function errorSelector(code, error, fatal=true) {
  if (!isKnownError(error)) {
    const ErrorType = (error instanceof RequestError)
      ? NetworkError
      : OtherError;

    error = new ErrorType(code, error, fatal);
  }
  return error;
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
 * @param {Object} [options={}]
 * @returns {Function}
 */
export default function createPipeline(
  { resolver, loader, parser },
  options={}
) {
  const { maxRetry, cache } = options;

  /**
   * Subject that will emit non-fatal errors.
   */
  const retryErrorSubject = new Subject();

  if (!resolver) {
    resolver = Observable.of;
  }
  if (!loader)  {
    loader = Observable.of;
  }
  if (!parser) {
    parser = Observable.of;
  }

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
    onRetry: (error) => {
      retryErrorSubject
        .next(errorSelector("PIPELINE_LOAD_ERROR", error, false));
    },
  };

  const _resolver = pipelineInputData =>
    tryCatch(resolver, pipelineInputData)
      .catch((error) => {
        throw errorSelector("PIPELINE_RESOLVE_ERROR", error);
      });

  const _loader = (resolvedInfos, pipelineInputData) => {
    const loaderWithRetry = (resolvedInfos) =>
      downloadingBackoff(tryCatch(loader, resolvedInfos), backoffOptions)
        .catch((error) => {
          throw errorSelector("PIPELINE_LOAD_ERROR", error);
        })
        .do(response => {
          // add loadedInfos to the pipeline cache
          if (cache) {
            cache.add(resolvedInfos, response);
          }
        })
        .startWith({
          type: "request",
          value: pipelineInputData,
        });

    const fromCache = cache ? cache.get(resolvedInfos) : null;
    return fromCache === null ?
      loaderWithRetry(resolvedInfos) :
      castToObservable(fromCache)
        .map(response => ({
          type: "cache",
          value: response,
        }))
        .catch(() => loaderWithRetry(resolvedInfos));
  };

  const _parser = loadedInfos =>
    tryCatch(parser, loadedInfos)
      .catch((error) => {
        throw errorSelector("PIPELINE_PARSING_ERROR", error);
      });

  return (pipelineInputData) => {
    const pipeline$ = _resolver(pipelineInputData)
      .mergeMap(resolvedInfos => {
        return _loader(resolvedInfos, pipelineInputData)
          .mergeMap(({ type, value }) => {
            // "cache": taken from cache
            // "data": no request have been done
            // "response": a request has been done
            if (arrayIncludes(["cache", "data", "response"], type)) {
              const loaderResponse = value;
              const loadedInfos =
                objectAssign({ response: loaderResponse }, resolvedInfos);

              // add metrics if a request was made
              const metrics = type === "response" ?
                Observable.of({
                  type: "metrics",
                  value: {
                    size: value.size,
                    duration: value.duration,
                  },
                }) : Observable.empty();

              return metrics
                .concat(
                  _parser(loadedInfos)
                    .map(parserResponse => ({
                      type: "data",
                      value: objectAssign({ parsed: parserResponse }, loadedInfos),
                    }))
                );
            } else {
              return Observable.of({ type, value });
            }
          });
      }).do(null, null, () => { retryError$.complete(); });

    const retryError$ = retryErrorSubject
      .map(error => ({ type: "error", value: error }));

    return Observable.merge(pipeline$, retryError$);
  };
}
