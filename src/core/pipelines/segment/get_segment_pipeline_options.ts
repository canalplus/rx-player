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
  ILoaderDataLoadedValue,
  ISegmentLoaderArguments,
} from "../../../transports";
import arrayIncludes from "../../../utils/array_includes";
import InitializationSegmentCache from "../../../utils/initialization_segment_cache";

const { DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
        DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE,
        INITIAL_BACKOFF_DELAY_BASE,
        MAX_BACKOFF_DELAY_BASE } = config;

export interface ISegmentPipelineLoaderOptions<T> {
  cache? : { add : (obj : ISegmentLoaderArguments,
                    arg : ILoaderDataLoadedValue<T>) => void;
             get : (obj : ISegmentLoaderArguments)
                     => ILoaderDataLoadedValue<T>; }; // Caching logic
  maxRetry : number; // Maximum number of time a request on error will be retried
  maxRetryOffline : number; // Maximum number of time a request be retried when
                            // the user is offline
  initialBackoffDelay : number; // initial delay when retrying a request
  maximumBackoffDelay : number; // maximum delay when retrying a request
}

/**
 * @param {string} bufferType
 * @param {Object}
 * @returns {Object}
 */
export default function parseSegmentPipelineOptions(
  bufferType : string,
  { segmentRetry,
    offlineRetry,
    lowLatencyMode } : { segmentRetry? : number;
                         offlineRetry? : number;
                         lowLatencyMode : boolean; }
) : ISegmentPipelineLoaderOptions<any> {
  const cache = arrayIncludes(["audio", "video"], bufferType) ?
    new InitializationSegmentCache<any>() :
    undefined;

  let maxRetry : number;
  if (bufferType === "image") {
    maxRetry = 0; // Deactivate BIF fetching if it fails
  } else {
    maxRetry = segmentRetry != null ? segmentRetry :
                                      DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR;
  }
  const maxRetryOffline = offlineRetry != null ? offlineRetry :
                                                 DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE;

  const initialBackoffDelay = lowLatencyMode ?
    INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY :
    INITIAL_BACKOFF_DELAY_BASE.REGULAR;

  const maximumBackoffDelay = lowLatencyMode ?
    MAX_BACKOFF_DELAY_BASE.LOW_LATENCY :
    MAX_BACKOFF_DELAY_BASE.REGULAR;

  return { cache,
           maxRetry,
           maxRetryOffline,
           initialBackoffDelay,
           maximumBackoffDelay };
}
