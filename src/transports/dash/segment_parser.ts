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
import { mergeMap } from "rxjs/operators";
import {
  getMDHDTimescale,
  getReferencesFromSidx,
  ISidxReference,
  takePSSHOut,
} from "../../parsers/containers/isobmff";
import {
  getSegmentsFromCues,
  getTimeCodeScale,
  ICuesSegment,
} from "../../parsers/containers/matroska";
import takeFirstSet from "../../utils/take_first_set";
import {
  IAudioVideoParserObservable,
  ISegmentParserArguments,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isWEBMEmbeddedTrack from "../utils/is_webm_embedded_track";
import loadIndexes from "./load_indexes";

export default function parser(
  { content,
    response,
    initTimescale,
    scheduleRequest } : ISegmentParserArguments< Uint8Array |
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
  const { range } = segment;
  const isWEBM = isWEBMEmbeddedTrack(representation);

  let nextSegments: null|ICuesSegment[] = [];
  let indexReferences: ISidxReference[] = [];

  if (isWEBM) {
    nextSegments = getSegmentsFromCues(chunkData, 0);
  } else {
    const indexOffset = Array.isArray(range) ? range[0] : 0;
    const referencesFromSidx = getReferencesFromSidx(chunkData, indexOffset);
    if (referencesFromSidx !== null) {
      if (referencesFromSidx[1].length > 0) {
        nextSegments = referencesFromSidx[1];
      }
      indexReferences = referencesFromSidx[0];
    }
  }

  if (nextSegments !== null && nextSegments.length > 0) {
    representation.index._addSegments(nextSegments);
  }

  if (!segment.isInit) {
    const chunkInfos = isWEBM ? null : // TODO extract time info from webm
                                getISOBMFFTimingInfos(chunkData,
                                                      isChunked,
                                                      segment,
                                                      initTimescale);
    const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    const parserResponse = observableOf({ type: "parsed-segment" as const,
                                          value: { chunkData,
                                                   chunkInfos,
                                                   chunkOffset,
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

  // we're handling an initialization segment
  const timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
                             getMDHDTimescale(chunkData);
  const parsedTimescale = timescale !== null && timescale > 0 ? timescale :
                                                                undefined;
  if (!isWEBM) { // TODO extract webm protection information
    const psshInfo = takePSSHOut(chunkData);
    for (let i = 0; i < psshInfo.length; i++) {
      const { systemID, data: psshData } = psshInfo[i];
      representation._addProtectionData("cenc", systemID, psshData);
    }
  }

  const segmentProtections = representation.getProtectionsInitializationData();
  const initParserResponse = observableOf({ type: "parsed-init-segment" as const,
                                            value: { initializationData: chunkData,
                                                     segmentProtections,
                                                     initTimescale: parsedTimescale } });

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
