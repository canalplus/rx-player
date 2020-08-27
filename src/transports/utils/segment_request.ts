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
  concat as observableConcat,
  defer as observableDefer,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  mergeMap,
  startWith,
} from "rxjs/operators";
import idGenerator from "../../utils/id_generator";
import {
  IRequestProgress,
  IRequestResponse,
} from "../../utils/request";
import {
  ILoaderRequestEvent,
  ISegmentLoaderDataLoaded,
} from "../types";

const generateRequestID = idGenerator();

/**
 * Link the request observable given to events defined as `ISegmentLoaderEvent`
 * so it can be directly returned from the transport code.
 * @param {Observable} requestObs$
 * @param {string} requestId
 */
export default function performSegmentRequest<T>(
  requestObs$ : Observable<IRequestResponse< T, XMLHttpRequestResponseType > |
                           IRequestProgress>
) : Observable<ISegmentLoaderDataLoaded<T> | ILoaderRequestEvent> {
  return observableDefer(() => {
    const requestId = generateRequestID();
    return requestObs$.pipe(
      mergeMap((evt) => {
        if (evt.type === "progress") {
          return observableOf({ type: "progress" as const,
                                value: { requestId,
                                         duration: evt.value.duration,
                                         size: evt.value.size,
                                         totalSize: evt.value.totalSize } });
        }

        const response = evt.value;
        const response$ = observableOf({ type: "data" as const,
                                         value: { responseData: response.responseData,
                                                  url: response.url } });
        const requestEnd$ = observableOf({ type: "request-end" as const,
                                  value: { requestId,
                                           duration: response.duration,
                                           sendingTime: response.sendingTime,
                                           receivedTime: response.receivedTime,
                                           size: response.size,
                                           status: response.status } });
        return observableConcat(response$, requestEnd$);
      }),
      startWith({ type: "request-begin" as const,
                  value: { requestId } })
    );
  });
}
