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
  Observable,
  of as observableOf,
} from "rxjs";
import {
  getMDHDTimescale,
  getReferencesFromSidx,
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
  IScheduleRequestResponse,
  ISegmentParserArguments,
  ISegmentParserResponseEvent,
  ITransportWarningEvent,
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
                           init?: IChunkTimingInfos,
                           scheduleRequest?: <U>(request : () => Observable<U>) =>
                            Observable<IScheduleRequestResponse<U> |
                                       ITransportWarningEvent>
): Observable<ISegmentParserResponseEvent<Uint8Array |
                                          ArrayBuffer> |
              ITransportWarningEvent> {
  const { period, representation, segment } = content;
  const { data, isChunked } = response;
  if (data == null) {
    return observableOf({ type: "parser-response" as const,
                          value: { chunkData: null,
                                   chunkInfos: null,
                                   chunkOffset: 0,
                                   segmentProtections: [],
                                   appendWindow: [period.start, period.end] } });
  }

  const chunkData = data instanceof Uint8Array ? data :
                                                 new Uint8Array(data);

  const { range } = segment;
  const isWEBM = isWEBMEmbeddedTrack(representation);

  let nextSegments;
  let indexes;

  if (isWEBM) {
    nextSegments = getSegmentsFromCues(chunkData, 0);
  } else {
    const indexOffset = Array.isArray(range) ? range[0] :
                                               0;
    const referencesFromSidx = getReferencesFromSidx(chunkData, indexOffset);
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
    const initChunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    const aWindow: [number | undefined, number | undefined] =
      [period.start, period.end];
    const parserInitResponse =
      observableOf({ type: "parser-response" as const,
                     value: { chunkData,
                              chunkInfos: initChunkInfos,
                              chunkOffset: initChunkOffset,
                              segmentProtections: [],
                              appendWindow: aWindow } });

    if (indexes !== undefined && indexes.length > 0) {
      if (scheduleRequest == null) {
        throw new Error("Can't schedule request for loading indexes.");
      }
      return observableMerge(loadIndexes(indexes, content, scheduleRequest),
                             parserInitResponse);
    }
    return parserInitResponse;
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

  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
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
  const parserResponse =
    observableOf({ type: "parser-response" as const,
                   value: { chunkData,
                            chunkInfos,
                            chunkOffset,
                            segmentProtections,
                            appendWindow } });
  if (indexes !== undefined && indexes.length > 0) {
    if (scheduleRequest == null) {
      throw new Error("Can't schedule request for loading indexes.");
    }
    return observableMerge(loadIndexes(indexes, content, scheduleRequest),
                           parserResponse);
  }
  return parserResponse;
}

export default function parser({ content,
                                 response,
                                 init,
                                 scheduleRequest } : ISegmentParserArguments<Uint8Array |
                                                                             ArrayBuffer |
                                                                             null >
) : Observable<ISegmentParserResponseEvent<Uint8Array|ArrayBuffer> |
               ITransportWarningEvent> {
  return parseSegmentInfos(content, response, init, scheduleRequest);

}
