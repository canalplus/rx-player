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

import {
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  map,
  mergeMap,
} from "rxjs/operators";
import { ICustomError } from "../../../errors";
import {
  IManifestLoaderArguments,
  IManifestLoaderEvent,
  IManifestLoaderFunction,
  IManifestResolverFunction,
  ITransportManifestPipeline,
} from "../../../transports";
import tryCatch from "../../../utils/rx-try_catch";
import backoff from "../utils/backoff";
import errorSelector from "../utils/error_selector";
import getBackoffOptions from "../utils/get_backoff_options";

// An Error happened while loading (usually a request error)
export interface IPipelineLoaderWarning { type : "warning";
                                          value : ICustomError; }
// A response is available
export interface IPipelineLoaderResponse<T> { type : "response";
                                              value : { responseData : T;
                                                        url? : string;
                                                        sendingTime? : number;
                                                        receivedTime? : number; }; }

export type IManifestPipelineLoaderResponse =
  IPipelineLoaderResponse< Document | string >;

// Events a loader emits
// Type parameters: T: Argument given to the loader
//                  U: ResponseType of the request
export type IManifestPipelineLoaderEvent = IManifestPipelineLoaderResponse |
                                           IPipelineLoaderWarning;

// Options you can pass on to the loader
export interface IManifestPipelineLoaderOptions {
  maxRetry : number; // Maximum number of time a request on error will be retried
  maxRetryOffline : number; // Maximum number of time a request be retried when
                            // the user is offline
}

/**
 * Returns function allowing to download the Manifest through a resolver ->
 * loader pipeline.
 *
 * The function returned takes the loader's data in arguments and returns an
 * Observable which will emit:
 *
 *   - each time a minor request error is encountered (type "warning").
 *     With the error as a value.
 *
 *   - The fetched data (type "response").
 *
 * This observable will throw if, following the options given, the request and
 * possible retry all failed.
 *
 * This observable will complete after emitting the data.
 *
 * @param {Object} manifestPipeline
 * @param {Object} options
 * @returns {Function}
 */
export default function createManifestLoader(
  manifestPipeline : ITransportManifestPipeline,
  options : IManifestPipelineLoaderOptions
) : (x : IManifestLoaderArguments) => Observable<IManifestPipelineLoaderEvent> {
  const { maxRetry, maxRetryOffline } = options;
  const loader : IManifestLoaderFunction = manifestPipeline.loader;

  // TODO Remove the resolver completely
  const resolver : IManifestResolverFunction =
    manifestPipeline.resolver != null ? manifestPipeline.resolver :
                                        /* tslint:disable deprecation */
                                        observableOf;
                                        /* tslint:enable deprecation */

  // Backoff options given to the backoff retry done with the loader function.
  const backoffOptions = getBackoffOptions(maxRetry, maxRetryOffline);
  /**
   * Call the transport's resolver - if it exists - with the given data.
   *
   * Throws with the right error if it fails.
   * @param {Object} resolverArgument
   * @returns {Observable}
   */
  function callResolver(
    resolverArgument : IManifestLoaderArguments
  ) : Observable<IManifestLoaderArguments> {
    return tryCatch(resolver, resolverArgument)
      .pipe() // Weird TypeScript/RxJS behavior
      .pipe(catchError((error : Error) : Observable<never> => {
        throw errorSelector(error);
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
    loaderArgument : IManifestLoaderArguments
  ) : Observable< IManifestLoaderEvent<Document | string > |
                  IPipelineLoaderWarning >
  {
    return backoff(tryCatch(loader, loaderArgument), backoffOptions).pipe(
      catchError((error : unknown) : Observable<never> => {
        throw errorSelector(error);
      }),
      map((evt) : IManifestLoaderEvent<Document | string> |
                  IPipelineLoaderWarning =>
      {
        return evt.type === "response" ? evt.value :
                                         ({ type: "warning" as const,
                                            value: errorSelector(evt.value) });
      }));
  }

  /**
   * Load the corresponding data.
   * @param {Object} pipelineInputData
   * @returns {Observable}
   */
  return function startPipeline(
    loaderArgs : IManifestLoaderArguments
  ) : Observable<IManifestPipelineLoaderEvent> {
    return callResolver(loaderArgs).pipe(
      mergeMap((resolverResponse : IManifestLoaderArguments) => {
        return loadData(resolverResponse).pipe(
          mergeMap((arg) => {
            if (arg.type === "warning") {
              return observableOf(arg);
            }
            const value = arg.value;
            return observableOf({ type: "response" as const,
                                  value: { responseData: value.responseData,
                                           url: value.url,
                                           sendingTime: value.sendingTime,
                                           receivedTime: value.receivedTime } });
          }));
      }));
  };
}
