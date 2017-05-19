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

const { Subject } = require("rxjs/Subject");
const { asap } = require("rxjs/scheduler/asap");
const { Observable } = require("rxjs/Observable");
const { retryWithBackoff } = require("../utils/retry");
const { tryCatch, castToObservable } = require("../utils/rx-utils");
const {
  RequestError,
  NetworkError,
  OtherError,
  RequestErrorTypes,
  isKnownError,
} = require("../errors");

/**
 * The default number of times a pipeline request will be re-performed when
 * on error.
 * @type Number
 */
const DEFAULT_MAXIMUM_RETRY_ON_ERROR = 4;

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
function errorSelector(code, pipelineType, error, fatal=true) {
  if (!isKnownError(error)) {
    const ErrorType = (error instanceof RequestError)
      ? NetworkError
      : OtherError;

    error = new ErrorType(code, error, fatal);
  }

  error.pipelineType = pipelineType;
  return error;
}

/**
 * Called on a pipeline's loader error.
 * Returns whether the loader request should be retried.
 * @param {Error} error
 * @returns {Boolean}
 */
function loaderShouldRetry(error) {
  if (!(error instanceof RequestError)) {
    return false;
  }
  if (error.type === RequestErrorTypes.ERROR_HTTP_CODE) {
    return error.status >= 500 || error.status == 404;
  }
  return (
    error.type === RequestErrorTypes.TIMEOUT ||
    error.type === RequestErrorTypes.ERROR_EVENT
  );
}

const metricsScheduler = asap;

/**
 * Creates the following pipeline:
 *   Infos
 *      => [resolver] Infos -> ResolvedInfos
 *      => [loader]   ResolvedInfos -> Response
 *      => [parser]   (Response, ResolvedInfos) -> ParsedInfos
 *      => { ...ResolvedInfos, ...ParsedInfos }
 *
 * TODO(pierre): create a pipeline patcher to work over a WebWorker
 * @param {string} pipelineType
 * @param {Object} transportObject
 * @param {Subject} metrics
 * @param {Object} [options={}]
 * @returns {Function}
 */
function createPipeline(pipelineType,
                        { resolver, loader, parser },
                        metrics,
                        errorStream,
                        options={}) {


  if (!resolver) {
    resolver = Observable.of;
  }
  if (!loader)  {
    loader = Observable.of;
  }
  if (!parser) {
    parser = Observable.of;
  }

  const { maxRetry, cache } = options;

  const totalRetry = typeof maxRetry === "number" ?
    maxRetry : DEFAULT_MAXIMUM_RETRY_ON_ERROR;

  /**
   * Backoff options given to the backoff retry done with the loader function.
   * @see retryWithBackoff
   */
  const loaderBackoffOptions = {
    retryDelay: 200,
    errorSelector: loaderErrorSelector,
    totalRetry: totalRetry,
    shouldRetry: totalRetry && loaderShouldRetry,
    onRetry: (error) => {
      schedulMetrics({ type: pipelineType, value: error.xhr });
      errorStream.next(errorSelector("PIPELINE_LOAD_ERROR", pipelineType, error, false));
    },
  };

  function resolverErrorSelector(error) {
    throw errorSelector("PIPELINE_RESOLVE_ERROR", pipelineType, error);
  }

  function loaderErrorSelector(error) {
    throw errorSelector("PIPELINE_LOAD_ERROR", pipelineType, error);
  }

  function parserErrorSelector(error) {
    throw errorSelector("PIPELINE_PARSING_ERROR", pipelineType, error);
  }

  function dispatchMetrics(value) {
    metrics.next(value);
  }

  function schedulMetrics(value) {
    metricsScheduler.schedule(dispatchMetrics, 0, value);
  }

  function resolverWithCatch(pipelineInputData) {
    return tryCatch(resolver, pipelineInputData).catch(resolverErrorSelector);
  }

  function loaderWithRetry(resolvedInfos) {
    return retryWithBackoff(tryCatch(loader, resolvedInfos), loaderBackoffOptions);
  }

  function loaderWithCache(resolvedInfos) {
    const fromCache = cache ? cache.get(resolvedInfos) : null;
    if (fromCache === null) {
      return loaderWithRetry(resolvedInfos);
    } else {
      return castToObservable(fromCache)
        .catch(() => loaderWithRetry(resolvedInfos));
    }
  }

  function parserWithCatch(loadedInfos) {
    return tryCatch(parser, loadedInfos).catch(parserErrorSelector);
  }

  function extendsResponseAndResolvedInfos(resolvedInfos, response) {
    const loadedInfos = Object.assign({ response }, resolvedInfos);

    // add loadedInfos to the pipeline cache
    if (cache) {
      cache.add(resolvedInfos, response);
    }

    // emits its value in the metrics observer
    schedulMetrics({ type: pipelineType, value: loadedInfos });

    return loadedInfos;
  }

  function extendsParsedAndLoadedInfos(loadedInfos, parsed) {
    return Object.assign({ parsed }, loadedInfos);
  }

  return (pipelineInputData) => {
    return resolverWithCatch(pipelineInputData)
      .mergeMap(loaderWithCache, extendsResponseAndResolvedInfos)
      .mergeMap(parserWithCatch, extendsParsedAndLoadedInfos);
  };
}

/**
 * Returns an object allowing to easily create the pipelines (resolve + load +
 * parse) for given "pipelineTypes" (audio/video...) for the transport wanted
 * (dash, smooth...).
 *
 * This object will contain both metrics, an Observable, and createPipelines,
 * a function.
 * @returns {Object}
 */
function PipeLines() {
  // the metrics observer/observable is used to calculate informations
  // about loaded responsed in the loader part of pipelines
  const metrics = new Subject();

  const createPipelines = (transport, options={}) => {
    const pipelines = {
      requiresMediaSource() {
        return transport.directFile !== true;
      },
    };

    for (const pipelineType in transport) {
      pipelines[pipelineType] = createPipeline(pipelineType,
                                               transport[pipelineType],
                                               metrics,
                                               options.errorStream,
                                               options[pipelineType]);
    }

    return pipelines;
  };

  return { createPipelines, metrics };
}

module.exports = PipeLines;
