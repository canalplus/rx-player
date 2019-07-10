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

import { Subject } from "rxjs";
import {
  ISegmentLoaderArguments,
  ITransportPipelines,
} from "../../../transports";
import {
  IABRMetric,
  IABRRequest,
} from "../../abr";
import { IBufferType } from "../../source_buffers";
import { IPipelineLoaderOptions } from "../utils/create_loader";
import applyPrioritizerToSegmentFetcher, {
  IPrioritizedSegmentFetcher,
} from "./prioritized_segment_fetcher";
import ObservablePrioritizer from "./prioritizer";
import createSegmentFetcher, {
  ISegmentFetcherEvent,
} from "./segment_fetcher";

/**
 * Interact with the networking pipelines to download segments with the right
 * priority.
 *
 * @class SegmentPipelinesManager
 *
 * @example
 * ```js
 * // 1 - create the manager
 * const segmentPipelinesManager = new SegmentPipelinesManager(transport);
 *
 * // 2 - create a new pipeline with its own options
 * const pipeline = segmentPipelinesManager.createPipeline("audio", {
 *   maxRetry: Infinity,
 *   maxRetryOffline: Infinity,
 * });
 *
 * // 3 - load a segment with a given priority
 * pipeline.createRequest(myContent, 1)
 *
 *   // 4 - parse it
 *   .pipe(
 *     filter(evt => evt.type === "response"),
 *     mergeMap(response => response.parse());
 *   )
 *
 *   // 5 - use it
 *   .subscribe((res) => console.log("audio segment downloaded:", res));
 * ```
 */
export default class SegmentPipelinesManager<T> {
  private readonly _transport : ITransportPipelines;
  private readonly _prioritizer : ObservablePrioritizer<ISegmentFetcherEvent<T>>;

  /**
   * @param {Object} transport
   */
  constructor(transport : ITransportPipelines) {
    this._transport = transport;
    this._prioritizer = new ObservablePrioritizer();
  }

  /**
   * Create a segment pipeline, allowing to easily perform segment requests.
   * @param {string} bufferType
   * @param {Object} options
   * @returns {Object}
   */
  createPipeline(
    bufferType : IBufferType,
    requests$ : Subject<IABRRequest | IABRMetric>,
    options : IPipelineLoaderOptions<ISegmentLoaderArguments, T>
  ) : IPrioritizedSegmentFetcher<T> {
    const segmentFetcher = createSegmentFetcher<T>(bufferType,
                                                   this._transport,
                                                   requests$,
                                                   options);
    return applyPrioritizerToSegmentFetcher<T>(this._prioritizer, segmentFetcher);
  }
}

export { IPipelineLoaderOptions as IPipelineOptions };
