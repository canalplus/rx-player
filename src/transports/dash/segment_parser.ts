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
import {
  getMDHDTimescale,
  getSegmentsFromSidx,
  takePSSHOut,
} from "../../parsers/containers/isobmff";
import {
  getSegmentsFromCues,
  getTimeCodeScale,
} from "../../parsers/containers/matroska";
import takeFirstSet from "../../utils/take_first_set";
import {
  ISegmentParserArguments,
  ISegmentParserObservable,
} from "../types";
import extractCompleteInitChunk from "./extract_complete_init_chunk";
import isWEBMEmbeddedTrack from "./is_webm_embedded_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";

export default function parser({ content,
                                 response,
                                 init } : ISegmentParserArguments< Uint8Array |
                                                                   ArrayBuffer |
                                                                   null >
) : ISegmentParserObservable< Uint8Array | ArrayBuffer > {
  const { period, representation, segment } = content;
  const { data, isChunked } = response;
  if (data == null) {
    return observableOf({ chunkData: null,
                          chunkInfos: null,
                          chunkOffset: 0,
                          segmentProtections: [],
                          appendWindow: [period.start, period.end] });
  }

  const chunkData = data instanceof Uint8Array ? data :
                                                 new Uint8Array(data);

  const indexRange = segment.indexRange;
  const isWEBM = isWEBMEmbeddedTrack(representation);

  const nextSegments = isWEBM ?
    getSegmentsFromCues(chunkData, 0) :
    getSegmentsFromSidx(chunkData, Array.isArray(indexRange) ? indexRange[0] :
                                                               0);

  if (!segment.isInit) {
    const chunkInfos = isWEBM ? null : // TODO extract from webm
                                getISOBMFFTimingInfos(chunkData,
                                                      isChunked,
                                                      segment,
                                                      init);
    return observableOf({ chunkData,
                          chunkInfos,
                          chunkOffset: takeFirstSet<number>(segment.timestampOffset,
                                                            0),
                          segmentProtections: [],
                          appendWindow: [period.start, period.end] });
  } else { // it is an initialization segment
    const { privateInfos } = segment;
    const shouldExtractCompleteInitChunk = privateInfos !== undefined &&
                                           privateInfos.hypotheticalInitRange === true;
    const completeInitChunk = shouldExtractCompleteInitChunk ?
      extractCompleteInitChunk(chunkData) : chunkData;

    if (completeInitChunk === -1) {
      throw new Error("Can't extract complete init chunk from loaded data.");
    }

    if (nextSegments !== null && nextSegments.length > 0) {
      representation.index._addSegments(nextSegments);
    }

    const timescale = isWEBM ? getTimeCodeScale(completeInitChunk, 0) :
                               getMDHDTimescale(completeInitChunk);

    const chunkInfos = timescale != null && timescale > 0 ? { time: 0,
                                                              duration: 0,
                                                              timescale } :
                                                            null;
    if (!isWEBM) {
      const psshInfo = takePSSHOut(chunkData);
      if (psshInfo.length > 0) {
        for (let i = 0; i < psshInfo.length; i++) {
          const { systemID, data: psshData } = psshInfo[i];
          representation._addProtectionData("cenc", systemID, psshData);
        }
      }
    }

    const segmentProtections = representation.getProtectionsInitializationData();
    return observableOf({ chunkData: completeInitChunk,
                          chunkInfos,
                          chunkOffset: takeFirstSet<number>(segment.timestampOffset,
                                                            0),
                          segmentProtections,
                          appendWindow: [period.start, period.end] });
  }
}
