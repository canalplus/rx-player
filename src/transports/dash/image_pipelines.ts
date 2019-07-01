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

import { of as observableOf } from "rxjs";
import features from "../../features";
import request from "../../utils/request";
import {
  IImageParserObservable,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
  ISegmentParserArguments,
} from "../types";

export function imageLoader(
  { segment } : ISegmentLoaderArguments
) : ISegmentLoaderObservable< ArrayBuffer | null > {
  if (segment.isInit || segment.mediaURL == null) {
    return observableOf({ type: "data-created" as const,
                          value: { responseData: null } });
  }
  const { mediaURL } = segment;
  return request({ url: mediaURL,
                   responseType: "arraybuffer",
                   sendProgressEvents: true });
}

export function imageParser(
  { response, segment } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
) : IImageParserObservable {
  const { responseData } = response;

  // TODO image Parsing should be more on the sourceBuffer side, no?
  if (responseData === null || features.imageParser == null) {
    return observableOf({ segmentData: null,
                          segmentProtection: null,
                          segmentInfos: segment.timescale > 0 ?
                            { duration: segment.isInit ? 0 : segment.duration,
                              time: segment.isInit ? -1 : segment.time,
                              timescale: segment.timescale } :
                            null,
                          segmentOffset: segment.timestampOffset || 0 });
  }

  const bifObject = features.imageParser(new Uint8Array(responseData));
  const data = bifObject.thumbs;
  return observableOf({ segmentData: { data,
                                       start: 0,
                                       end: Number.MAX_VALUE,
                                       timescale: 1,
                                       type: "bif" },
                        segmentInfos: { time: 0,
                                        duration: Number.MAX_VALUE,
                                        timescale: bifObject.timescale },
                        segmentOffset: segment.timestampOffset || 0,
                        segmentProtection: null });
}
