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
import { Subject } from "rxjs/Subject";
import { CustomError } from "../../errors";
import { ITransportPipelines } from "../../net";
import { ISegmentLoaderArguments } from "../../net/types";
import {
  IABRMetric,
  IABRRequest
} from "../abr";
import { SupportedBufferTypes } from "../source_buffers";
import Pipeline, {
  IPipelineOptions,
} from "./pipeline";
import streamPipelineFactory from "./stream_pipeline";

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
 * const segmentPipelinesManager =
 *   new SegmentPipelinesManager(transport, requests$, metrics$, warnings$);
 *
 * // You can create an ABRManager with the same requests$ and metrics$ subjects.
 * // It will then be informed of when the SegmentPipelinesManager downloads and
 * // with which metrics. The format of those events is kept the same for ease of
 * // use.
 * const abrManager = new ABRManager(requests$, metrics$);
 *
 * const pipeline = segmentPipelinesManager.createPipeline("audio");
 * pipeline(myContent)
 *  .subscribe((res) => console.log("audio segment downloaded:", res));
 * ```
 */
export default class SegmentPipelinesManager {
  private _metrics$ : Subject<IABRMetric>;
  private _requestsInfos$ : Subject<Subject<IABRRequest>>;
  private _warning$ : Subject<Error | CustomError>;
  private _transport : ITransportPipelines<any, any, any, any, any>;

  /**
   * @param {Object} transport
   * @param {Subject} requestsInfos$
   * @param {Subject} metrics$
   * @param {Subject} warning
   */
  constructor(
    transport : ITransportPipelines<any, any, any, any, any>,
    requestsInfos$ : Subject<Subject<IABRRequest>>,
    metrics$ : Subject<IABRMetric>,
    warning : Subject<Error | CustomError>
  ) {
    this._transport = transport;
    this._metrics$ = metrics$;
    this._requestsInfos$ = requestsInfos$;
    this._warning$ = warning;
  }

  /**
   * @param {string} bufferType
   * @param {Object} options
   * @returns {Function}
   */
  createPipeline(
    bufferType : SupportedBufferTypes,
    options : IPipelineOptions<any, any>
  ) : (content : ISegmentLoaderArguments) => Observable<any> {
    const pipeline = Pipeline(
      this._transport[bufferType],
      options
    );

    const streamPipeline = streamPipelineFactory(
      this._metrics$,
      this._requestsInfos$,
      this._warning$
    );

    /**
     * @param {Object} content
     * @returns {Observable}
     */
    return function fetchSegment(content : ISegmentLoaderArguments) {
      const pipeline$ = pipeline(content);
      return streamPipeline(bufferType, pipeline$);
    };
  }
}

export { IPipelineOptions };
