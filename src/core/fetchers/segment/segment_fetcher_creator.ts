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

import config from "../../../config";
import {
  ISegmentPipeline,
  ITransportPipelines,
} from "../../../transports";
import { CancellationSignal } from "../../../utils/task_canceller";
import { IBufferType } from "../../segment_buffers";
import CdnPrioritizer from "../cdn_prioritizer";
import applyPrioritizerToSegmentFetcher, {
  IPrioritizedSegmentFetcher,
} from "./prioritized_segment_fetcher";
import createSegmentFetcher, {
  getSegmentFetcherOptions,
  ISegmentFetcherLifecycleCallbacks,
} from "./segment_fetcher";
import TaskPrioritizer from "./task_prioritizer";


/**
 * Interact with the transport pipelines to download segments with the right
 * priority.
 *
 * @class SegmentFetcherCreator
 */
export default class SegmentFetcherCreator {
  /**
   * Transport pipelines of the currently choosen streaming protocol (e.g. DASH,
   * Smooth etc.).
   */
  private readonly _transport : ITransportPipelines;
  /**
   * `TaskPrioritizer` linked to this SegmentFetcherCreator.
   *
   * Note: this is typed as `any` because segment loaders / parsers can use
   * different types depending on the type of buffer. We could maybe be smarter
   * about it, but typing as any just in select places, like here, looks like
   * a good compromise.
   */
  private readonly _prioritizer : TaskPrioritizer<void>;
  /**
   * Options used by the SegmentFetcherCreator, e.g. to allow configuration on
   * segment retries (number of retries maximum, default delay and so on).
   */
  private readonly _backoffOptions : ISegmentFetcherCreatorBackoffOptions;

  private readonly _cdnPrioritizer : CdnPrioritizer;

  /**
   * @param {Object} transport
   */
  constructor(
    transport : ITransportPipelines,
    options : ISegmentFetcherCreatorBackoffOptions,
    cancelSignal : CancellationSignal
  ) {
    const cdnPrioritizer = new CdnPrioritizer(cancelSignal);

    const { MIN_CANCELABLE_PRIORITY,
            MAX_HIGH_PRIORITY_LEVEL } = config.getCurrent();
    this._transport = transport;
    this._prioritizer = new TaskPrioritizer({
      prioritySteps: { high: MAX_HIGH_PRIORITY_LEVEL,
                       low: MIN_CANCELABLE_PRIORITY },
    });
    this._cdnPrioritizer = cdnPrioritizer;
    this._backoffOptions = options;
  }

  /**
   * Create a segment fetcher, allowing to easily perform segment requests.
   * @param {string} bufferType - The type of buffer concerned (e.g. "audio",
   * "video", etc.)
   * @param {Object} callbacks
   * @returns {Object}
   */
  createSegmentFetcher(
    bufferType : IBufferType,
    callbacks : ISegmentFetcherLifecycleCallbacks
  ) : IPrioritizedSegmentFetcher<unknown> {
    const backoffOptions = getSegmentFetcherOptions(this._backoffOptions);
    const pipelines = this._transport[bufferType];

    // Types are very complicated here as they are per-type of buffer.
    const segmentFetcher = createSegmentFetcher<unknown, unknown>(
      bufferType,
      pipelines as ISegmentPipeline<unknown, unknown>,
      this._cdnPrioritizer,
      callbacks,
      backoffOptions
    );
    return applyPrioritizerToSegmentFetcher(this._prioritizer, segmentFetcher);
  }
}

/** Options used by the `SegmentFetcherCreator`. */
export interface ISegmentFetcherCreatorBackoffOptions {
  /**
   * Whether the content is played in a low-latency mode.
   * This has an impact on default backoff delays.
   */
  lowLatencyMode : boolean;
  /** Maximum number of time a request on error will be retried. */
  maxRetry : number | undefined;
  /**
   * Timeout after which request are aborted and, depending on other options,
   * retried.
   * To set to `-1` for no timeout.
   * `undefined` will lead to a default, large, timeout being used.
   */
  requestTimeout : number | undefined;
}
