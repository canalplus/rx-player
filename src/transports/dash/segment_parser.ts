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
  merge as observableMerge,
  of as observableOf,
} from "rxjs";
import {
  getMDHDTimescale,
  getReferencesFromSidx,
  ISidxReference,
  takePSSHOut,
} from "../../parsers/containers/isobmff";
import {
  getSegmentsFromCues,
  getTimeCodeScale,
} from "../../parsers/containers/matroska";
import takeFirstSet from "../../utils/take_first_set";
import {
  IChunkTimingInfos,
  IContent,
  ISegmentParserArguments,
  ISegmentParserObservable,
  ISegmentParserResponse,
} from "../types";
import isWEBMEmbeddedTrack from "./is_webm_embedded_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import loadIndexes from "./load_indexes";

/**
 * Get segment informations from response.
 * @param {Object} content
 * @param {Object} response
 * @param {Object} init
 * @returns {Object}
 */
function parseSegmentInfos(content: IContent,
                           response: { data: ArrayBuffer|Uint8Array|null;
                                       isChunked : boolean; },
                           init?: IChunkTimingInfos
): { parserResponse : ISegmentParserResponse<Uint8Array |
                                             ArrayBuffer>;
     indexes?: ISidxReference[]; } {
  const { period, representation, segment } = content;
  const { data, isChunked } = response;
  if (data == null) {
    return {
      parserResponse: { chunkData: null,
        chunkInfos: null,
        chunkOffset: 0,
        segmentProtections: [],
        appendWindow: [period.start, period.end] },
    };
  }

  const chunkData = data instanceof Uint8Array ? data :
                                                 new Uint8Array(data);

  const { range, indexRange } = segment;
  const isWEBM = isWEBMEmbeddedTrack(representation);

  let nextSegments;
  let indexes;

  if (isWEBM) {
    nextSegments = getSegmentsFromCues(chunkData, 0);
  } else {
    const initialOffset = Array.isArray(indexRange) ? indexRange[0] :
                                                      range !== undefined ? range[0] :
                                                                            undefined;
    const referencesFromSidx = getReferencesFromSidx(chunkData, initialOffset);
    if (referencesFromSidx !== null) {
      const [indexReferences, segmentReferences] = referencesFromSidx;
      if (segmentReferences.length > 0) {
        nextSegments = segmentReferences;
      }
      indexes = indexReferences;
    }
  }

  if (!segment.isInit) {
    const initChunkInfos = isWEBM ? null : // TODO extract from webm
                                    getISOBMFFTimingInfos(chunkData,
                                                          isChunked,
                                                          segment,
                                                          init);
    const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    return { parserResponse: { chunkData,
                               chunkInfos: initChunkInfos,
                               chunkOffset,
                               segmentProtections: [],
                               appendWindow: [period.start, period.end] },
             indexes };
  }

  // it is an initialization segment
  if (nextSegments != null && nextSegments.length > 0) {
    representation.index._addSegments(nextSegments);
  }

  const timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
                             getMDHDTimescale(chunkData);

  const chunkInfos = timescale != null && timescale > 0 ? { time: 0,
                                                            duration: 0,
                                                            timescale } :
                                                          null;
  const appendWindow: [number|undefined, number|undefined] =
    [period.start, period.end];

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
  return { parserResponse: { chunkData,
                             chunkInfos,
                             chunkOffset:
                               takeFirstSet<number>(segment.timestampOffset, 0),
                             segmentProtections,
                             appendWindow },
           indexes };
}

export default function parser({ content,
                                 response,
                                 init,
                                 scheduleRequest } : ISegmentParserArguments<Uint8Array |
                                                                             ArrayBuffer |
                                                                             null >
) : ISegmentParserObservable< Uint8Array | ArrayBuffer > {
  const parsedSegmentsInfos = parseSegmentInfos(content, response, init);

  const { indexes, parserResponse } = parsedSegmentsInfos;
  if (indexes == null || indexes.length === 0) {
    return observableOf(parserResponse);
  }
  return observableMerge(loadIndexes(indexes, content, scheduleRequest),
                         observableOf(parserResponse));
}
