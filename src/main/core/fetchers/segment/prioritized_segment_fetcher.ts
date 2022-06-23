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
  map,
  Observable,
} from "rxjs";
import log from "../../../log";
import ObservablePrioritizer, {
  IEndedTaskEvent,
  IInterruptedTaskEvent,
  ITaskEvent,
} from "./prioritizer";
import {
  ISegmentFetcher,
  ISegmentFetcherChunkCompleteEvent,
  ISegmentFetcherChunkEvent,
  ISegmentFetcherRetry,
  ISegmentLoaderContent,
} from "./segment_fetcher";

/**
 * This function basically put in relation:
 *   - an `ISegmentFetcher`, which will be used to perform the segment requests
 *   - a prioritizer, which will handle the priority of a segment request
 *
 * and returns functions to fetch segments with a given priority.
 * @param {Object} prioritizer
 * @param {Object} fetcher
 * @returns {Object}
 */
export default function applyPrioritizerToSegmentFetcher<TSegmentDataType>(
  prioritizer : ObservablePrioritizer<IPrioritizedSegmentFetcherEvent<TSegmentDataType>>,
  fetcher : ISegmentFetcher<TSegmentDataType>
) : IPrioritizedSegmentFetcher<TSegmentDataType> {
  /** Map returned task to the task as returned by the `ObservablePrioritizer`. */
  const taskHandlers = new WeakMap<
    Observable<IPrioritizedSegmentFetcherEvent<TSegmentDataType>>,
    Observable<ITaskEvent<IPrioritizedSegmentFetcherEvent<TSegmentDataType>>>
  >();

  return {
    /**
     * Create a Segment request with a given priority.
     * @param {Object} content - content to request
     * @param {Number} priority - priority at which the content should be requested.
     * Lower number == higher priority.
     * @returns {Observable}
     */
    createRequest(
      content : ISegmentLoaderContent,
      priority : number = 0
    ) : Observable<IPrioritizedSegmentFetcherEvent<TSegmentDataType>> {
      const task = prioritizer.create(fetcher(content), priority);
      const flattenTask = task.pipe(
        map((evt) => {
          return evt.type === "data" ? evt.value :
                                       evt;
        })
      );
      taskHandlers.set(flattenTask, task);
      return flattenTask;
    },

    /**
     * Update the priority of a pending request, created through
     * `createRequest`.
     * @param {Observable} observable - The Observable returned by `createRequest`.
     * @param {Number} priority - The new priority value.
     */
    updatePriority(
      observable : Observable<IPrioritizedSegmentFetcherEvent<TSegmentDataType>>,
      priority : number
    ) : void {
      const correspondingTask = taskHandlers.get(observable);
      if (correspondingTask === undefined) {
        log.warn("Fetchers: Cannot update the priority of a request: task not found.");
        return;
      }
      prioritizer.updatePriority(correspondingTask, priority);
    },
  };
}

/** Oject returned by `applyPrioritizerToSegmentFetcher`. */
export interface IPrioritizedSegmentFetcher<TSegmentDataType> {
  /** Create a new request for a segment with a given priority. */
  createRequest : (content : ISegmentLoaderContent,
                   priority? : number) =>
    Observable<IPrioritizedSegmentFetcherEvent<TSegmentDataType>>;

  /** Update priority of a request created through `createRequest`. */
  updatePriority : (
    observable : Observable<IPrioritizedSegmentFetcherEvent<TSegmentDataType>>,
    priority : number
  ) => void;
}

/** Event sent by a `IPrioritizedSegmentFetcher`. */
export type IPrioritizedSegmentFetcherEvent<TSegmentDataType> =
  ISegmentFetcherChunkEvent<TSegmentDataType> |
  ISegmentFetcherChunkCompleteEvent |
  ISegmentFetcherRetry |
  IInterruptedTaskEvent |
  IEndedTaskEvent;
