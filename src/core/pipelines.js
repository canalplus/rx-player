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

const defaults = require("lodash/object/defaults");
const { Subject, Scheduler, Observable } = require("rxjs");
const { retryWithBackoff } = require("../utils/retry");

const timeoutError = new Error("timeout");

function isObservable(val) {
  return !!val && typeof val.subscribe == "function";
}

const noCache = {
  add() {},
  get() {
    return null;
  },
};

const metricsScheduler = Scheduler.asap;

/**
 * Creates the following pipeline:
 *   Infos
 *      => [resolver] Infos -> ResolvedInfos
 *      => [loader]   ResolvedInfos -> Response
 *      => [parser]   (Response, ResolvedInfos) -> ParsedInfos
 *      => { ...ResolvedInfos, ...ParsedInfos }
 *
 * TODO(pierre): create a pipeline patcher to work over a WebWorker
 */
function createPipeline(type,
                        { resolver, loader, parser },
                        metrics,
                        opts={}) {

  if (!parser) {
    parser = Observable.of;
  }
  if (!loader)  {
    loader = Observable.of;
  }
  if (!resolver) {
    resolver = Observable.of;
  }

  const { totalRetry, timeout, cache } = defaults(opts, {
    totalRetry: 3,
    timeout: 10 * 1000,
    cache: noCache,
  });

  const backoffOptions = {
    retryDelay: 500,
    totalRetry,
    shouldRetry: err => (
      (err.code >= 500 || err.code < 200) ||
      /timeout/.test(err.message) ||
      /request: error event/.test(err.message)
    ),
  };

  function dispatchMetrics(value) {
    metrics.next(value);
  }

  function schedulMetrics(value) {
    metricsScheduler.schedule(dispatchMetrics, 0, value);
  }

  function loaderWithRetry(resolvedInfos) {
    return retryWithBackoff(
      loader(resolvedInfos).timeout(timeout, timeoutError),
      backoffOptions
    );
  }

  function cacheOrLoader(resolvedInfos) {
    const fromCache = cache.get(resolvedInfos);
    if (fromCache === null) {
      return loaderWithRetry(resolvedInfos);
    } else if (isObservable(fromCache)) {
      return fromCache.catch(() => loaderWithRetry(resolvedInfos));
    } else {
      return Observable.of(fromCache);
    }
  }

  function extendsResponseAndResolvedInfos(resolvedInfos, response) {
    const loadedInfos = { response, ...resolvedInfos };

    // add loadedInfos to the pipeline cache and emits its value in
    // the metrics observer.
    cache.add(resolvedInfos, response);
    schedulMetrics({ type, value: loadedInfos });

    return loadedInfos;
  }

  function extendsParsedAndLoadedInfos(loadedInfos, parsed) {
    return { parsed, ...loadedInfos };
  }

  return (data) => {
    return resolver(data)
      .flatMap(cacheOrLoader, extendsResponseAndResolvedInfos)
      .flatMap(parser, extendsParsedAndLoadedInfos);
  };
}

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
                                               options[pipelineType]);
    }

    return pipelines;
  };

  return { createPipelines, metrics };
}

module.exports = PipeLines;
