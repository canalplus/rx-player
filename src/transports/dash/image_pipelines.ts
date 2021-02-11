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
  Observable,
  of as observableOf,
} from "rxjs";
import features from "../../features";
import request from "../../utils/request";
import takeFirstSet from "../../utils/take_first_set";
import {
  IImageParserObservable,
  ISegmentLoaderArguments,
  ISegmentLoaderEvent,
  ISegmentParserArguments,
} from "../types";

/**
 * @param {Object} args
 * @returns {Observable}
 */
export function imageLoader(
  { segment,
    url } : ISegmentLoaderArguments
) : Observable< ISegmentLoaderEvent< ArrayBuffer | null > > {
  if (segment.isInit || url === null) {
    return observableOf({ type: "data-created" as const,
                          value: { responseData: null } });
  }
  return request({ url,
                   responseType: "arraybuffer",
                   sendProgressEvents: true });
}

/**
 * @param {Object} args
 * @returns {Observable}
 */
export function imageParser(
  { response,
    content } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
) : IImageParserObservable {
  const { segment, period } = content;
  const { data, isChunked } = response;

  if (content.segment.isInit) { // image init segment has no use
    return observableOf({ type: "parsed-init-segment",
                          value: { initializationData: null,
                                   protectionDataUpdate: false,
                                   initTimescale: undefined } });
  }

  if (isChunked) {
    throw new Error("Image data should not be downloaded in chunks");
  }

  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);

  // TODO image Parsing should be more on the buffer side, no?
  if (data === null || features.imageParser === null) {
    return observableOf({ type: "parsed-segment",
                          value: { chunkData: null,
                                   chunkInfos: { duration: segment.duration,
                                                 time: segment.time },
                                   chunkOffset,
                                   appendWindow: [period.start, period.end] } });
  }

  const bifObject = features.imageParser(new Uint8Array(data));
  const thumbsData = bifObject.thumbs;
  return observableOf({ type: "parsed-segment",
                        value: { chunkData: { data: thumbsData,
                                              start: 0,
                                              end: Number.MAX_VALUE,
                                              timescale: 1,
                                              type: "bif" },
                                 chunkInfos: { time: 0,
                                               duration: Number.MAX_VALUE,
                                               timescale: bifObject.timescale },
                                 chunkOffset,
                                 appendWindow: [period.start, period.end] } });
}
