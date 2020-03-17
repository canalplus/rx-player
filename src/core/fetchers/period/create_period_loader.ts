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

import { Observable } from "rxjs";
import {
  catchError,
  map,
} from "rxjs/operators";
import { ICustomError } from "../../../errors";
import {
  ILoadedPeriod,
  IPeriodLoaderArguments,
  IPeriodLoaderDataLoadedEvent,
  IPeriodLoaderEvent as TOOD,
  IPeriodLoaderFunction,
  ITransportPeriodPipeline,
} from "../../../transports";
import tryCatch$ from "../../../utils/rx-try_catch";
import errorSelector from "../utils/error_selector";
import {
  IBackoffOptions,
  tryRequestObservableWithBackoff,
} from "../utils/try_urls_with_backoff";

/** An Error happened while loading (usually a request error). */
export interface IPeriodLoaderWarning { type : "warning";
                                        value : ICustomError; }

/** The value from the response emitted by `createPeriodLoader`. */
export interface IPeriodLoaderResponseValue {
  /** The Period's data. */
  responseData : ILoadedPeriod;
  /** The URL on which the Period was loaded (post-redirection). */
  url? : string;
  /** The time at which the Period request was sent. */
  sendingTime? : number;
  /** The time at which the Period request was completely received. */
  receivedTime? : number;
}

// Events a loader emits
export type IPeriodLoaderEvent = IPeriodLoaderDataLoadedEvent |
                                 IPeriodLoaderWarning;

/**
 * Returns function allowing to download the Period through its transport
 * pipeline's loader.
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
 * @param {Object} periodPipeline
 * @param {Object} options
 * @returns {Function}
 */
export default function createPeriodLoader(
  periodPipeline : ITransportPeriodPipeline,
  backoffOptions : IBackoffOptions
) : (x : IPeriodLoaderArguments) => Observable<IPeriodLoaderEvent> {
  const loader : IPeriodLoaderFunction = periodPipeline.loader;

  /**
   * Load wanted data:
   *   - get it from cache if present
   *   - call the transport loader - with an exponential backoff - if not
   * @param {Object} loaderArgument - Input given to the loader
   * @returns {Observable}
   */
  function loadData(
    loaderArgument : IPeriodLoaderArguments
  ) : Observable< TOOD |
                  IPeriodLoaderWarning >
  {
    const loader$ = tryCatch$(loader, loaderArgument);
    return tryRequestObservableWithBackoff(loader$, backoffOptions).pipe(
      catchError((error : unknown) : Observable<never> => {
        throw errorSelector(error);
      }),
      map((evt) : TOOD | IPeriodLoaderWarning => {
        return evt.type === "retry" ? ({ type: "warning" as const,
                                         value: errorSelector(evt.value) }) :
                                      evt.value;
      }));
  }

  /**
   * Load the corresponding data.
   * @param {Object} loaderArgs
   * @returns {Observable}
   */
  return function loadPeriod(
    loaderArgs : IPeriodLoaderArguments
  ) : Observable<IPeriodLoaderEvent> {
      return loadData(loaderArgs);
  };
}
