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
  ILoadedManifest,
  IManifestLoaderArguments,
  IManifestLoaderEvent as IManifestPipelineLoaderEvent,
  IManifestLoaderFunction,
  IManifestResolverFunction,
  ITransportManifestPipeline,
} from "../../../transports";
import tryCatch$ from "../../../utils/rx-try_catch";
import errorSelector from "../utils/error_selector";
import {
  IBackoffOptions,
  tryRequestObservableWithBackoff,
} from "../utils/try_urls_with_backoff";

// An Error happened while loading (usually a request error)
export interface IManifestLoaderWarning { type : "warning";
                                          value : ICustomError; }

export interface IManifestLoaderResponseValue<T> {
  responseData : T; // The Manifest's data
  url? : string; // The URL on which the Manifest was loaded (post-redirection)
  sendingTime? : number; // The time at which the Manifest request was sent
  receivedTime? : number; // The time at which the Manifest request was
                          // completely received
}

// A response is available from a Manifest's loader
export interface IManifestLoaderResponse {
  type : "response";
  value : IManifestLoaderResponseValue<ILoadedManifest>;
}

// Events a loader emits
export type IManifestLoaderEvent = IManifestLoaderResponse |
                                   IManifestLoaderWarning;

// Options you can pass on to the loader
export interface IManifestLoaderOptions {
  maxRetry : number; // Maximum number of time a request on error will be retried
  maxRetryOffline : number; // Maximum number of time a request be retried when
                            // the user is offline
  baseDelay : number; // initial delay when retrying a request
  maxDelay : number; // maximum delay when retrying a request
}

/**
 * Returns function allowing to download the Manifest through a
 * `resolver -> loader` transport pipeline.
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
 * possible retries all failed.
 *
 * @param {Object} manifestPipeline
 * @param {Object} backoffOptions
 * @returns {Function}
 */
export default function createManifestLoader(
  manifestPipeline : ITransportManifestPipeline,
  backoffOptions : IBackoffOptions
) : (x : IManifestLoaderArguments) => Observable<IManifestLoaderEvent> {
  const loader : IManifestLoaderFunction = manifestPipeline.loader;

  // TODO Remove the resolver completely in the next major version
  const resolver : IManifestResolverFunction =
    manifestPipeline.resolver != null ? manifestPipeline.resolver :
                                        /* tslint:disable deprecation */
                                        observableOf;
                                        /* tslint:enable deprecation */

  /**
   * Call the transport's resolver - if it exists - with the given data.
   * Throws with the right error if it fails.
   * @param {Object} resolverArgument
   * @returns {Observable}
   */
  function callResolver(
    resolverArgument : IManifestLoaderArguments
  ) : Observable<IManifestLoaderArguments> {
    return tryCatch$(resolver, resolverArgument)
      .pipe(catchError((error : Error) : Observable<never> => {
        throw errorSelector(error);
      }));
  }

  /**
   * Load wanted data:
   *   - get it from cache if present
   *   - call the transport loader - with an exponential backoff - if not
   * @param {Object} loaderArgument - Input given to the loader
   * @returns {Observable}
   */
  function loadData(
    loaderArgument : IManifestLoaderArguments
  ) : Observable< IManifestPipelineLoaderEvent |
                  IManifestLoaderWarning >
  {
    const loader$ = tryCatch$(loader, loaderArgument);
    return tryRequestObservableWithBackoff(loader$, backoffOptions).pipe(
      catchError((error : unknown) : Observable<never> => {
        throw errorSelector(error);
      }),
      map((evt) : IManifestPipelineLoaderEvent |
                  IManifestLoaderWarning =>
      {
        return evt.type === "retry" ? ({ type: "warning" as const,
                                         value: errorSelector(evt.value) }) :
                                      evt.value;
      }));
  }

  /**
   * Load the corresponding data.
   * @param {sObject} pipelineInputData
   * @returns {Observable}
   */
  return function loadManifest(
    loaderArgs : IManifestLoaderArguments
  ) : Observable<IManifestLoaderEvent> {
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
