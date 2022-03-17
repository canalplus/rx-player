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
  getMDHDTimescale,
  takePSSHOut,
} from "../../parsers/containers/isobmff";
import { getTimeCodeScale } from "../../parsers/containers/matroska";
import takeFirstSet from "../../utils/take_first_set";
import {
  ISegmentContext,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import inferSegmentContainer from "../utils/infer_segment_container";

export default function segmentParser(
  loadedSegment : { data : ArrayBuffer | Uint8Array | null;
                    isChunked : boolean; },
  content : ISegmentContext,
  initTimescale : number | undefined
) : ISegmentParserParsedInitChunk<ArrayBuffer | Uint8Array | null> |
    ISegmentParserParsedMediaChunk<ArrayBuffer | Uint8Array | null>
{
  const { period, adaptation, representation, segment } = content;
  const { data } = loadedSegment;
  const appendWindow : [ number, number | undefined ] = [ period.start, period.end ];

  if (data === null) {
    if (segment.isInit) {
      return { segmentType: "init",
               initializationData: null,
               initializationDataSize: 0,
               protectionDataUpdate: false,
               initTimescale: undefined };
    }
    return { segmentType: "media",
             chunkData: null,
             chunkSize: 0,
             chunkInfos: null,
             chunkOffset: 0,
             protectionDataUpdate: false,
             appendWindow };
  }

  const chunkData = new Uint8Array(data);
  const containerType = inferSegmentContainer(adaptation.type, representation);

  // TODO take a look to check if this is an ISOBMFF/webm?
  const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
  let protectionDataUpdate = false;
  if (seemsToBeMP4) {
    const psshInfo = takePSSHOut(chunkData);
    if (psshInfo.length > 0) {
      protectionDataUpdate = representation._addProtectionData("cenc", psshInfo);
    }
  }

  if (segment.isInit) {
    const timescale = containerType === "webm" ? getTimeCodeScale(chunkData, 0) :
                                                 // assume ISOBMFF-compliance
                                                 getMDHDTimescale(chunkData);
    return { segmentType: "init",
             initializationData: chunkData,
             initializationDataSize: 0,
             initTimescale: timescale ?? undefined,
             protectionDataUpdate };
  }

  const chunkInfos = seemsToBeMP4 ? getISOBMFFTimingInfos(chunkData,
                                                          false,
                                                          segment,
                                                          initTimescale) :
                                    null; // TODO extract time info from webm
  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
  return { segmentType: "media",
           chunkData,
           chunkSize: chunkData.length,
           chunkInfos,
           chunkOffset,
           protectionDataUpdate: false,
           appendWindow };
}
