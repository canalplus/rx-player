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
import {
  getMDHDTimescale,
  takePSSHOut,
} from "../../parsers/containers/isobmff";
import { getTimeCodeScale } from "../../parsers/containers/matroska";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import takeFirstSet from "../../utils/take_first_set";
import {
  ISegmentParserSegment,
  ISegmentParserInitSegment,
  ISegmentParserArguments,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isWEBMEmbeddedTrack from "../utils/is_webm_embedded_track";

export default function segmentParser({
  content,
  response,
  initTimescale,
} : ISegmentParserArguments<ArrayBuffer | Uint8Array | null>
) : Observable<ISegmentParserInitSegment<ArrayBuffer | Uint8Array | null> |
               ISegmentParserSegment<ArrayBuffer | Uint8Array | null>>
{
  const { period, segment, representation } = content;
  const { data } = response;
  const appendWindow : [ number, number | undefined ] = [ period.start, period.end ];

  if (data === null) {
    if (segment.isInit) {
      return observableOf({ type: "parsed-init-segment",
                            value: { initializationData: null,
                                     protectionDataUpdate: false,
                                     initTimescale: undefined } });
    }
    return observableOf({ type: "parsed-segment",
                          value: { chunkData: null,
                                   chunkInfos: null,
                                   chunkOffset: 0,
                                   appendWindow,
                                   protectionDataUpdate: false  } });
  }

  const chunkData = new Uint8Array(data);
  const isWEBM = isWEBMEmbeddedTrack(representation);
  let protectionDataUpdate = false;
  if (!isWEBM) {
    const psshInfo = takePSSHOut(chunkData);
    if (psshInfo.length > 0) {
      protectionDataUpdate = representation._addProtectionData("cenc", psshInfo);
    }
  }

  if (segment.isInit) {
    const timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
                               getMDHDTimescale(chunkData);
    return observableOf({ type: "parsed-init-segment",
                          value: { initializationData: chunkData,
                                   initTimescale: isNullOrUndefined(timescale) ?
                                     undefined :
                                     timescale,
                                   protectionDataUpdate } });
  }

  const chunkInfos = isWEBM ? null : // TODO extract from webm
                              getISOBMFFTimingInfos(chunkData,
                                                    false,
                                                    segment,
                                                    initTimescale);
  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
  return observableOf({ type: "parsed-segment",
                        value: { chunkData,
                                 chunkInfos,
                                 chunkOffset,
                                 appendWindow,
                                 protectionDataUpdate: false } });
}
