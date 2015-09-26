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

var _ = require("canal-js-utils/misc");
var { Subject, Observable } = require("canal-js-utils/rx");
var { retryWithBackoff } = require("canal-js-utils/rx-ext");
var { just } = Observable;

var timeoutError = new Error("timeout");

var noCache = {
  add() {},
  get() {
    return null;
  }
};

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
function createPipeline(type, { resolver, loader, parser }, metrics, opts={}) {
  if (!parser) parser = just;
  if (!loader) loader = just;
  if (!resolver) resolver = just;

  var { totalRetry, timeout, cache } = _.defaults(opts, {
    totalRetry: 3,
    timeout: 10 * 1000,
    cache: noCache
  });

  var backoffOptions = {
    retryDelay: 500,
    totalRetry,
    shouldRetry: err => (
      (err.code >= 500 || err.code < 200) ||
      /timeout/.test(err.message) ||
      /request: error event/.test(err.message)
    ),
  };

  function callLoader(resolvedInfos) {
    return loader(resolvedInfos)
      .timeout(timeout, timeoutError)
      .map((response) => {
        var loadedInfos = _.extend({ response }, resolvedInfos);

        // add loadedInfos to the pipeline cache
        cache.add(resolvedInfos, loadedInfos);

        // emit loadedInfos in the metrics observer
        metrics.next({ type, value: loadedInfos });

        return loadedInfos;
      });
  }

  return (infos) => {
    return resolver(infos)
      .flatMap((resolvedInfos) => {
        var backedOffLoader = retryWithBackoff(() => callLoader(resolvedInfos), backoffOptions);

        var fromCache = cache.get(resolvedInfos);
        if (_.isPromise(fromCache))
          return Observable.from(fromCache).catch(backedOffLoader);

        if (fromCache === null)
          return backedOffLoader();
        else
          return just(fromCache);
      })
      .flatMap((loadedInfos) => {
        return parser(loadedInfos)
          .map(parsed => _.extend({ parsed }, loadedInfos));
      });
  };
}

function PipeLines() {
  // the metrics observer/observable is used to calculate informations
  // about loaded responsed in the loader part of pipelines
  var metrics = new Subject();

  var createPipelines = (transport, options) => {
    options = options || {};

    var ps = [];
    for (var pipelineType in transport) {
      ps[pipelineType] = createPipeline(
        pipelineType, transport[pipelineType], metrics, options[pipelineType]);
    }

    return ps;
  };

  return { createPipelines, metrics };
}

module.exports = PipeLines;
