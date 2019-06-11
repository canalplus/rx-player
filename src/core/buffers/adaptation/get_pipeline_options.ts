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
import arrayIncludes from "../../../utils/array_includes";
import InitializationSegmentCache from "../../../utils/initialization_segment_cache";
import { ISegmentPipelineOptions } from "../../pipelines";

const { DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
        DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE } = config;

/**
 * @param {string} bufferType
 * @param {number|undefined} retry
 * @param {number|undefined} offlineRetry
 * @returns {Object} - Options to give to the Pipeline
 */
export default function getPipelineOptions(
  bufferType : string,
  { retry, offlineRetry } : { retry? : number; offlineRetry? : number }
) : ISegmentPipelineOptions<any> {
  const cache = arrayIncludes(["audio", "video"], bufferType) ?
    new InitializationSegmentCache<any>() :
    undefined;

  let maxRetry : number;
  let maxRetryOffline : number;

  if (bufferType === "image") {
    maxRetry = 0; // Deactivate BIF fetching if it fails
  } else {
    maxRetry = retry != null ? retry :
                               DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR;
  }
  maxRetryOffline = offlineRetry != null ? offlineRetry :
                                           DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE;
  return { cache, maxRetry, maxRetryOffline };
}
