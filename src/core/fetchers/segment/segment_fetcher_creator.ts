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
import config from "../../../config";
import { ITransportPipelines } from "../../../transports";
import {
  IABRMetricsEvent,
  IABRRequestBeginEvent,
  IABRRequestEndEvent,
  IABRRequestProgressEvent,
} from "../../abr";
import { IBufferType } from "../../source_buffers";
import getSegmentBackoffOptions from "./get_segment_backoff_options";
import applyPrioritizerToSegmentFetcher, {
  IPrioritizedSegmentFetcher,
} from "./prioritized_segment_fetcher";
import ObservablePrioritizer from "./prioritizer";
import createSegmentFetcher, {
  ISegmentFetcherEvent,
} from "./segment_fetcher";

const { MIN_CANCELABLE_PRIORITY,
        MAX_HIGH_PRIORITY_LEVEL } = config;

/** Options used by the `SegmentFetcherCreator`. */
export interface ISegmentFetcherCreatorBackoffOptions {
  /**
   * Whether the content is played in a low-latency mode.
   * This has an impact on default backoff delays.
   */
  lowLatencyMode : boolean;
  /** Maximum number of time a request on error will be retried. */
  maxRetryRegular : number | undefined;
  /** Maximum number of time a request be retried when the user is offline. */
  maxRetryOffline : number | undefined;
}

/**
 * Interact with the transport pipelines to download segments with the right
 * priority.
 *
 * @class SegmentFetcherCreator
 *
 * @example
 * ```js
 * const creator = new SegmentFetcherCreator(transport);
 *
 * // 2 - create a new fetcher with its backoff options
 * const fetcher = creator.createSegmentFetcher("audio", {
 *   maxRetryRegular: Infinity,
 *   maxRetryOffline: Infinity,
 * });
 *
 * // 3 - load a segment with a given priority
 * fetcher.createRequest(myContent, 1)
 *   // 4 - parse it
 *   .pipe(
 *     filter(evt => evt.type === "chunk"),
 *     mergeMap(response => response.parse());
 *   )
 *   // 5 - use it
 *   .subscribe((res) => console.log("audio chunk downloaded:", res));
 * ```
 */
export default class SegmentFetcherCreator<T> {
  private readonly _transport : ITransportPipelines;
  private readonly _prioritizer : ObservablePrioritizer<ISegmentFetcherEvent<T>>;
  private readonly _backoffOptions : ISegmentFetcherCreatorBackoffOptions;

  /**
   * @param {Object} transport
   */
  constructor(
    transport : ITransportPipelines,
    options : ISegmentFetcherCreatorBackoffOptions
  ) {
    this._transport = transport;
    this._prioritizer = new ObservablePrioritizer({
      prioritySteps: { high: MAX_HIGH_PRIORITY_LEVEL,
                       low: MIN_CANCELABLE_PRIORITY },
    });
    this._backoffOptions = options;
  }

  /**
   * Create a segment fetcher, allowing to easily perform segment requests.
   * @param {string} bufferType - The type of buffer concerned (e.g. "audio",
   * "video", etc.)
   * @param {Subject} requests$ - Subject through which request-related events
   * (such as those needed by the ABRManager) will be sent.
   * @returns {Object}
   */
  createSegmentFetcher(
    bufferType : IBufferType,
    requests$ : Subject<IABRRequestBeginEvent |
                        IABRRequestProgressEvent |
                        IABRRequestEndEvent |
                        IABRMetricsEvent>
  ) : IPrioritizedSegmentFetcher<T> {
    const backoffOptions = getSegmentBackoffOptions(bufferType, this._backoffOptions);
    const segmentFetcher = createSegmentFetcher<T>(bufferType,
                                                   this._transport,
                                                   requests$,
                                                   backoffOptions);
    return applyPrioritizerToSegmentFetcher<T>(this._prioritizer, segmentFetcher);
  }
}
