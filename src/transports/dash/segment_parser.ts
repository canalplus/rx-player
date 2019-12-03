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
  mergeMap,
} from "rxjs/operators";
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
  ISegmentParserArguments,
  ISegmentParserResponseEvent,
  ITransportRetryEvent,
} from "../types";
import isWEBMEmbeddedTrack from "./is_webm_embedded_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import loadIndexes from "./load_indexes";

export default function parser({ content,
                                 response,
                                 init,
                                 scheduleRequest } : ISegmentParserArguments<Uint8Array |
                                                                             ArrayBuffer |
                                                                             null >
) : Observable<ISegmentParserResponseEvent<Uint8Array|ArrayBuffer> |
               ITransportRetryEvent> {
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
  let indexReferences;

  if (isWEBM) {
    nextSegments = getSegmentsFromCues(chunkData, 0);
  } else {
    const indexOffset = Array.isArray(range) ? range[0] :
                                               0;
    const referencesFromSidx = getReferencesFromSidx(chunkData, indexOffset);
    if (referencesFromSidx !== null) {
      if (referencesFromSidx[1].length > 0) {
        nextSegments = referencesFromSidx[1];
      }
      indexReferences = referencesFromSidx[0];
    }
  }

  if (!segment.isInit) {
    const chunkInfos = isWEBM ? null : // TODO extract from webm
                                getISOBMFFTimingInfos(chunkData,
                                                      isChunked,
                                                      segment,
                                                      init);
    const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    const appendWindow: [number | undefined, number | undefined] =
      [period.start, period.end];
    const parserResponse =
      observableOf({ type: "parser-response" as const,
                     value: { chunkData,
                              chunkInfos,
                              chunkOffset,
                              segmentProtections: [],
                              appendWindow } });

    if (indexReferences !== undefined && indexReferences.length > 0) {
      if (scheduleRequest == null) {
        throw new Error("Can't schedule request for loading indexes.");
      }
      return loadIndexes(indexReferences, content, scheduleRequest).pipe(
        mergeMap((evt) => {
          if (evt.type === "retry") {
            return observableOf(evt);
          }
          return parserResponse;
        })
      );
    }
    return parserResponse;
  }

  // it is an initialization segment
  if (nextSegments != null && nextSegments.length > 0) {
    representation.index._addSegments(nextSegments);
  }

  const timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
                             getMDHDTimescale(chunkData);

  const initChunkInfos = timescale != null && timescale > 0 ? { time: 0,
                                                            duration: 0,
                                                            timescale } :
                                                          null;
  const initAppendWindow: [number|undefined, number|undefined] =
    [period.start, period.end];

  const initChunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
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
  const initParserResponse =
    observableOf({ type: "parser-response" as const,
                   value: { chunkData,
                            chunkInfos: initChunkInfos,
                            chunkOffset: initChunkOffset,
                            segmentProtections,
                            appendWindow: initAppendWindow } });
  if (indexReferences !== undefined && indexReferences.length > 0) {
    if (scheduleRequest == null) {
      throw new Error("Can't schedule request for loading indexes.");
    }

    return loadIndexes(indexReferences, content, scheduleRequest).pipe(
      mergeMap((evt) => {
        if (evt.type === "retry") {
          return observableOf(evt);
        }
        return initParserResponse;
      })
    );
  }
  return initParserResponse;
}
