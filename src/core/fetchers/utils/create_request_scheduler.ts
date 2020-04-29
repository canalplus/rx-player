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
  Subject,
} from "rxjs";
import { catchError } from "rxjs/operators";
import { ICustomError } from "../../../errors";
import filterMap from "../../../utils/filter_map";
import tryCatch from "../../../utils/rx-try_catch";
import errorSelector from "./error_selector";
import {
  IBackoffEvent,
  IBackoffOptions,
  tryRequestObservableWithBackoff,
} from "./try_urls_with_backoff";

export default function createRequestScheduler<T>(
  backoffOptions : IBackoffOptions,
  warning$ : Subject<ICustomError>
) : ((fn: () => Observable<T>) => Observable<T>) {

  /**
   * Allow the parser to schedule a new request.
   * @param {Function} request - Function performing the request.
   * @returns {Function}
   */
  return function scheduleRequest(request : () => Observable<T>) : Observable<T> {
    return tryRequestObservableWithBackoff(tryCatch(request, undefined),
                                           backoffOptions).pipe(
      filterMap<IBackoffEvent<T>, T, null>((evt) => {
        if (evt.type === "retry") {
          warning$.next(errorSelector(evt.value));
          return null;
        }
        return evt.value;
      }, null),
      catchError((error : unknown) : Observable<never> => {
        throw errorSelector(error);
      }));
  };
}
