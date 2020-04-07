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
import { ISegmentLoaderContent } from "./create_segment_loader";
import ObservablePrioritizer from "./prioritizer";
import {
  ISegmentFetcher,
  ISegmentFetcherEvent,
} from "./segment_fetcher";

/** Oject returned by `applyPrioritizerToSegmentFetcher`. */
export interface IPrioritizedSegmentFetcher<T> {
  /** Create a new request for a segment with a given priority. */
  createRequest : (content : ISegmentLoaderContent,
                   priority? : number) => Observable<ISegmentFetcherEvent<T>>;

  /** Update priority of a request created through `createRequest`. */
  updatePriority : (observable : Observable<ISegmentFetcherEvent<T>>,
                    priority : number) => void;
}

/**
 * This function basically put in relation:
 *   - a SegmentFetcher, which will be used to perform the segment request
 *   - a prioritizer, which will handle the priority of a segment request
 *
 * and returns functions to fetch segments with a given priority.
 * @param {Object} prioritizer
 * @param {Object} fetcher
 * @returns {Object}
 */
export default function applyPrioritizerToSegmentFetcher<T>(
  prioritizer : ObservablePrioritizer<ISegmentFetcherEvent<T>>,
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
      content : ISegmentLoaderContent,
      priority : number = 0
    ) : Observable<ISegmentFetcherEvent<T>> {
      return prioritizer.create(fetcher(content), priority);
    },

    /**
     * Update the priority of a pending request, created through
     * `createRequest`.
     * @param {Observable} observable - the corresponding request
     * @param {Number} priority
     */
    updatePriority(
      observable : Observable<ISegmentFetcherEvent<T>>,
      priority : number
    ) : void {
      prioritizer.updatePriority(observable, priority);
    },

  };
}
