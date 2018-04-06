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

import { Observable } from "rxjs/Observable";
import { ISegmentLoaderArguments } from "../../../net/types";
import ObservablePrioritizer from "./prioritizer";
import {
  ISegmentFetcher,
  ISegmentResponse,
} from "./segment_fetcher";

// Defines what is returned by the SegmentPipeline
// See the function definition for documentation
export interface IPrioritizedSegmentFetcher<T> {
  createRequest : (
    content : ISegmentLoaderArguments,
    priority? : number
  ) => Observable<ISegmentResponse<T>>;

  updatePriority : (
    observable : Observable<ISegmentResponse<T>>,
    priority : number
  ) => void;
}

/**
 * This function basically put in relation:
 *   - a SegmentFetcher, which will be used to perform the segment request
 *   - a prioritizer, which will handle the priority of a segment request
 *
 * and returns functions to fetch segments with a given priority.
 * @returns {Object}
 */
export default function applyPrioritizerToSegmentFetcher<T>(
  prioritizer : ObservablePrioritizer<ISegmentResponse<T>>,
  fetcher : ISegmentFetcher<T>
) : IPrioritizedSegmentFetcher<T> {
  return {

    /**
     * Create a Segment request with a given priority.
     * @param {Object} content - content to request
     * @param {Number} priority - priority at which the content should be
     * requested.
     * @returns {Observable}
     */
    createRequest(
      content : ISegmentLoaderArguments,
      priority : number = 0
    ) : Observable<ISegmentResponse<T>> {
      return prioritizer.create(fetcher(content), priority);
    },

    /**
     * Update the priority of a pending request, created through createRequest.
     * @param {Observable} observable - the corresponding request
     * @param {Number} priority
     */
    updatePriority(
      observable : Observable<ISegmentResponse<T>>,
      priority : number
    ) : void {
      prioritizer.updatePriority(observable, priority);
    },

  };
}
