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
import castToObservable from "../../utils/castToObservable";
import noop from "../../utils/noop";
import tryCatch from "../../utils/rx-tryCatch";

import config from "../../config";
import {
  CustomError,
  isKnownError,
  NetworkError,
  OtherError,
  RequestError,
} from "../../errors";

import downloadingBackoff from "./backoff";
import {
  IPipelineError,
  IPipelineMetrics,
  PipelineEvent,
} from "./types";

import {
  processManifestPipeline,
  processPipeline,
 } from "./process_pipeline";

import {
  ILoaderData,
  ILoaderObservable,
  ILoaderProgress,
  ILoaderResponse,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  IResolverObservable,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  SegmentParserObservable,
  TextTrackParserObservable,
} from "../../net/types";

type ILoader<T> = ILoaderData<T> | ILoaderProgress | ILoaderResponse<T>;
type IParserObservable =
  SegmentParserObservable|TextTrackParserObservable|ImageParserObservable|IManifestParserObservable;

interface IBackoffOptions {
  baseDelay: number;
  maxDelay: number;
  maxRetryRegular: number;
  maxRetryOffline: number;
  onRetry: (error : Error) => void;
}

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

interface ICache<T,U> {
  add : (obj : T, arg: U) => void;
  get : (obj : T) => U;
}

export interface IPipelineOptions<T, U> {
  cache? : ICache<T,U>;
  maxRetry? : number;
}

// function catchedLoader(
//   loader:  ((x : IManifestLoaderArguments) => ILoaderObservable<Document>),
//   backoffOptions: IBackoffOptions,
//   resolvedInfos : IManifestLoaderArguments,
//   pipelineInputData : IManifestLoaderArguments,
//   cache?: ICache<IManifestLoaderArguments, IManifestLoaderArguments>
// ) : ILoaderObservable<Document>;
// function catchedLoader(
//   loader:  ((x : ISegmentLoaderArguments) => ILoaderObservable<ArrayBuffer|Uint8Array>),
//   backoffOptions: IBackoffOptions,
//   resolvedInfos : ISegmentLoaderArguments,
//   pipelineInputData : ISegmentLoaderArguments,
//   cache?: ICache<ISegmentLoaderArguments, ISegmentLoaderArguments>
// ) : ILoaderObservable<ArrayBuffer|Uint8Array>;
function catchedLoader<T, U>(
  loader: (x?: T) => Observable<U>,
  backoffOptions: IBackoffOptions,
  resolvedInfos : T,
  pipelineInputData : T,
  cache?: ICache<T, T>
) : Observable<U> {
  function loaderWithRetry(
    _resolvedInfos: T
  ) {
    // TODO do something about bufferdepth to avoid infinite errors?
    return downloadingBackoff(
      tryCatch(loader, _resolvedInfos),
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

// function catchedParser(
//   parser: ((x : IManifestParserArguments<Document>) => IManifestParserObservable),
//   loadedInfos : IManifestParserArguments<Document>) : IManifestParserObservable;
// function catchedParser(
//   parser: ((x : ISegmentParserArguments<Uint8Array|ArrayBuffer>) =>
//     SegmentParserObservable|TextTrackParserObservable|ImageParserObservable),
//   loadedInfos : ISegmentParserArguments<Uint8Array|ArrayBuffer>
// ) : SegmentParserObservable|TextTrackParserObservable|ImageParserObservable;
function catchedParser<T, U>(
  parser: (x? : T) => Observable<U>,
  loadedInfos : T
) : Observable<U> {
  return tryCatch(parser, loadedInfos)
    .catch((error) => {
      throw errorSelector("PIPELINE_PARSING_ERROR", error);
    });
}

function startPipeline(
  resolver: (x? : IManifestLoaderArguments) => IResolverObservable,
  pipelineInputData: IManifestLoaderArguments,
  loader: (x : IManifestLoaderArguments) => ILoaderObservable<Document>,
  backoffOptions: IBackoffOptions,
  parser:  (x : IManifestParserArguments<Document>) => IManifestParserObservable,
  retryErrorSubject: Subject<Error>,
  cache?: ICache<IManifestLoaderArguments,IManifestLoaderArguments>
): Observable<PipelineEvent>;
function startPipeline(
  resolver: (x? : ISegmentLoaderArguments) => Observable<ISegmentLoaderArguments>,
  pipelineInputData: ISegmentLoaderArguments,
  loader: (x : ISegmentLoaderArguments) => ILoaderObservable<Uint8Array|ArrayBuffer>,
  backoffOptions: IBackoffOptions,
  parser:   (x : ISegmentParserArguments<Uint8Array|ArrayBuffer>) =>
    SegmentParserObservable|TextTrackParserObservable|ImageParserObservable,
  retryErrorSubject: Subject<Error>,
  cache?: ICache<ISegmentLoaderArguments,ISegmentLoaderArguments>
): Observable<PipelineEvent>;
function startPipeline<T,U,V,W>(
  resolver: (x?: T) => Observable<T>,
  pipelineInputData: T,
  loader: (x?: T) => Observable<ILoader<U>>,
  backoffOptions: IBackoffOptions,
  parser: (x?: V) => Observable<W>,
  retryErrorSubject: Subject<Error>,
  cache?: ICache<T,T>
): Observable<PipelineEvent|{}> {
const pipeline$ = tryCatch(resolver, pipelineInputData)
.catch((error : Error) => {
  throw errorSelector("PIPELINE_RESOLVE_ERROR", error);
}).mergeMap((resolvedInfos: T) => {
  return catchedLoader<T,ILoader<U>>(
    loader,
    backoffOptions,
    resolvedInfos,
    pipelineInputData,
    cache
  )
    .mergeMap((event: ILoader<U>) => {
      // "cache": taken from cache
      // "data": no request have been done
      // "response": a request has been done
      if (arrayIncludes(["cache", "data", "response"], event.type)) {
        const loaderResponse = event.value;
        const loadedInfos =
          objectAssign({ response: loaderResponse }, resolvedInfos);

        // add metrics if a request was made
        const metrics : Observable<IPipelineMetrics> =
        event.type === "response" ?
            Observable.of({
              type: "metrics" as "metrics",
              value: {
                size: event.value.size || 0,
                duration: event.value.duration || 0,
              },
            }) :
            Observable.empty();

        return metrics
          .concat(
            catchedParser<V,W>(parser, loadedInfos as W)
            .map((parserResponse: IParserObservable) => {
              return {
                type: "data" as "data",
                value: objectAssign({
                  parsed: parserResponse,
                }, loadedInfos),
              };
            })
          );
      } else {
        return Observable.of(event);
      }
    });
}).do(noop, noop, () => { retryErrorSubject.complete(); });

const retryError$ : Observable<IPipelineError> = retryErrorSubject
.map((error: Error) => ({
  type: "error" as "error",
  value: error,
}));

return Observable.merge(pipeline$, retryError$);
}

/**
 * Returns observable of the wanted transport object through
 * the loader -> parser pipeline.
 *
 * (A transport object can be for example:  audio and video
 * segments, text, images...)
 *
 * The observable will emit:
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
 * @param {Object} informations
 * @param {Function} transportObject.loader
 * @param {Function} transportObject.parser
 * @param {Object} options
 * @returns {Observable<Object>}
 */
function createSegmentPipeline(
  segmentInfos: ISegmentLoaderArguments,
  { loader, parser } : {
    loader : (x : ISegmentLoaderArguments) => ILoaderObservable<Uint8Array|ArrayBuffer>;
    parser : (x : ISegmentParserArguments<Uint8Array|ArrayBuffer>) =>
      SegmentParserObservable|TextTrackParserObservable|ImageParserObservable;
  },
  options : IPipelineOptions<ISegmentLoaderArguments, ISegmentLoaderArguments> = {}
) : Observable<PipelineEvent> {
  const { maxRetry, cache } = options;

  /**
   * Subject that will emit non-fatal errors.
   */
  const retryErrorSubject : Subject<Error> = new Subject();

  const totalRetry = typeof maxRetry === "number" ?
    maxRetry : DEFAULT_MAXIMUM_RETRY_ON_ERROR;

  /**
   * Backoff options given to the backoff retry done with the loader function.
   * @see retryWithBackoff
   */
  const backoffOptions: IBackoffOptions = {
    baseDelay: INITIAL_BACKOFF_DELAY_BASE,
    maxDelay: MAX_BACKOFF_DELAY_BASE,
    maxRetryRegular: totalRetry,
    maxRetryOffline: DEFAULT_MAXIMUM_RETRY_ON_OFFLINE,
    onRetry: (error : Error) => {
      retryErrorSubject
        .next(errorSelector("PIPELINE_LOAD_ERROR", error, false));
    },
  };

  return startPipeline(
    Observable.of,
    segmentInfos,
    loader,
    backoffOptions,
    parser,
    retryErrorSubject,
    cache
  );
}

/**
 * Returns observable of the wanted manifest transport object through
 * the resolver -> loader -> parser pipeline.
 *
 * The observable will emit:
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
 * @param {string} url
 * @param {Function} transport.manifest.resolver
 * @param {Function} transport.manifest.loader
 * @param {Function} transport.manifest.parser
 * @returns {Observable<Object>}
 */
function createManifestPipeline(
  url: IManifestLoaderArguments,
  { resolver, loader, parser } : {
    resolver?: (x : IManifestLoaderArguments) => IResolverObservable;
    loader: (x : IManifestLoaderArguments) => ILoaderObservable<Document>;
    parser: (x : IManifestParserArguments<Document>) => IManifestParserObservable;
  }
) : Observable<PipelineEvent> {
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
    maxRetryRegular: DEFAULT_MAXIMUM_RETRY_ON_ERROR,
    maxRetryOffline: DEFAULT_MAXIMUM_RETRY_ON_OFFLINE,
    onRetry: (error : Error) => {
      retryErrorSubject
        .next(errorSelector("PIPELINE_LOAD_ERROR", error, false));
    },
  };

  return startPipeline(
    resolver || Observable.of,
    url,
    loader,
    backoffOptions,
    parser,
    retryErrorSubject
  );

}

export {
  processPipeline,
  createSegmentPipeline,
  createManifestPipeline,
  processManifestPipeline
};
