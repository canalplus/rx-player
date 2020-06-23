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
  IAudioVideoParserObservable,
  ISegmentParserArguments,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isWEBMEmbeddedTrack from "../utils/is_webm_embedded_track";
import extractCompleteInitChunk from "./extract_complete_init_chunk";

export default function parser(
  { content,
    response,
    initTimescale } : ISegmentParserArguments< Uint8Array |
                                               ArrayBuffer |
                                               null >
) : IAudioVideoParserObservable {
  const { period, representation, segment } = content;
  const { data, isChunked } = response;
  const appendWindow : [number, number | undefined] = [ period.start, period.end ];

  if (data === null) {
    if (segment.isInit) {
      const _segmentProtections = representation.getProtectionsInitializationData();
      return observableOf({ type: "parsed-init-segment" as const,
                            value: { initializationData: null,
                                     segmentProtections: _segmentProtections,
                                     initTimescale: undefined } });
    }
    return observableOf({ type: "parsed-segment" as const,
                          value: { chunkData: null,
                                   chunkInfos: null,
                                   chunkOffset: 0,
                                   appendWindow } });
  }

  const chunkData = data instanceof Uint8Array ? data :
                                                 new Uint8Array(data);
  const isWEBM = isWEBMEmbeddedTrack(representation);

  if (!segment.isInit) {
    const chunkInfos = isWEBM ? null : // TODO extract time info from webm
                                getISOBMFFTimingInfos(chunkData,
                                                      isChunked,
                                                      segment,
                                                      initTimescale);
    const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    return observableOf({ type: "parsed-segment",
                          value: { chunkData,
                                   chunkInfos,
                                   chunkOffset,
                                   appendWindow } });
  }
  // we're handling an initialization segment
  const { indexRange, privateInfos } = segment;
  const nextSegments = isWEBM ? getSegmentsFromCues(chunkData, 0) :
                                getSegmentsFromSidx(chunkData,
                                                    Array.isArray(indexRange) ?
                                                      indexRange[0] :
                                                      0);

  if ((nextSegments === null || nextSegments.length === 0) &&
      privateInfos?.mightBeStaticContent === true
  ) {
    // There are very high chances that it is a static content, because :
    // - The segment indicates that content might be static
    // - We've already loaded the init segment and found no sidx segments in it.
    // We just add a huge segment, without indicating an URL (which means it will take
    // the default one)
    representation.index._addSegments([{ time: 0,
                                         duration: Number.MAX_VALUE,
                                         timescale: 1 }]);
  }

  if (nextSegments !== null && nextSegments.length > 0) {
    representation.index._addSegments(nextSegments);
  }

  if (!isWEBM) { // TODO extract webm protection information
    const psshInfo = takePSSHOut(chunkData);
    for (let i = 0; i < psshInfo.length; i++) {
      const { systemID, data: psshData } = psshInfo[i];
      representation._addProtectionData("cenc", systemID, psshData);
    }
  }

  const completeInitChunk = privateInfos?.shouldGuessInitRange === true ?
    extractCompleteInitChunk(chunkData) : chunkData;

  let timescale = null;
  if (completeInitChunk !== null) {
    timescale = isWEBM ? getTimeCodeScale(completeInitChunk, 0) :
                         getMDHDTimescale(completeInitChunk);
  }

  const parsedTimescale = timescale !== null && timescale > 0 ? timescale :
                                                                undefined;

  const segmentProtections = representation.getProtectionsInitializationData();
  return observableOf({ type: "parsed-init-segment",
                        value: { initializationData: completeInitChunk,
                                 segmentProtections,
                                 initTimescale: parsedTimescale } });
}
