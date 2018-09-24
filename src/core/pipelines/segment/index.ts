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
import { ICustomError } from "../../../errors";
import { ITransportPipelines } from "../../../net";
import { ISegmentLoaderArguments } from "../../../net/types";
import {
  IABRMetric,
  IABRRequest
} from "../../abr";
import { IBufferType } from "../../source_buffers";
import { IPipelineOptions } from "../core_pipeline";
import applyPrioritizerToSegmentFetcher, {
  IPrioritizedSegmentFetcher,
} from "./prioritized_segment_fetcher";
import ObservablePrioritizer from "./prioritizer";
import createSegmentFetcher, {
  ISegmentResponse,
} from "./segment_fetcher";

/**
 * Interact with the networking pipelines to download segments and dispatch
 * the related events to the right subjects.
 *
 * @class SegmentPipelinesManager
 *
 * @example
 * ```js
 * const requests$ = new Subject();
 * const metrics$ = new Subject();
 * const warnings$ = new Subject();
 *
 * // 1 - create the manager
 * const segmentPipelinesManager =
 *   new SegmentPipelinesManager(transport, requests$, metrics$, warnings$);
 *
 * // Note:
 * // You can create an ABRManager with the same requests$ and metrics$ subjects.
 * // It will then be informed of when the SegmentPipelinesManager downloads
 * // segments and with which metrics.
 * // The format of those events is kept the same for ease of use.
 * const abrManager = new ABRManager(requests$, metrics$);
 *
 * // 2 - create a new pipeline with its own options
 * const pipeline = segmentPipelinesManager.createPipeline("audio", {
 *   maxRetry: Infinity,
 *   maxRetryOffline: Infinity,
 * });
 *
 * // 3 - request a content with a given priority
 * pipeline.createRequest(myContent, 1)
 *   .subscribe((res) => console.log("audio segment downloaded:", res));
 * ```
 */
export default class SegmentPipelinesManager<T> {
  private readonly _metrics$ : Subject<IABRMetric>;
  private readonly _requestsInfos$ : Subject<Subject<IABRRequest>>;
  private readonly _warning$ : Subject<Error | ICustomError>;
  private readonly _transportPipelines : ITransportPipelines;
  private readonly _prioritizer : ObservablePrioritizer<ISegmentResponse<T>>;

  /**
   * @param {Object} transport
   * @param {Subject} requestsInfos$
   * @param {Subject} metrics$
   * @param {Subject} warning
   */
  constructor(
    transportPipelines : ITransportPipelines,
    requestsInfos$ : Subject<Subject<IABRRequest>>,
    metrics$ : Subject<IABRMetric>,
    warning : Subject<Error | ICustomError>
  ) {
    this._transportPipelines = transportPipelines;
    this._metrics$ = metrics$;
    this._requestsInfos$ = requestsInfos$;
    this._warning$ = warning;

    this._prioritizer = new ObservablePrioritizer();
  }

  /**
   * @param {string} bufferType
   * @param {Object} options
   * @returns {Function}
   */
  createPipeline(
    bufferType : IBufferType,
    options : IPipelineOptions<ISegmentLoaderArguments, ISegmentResponse<T>>
  ) {
    const segmentFetcher = createSegmentFetcher<T>(
      bufferType,
      this._transportPipelines,
      this._metrics$,
      this._requestsInfos$,
      this._warning$,
      options
    );

    return applyPrioritizerToSegmentFetcher<T>(
      this._prioritizer,
      segmentFetcher
    );
  }
}

export {
  IPipelineOptions,
  IPrioritizedSegmentFetcher,
  ISegmentResponse,
};
