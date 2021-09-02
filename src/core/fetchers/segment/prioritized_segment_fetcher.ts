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
import ObservablePrioritizer, { ITaskEvent } from "./prioritizer";
import {
  ISegmentFetcher,
  ISegmentFetcherEvent,
  ISegmentLoaderContent,
} from "./segment_fetcher";

/**
 * Event sent when a segment request has been temporarly interrupted due to
 * another request with a high priority.
 * The request for that segment will restart (from scratch) when requests with
 * more priority are finished.
 */
export interface ISegmentFetcherInterruptedEvent { type : "interrupted" }

/**
 * Event sent when a segment request just ended.
 * You can use this event to schedule another task you wanted to perform at best
 * immediately after that one (its priority will be checked).
 */
export interface IEndedTaskEvent { type : "ended" }

/** Event sent by a `IPrioritizedSegmentFetcher`. */
export type IPrioritizedSegmentFetcherEvent<TSegmentDataType> =
  ISegmentFetcherEvent<TSegmentDataType> |
  ISegmentFetcherInterruptedEvent |
  IEndedTaskEvent;

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
export default function applyPrioritizerToSegmentFetcher<TSegmentDataType>(
  prioritizer : ObservablePrioritizer<IPrioritizedSegmentFetcherEvent<TSegmentDataType>>,
  fetcher : ISegmentFetcher<TSegmentDataType>
) : IPrioritizedSegmentFetcher<TSegmentDataType> {
  /**
   * The Observables returned by `createRequest` are not exactly the same than
   * the one created by the `ObservablePrioritizer`. Because we still have to
   * keep a handle on that value.
   */
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
