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

import config from "../config.js";
import { Subject } from "rxjs/Subject";
import { asap } from "rxjs/scheduler/asap";
import { Observable } from "rxjs/Observable";
import { retryWithBackoff } from "../utils/retry";
import { tryCatch, castToObservable } from "../utils/rx-utils";
import {
  RequestError,
  NetworkError,
  OtherError,
  RequestErrorTypes,
  isKnownError,
} from "../errors";

const DEFAULT_MAXIMUM_RETRY_ON_ERROR =
  config.DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR;

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

  const dispatchMetrics = value =>
    metrics.next(value);

  const schedulMetrics = value => {
    asap.schedule(dispatchMetrics, 0, value);
  };

  /**
   * Backoff options given to the backoff retry done with the loader function.
   * @see retryWithBackoff
   */
  const loaderBackoffOptions = {
    retryDelay: 200,
    totalRetry: totalRetry,
    shouldRetry: totalRetry && loaderShouldRetry,
    onRetry: (error) => {
      schedulMetrics({ type: pipelineType, value: error.xhr });
      errorStream.next(errorSelector("PIPELINE_LOAD_ERROR", pipelineType, error, false));
    },
  };

  const _resolver = pipelineInputData =>
    tryCatch(resolver, pipelineInputData)
      .catch((error) => {
        throw errorSelector("PIPELINE_RESOLVE_ERROR", pipelineType, error);
      });

  const _loader = resolvedInfos => {
    const loaderWithRetry = (resolvedInfos) =>
      retryWithBackoff(tryCatch(loader, resolvedInfos), loaderBackoffOptions)
        .catch((error) => {
          throw errorSelector("PIPELINE_LOAD_ERROR", pipelineType, error);
        });

    const fromCache = cache ? cache.get(resolvedInfos) : null;
    return fromCache === null ?
      loaderWithRetry(resolvedInfos) :
      castToObservable(fromCache)
        .catch(() => loaderWithRetry(resolvedInfos));
  };

  const _parser = loadedInfos =>
    tryCatch(parser, loadedInfos)
      .catch((error) => {
        throw errorSelector("PIPELINE_PARSING_ERROR", pipelineType, error);
      });

  const extendsResponseAndResolvedInfos = (resolvedInfos, response) => {
    const loadedInfos = objectAssign({ response }, resolvedInfos);

    // add loadedInfos to the pipeline cache
    if (cache) {
      cache.add(resolvedInfos, response);
    }

    // emits its value in the metrics observer
    schedulMetrics({ type: pipelineType, value: loadedInfos });

    return loadedInfos;
  };

  const extendsParsedAndLoadedInfos = (loadedInfos, parsed) =>
    objectAssign({ parsed }, loadedInfos);

  return (pipelineInputData) => {
    return _resolver(pipelineInputData)
      .mergeMap(_loader, extendsResponseAndResolvedInfos)
      .mergeMap(_parser, extendsParsedAndLoadedInfos);
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

  return {
    // TODO switch to createPipeline entirely?
    createPipelines(transport, options={}) {
      const pipelines = {};

      for (const pipelineType in transport) {
        pipelines[pipelineType] = createPipeline(
          pipelineType,
          transport[pipelineType],
          metrics,
          options.errorStream,
          options[pipelineType]
        );
      }

      return pipelines;
    },

    // TODO remove pipelineType entirely from here
    createPipeline(pipelineType, pipeline, options) {
      return createPipeline(
        pipelineType, // TODO remove that
        pipeline,
        metrics, // TODO remove that
        options.errorStream, // TODO remove that
        options
      );
    },

    metrics,
  };
}

export default PipeLines;
