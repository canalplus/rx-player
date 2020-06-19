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
import { mergeMap } from "rxjs/operators";
import {
  getMDHDTimescale,
  getReferencesFromSidx,
} from "../../parsers/containers/isobmff";
import {
  bytesToStr,
  strToBytes,
} from "../../utils/byte_parsing";
import takeFirstSet from "../../utils/take_first_set";
import {
  IScheduleRequestResponse,
  ISegmentParserArguments,
  ITextParserObservable,
  ITextParserSegmentResponse,
  ITransportWarningEvent,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isMP4EmbeddedTextTrack from "../utils/is_mp4_embedded_text_track";
import {
  getISOBMFFEmbeddedTextTrackData,
  getPlainTextTrackData,
} from "../utils/parse_text_track";
import loadIndexes from "./load_indexes";

/**
 * Parse TextTrack data when it is embedded in an ISOBMFF file.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function parseISOBMFFEmbeddedTextTrack(
  { response,
    content,
    initTimescale } : ISegmentParserArguments< Uint8Array |
                                               ArrayBuffer |
                                               string >,
  scheduleRequest?: <U>(request : () => Observable<U>) =>
    Observable<IScheduleRequestResponse<U> |
               ITransportWarningEvent>
) : ITextParserObservable {
  const { period, representation, segment } = content;
  const { isInit, range } = segment;
  const { data, isChunked } = response;

  const chunkBytes = typeof data === "string" ? strToBytes(data) :
                     data instanceof Uint8Array ? data :
                                                  new Uint8Array(data);
  const indexOffset = Array.isArray(range) ? range[0] : 0;
  const sidxReferences =
    getReferencesFromSidx(chunkBytes, indexOffset);
  const nextSegments = (sidxReferences !== null) ? sidxReferences[1] : null;
  const indexReferences = (sidxReferences !== null) ? sidxReferences[0] : null;

  if (isInit) {
    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    if (nextSegments !== null && nextSegments.length > 0) {
      representation.index._addSegments(nextSegments);
    }
    const parsedTrackInitInfos =
      observableOf({ type: "parsed-init-segment" as const,
                     value: { initializationData: null,
                              segmentProtections: [],
                              initTimescale: mdhdTimescale > 0 ? mdhdTimescale :
                                                                 undefined } });

    if (indexReferences !== null && indexReferences.length > 0) {
      if (scheduleRequest == null) {
        throw new Error("Can't schedule request for loading indexes.");
      }
      return loadIndexes(indexReferences, content, scheduleRequest).pipe(
        mergeMap((evt) => {
          if (evt.type === "retry") {
            return observableOf(evt);
          }
          return parsedTrackInitInfos;
        })
      );
    }
    return parsedTrackInitInfos;
  }
  const chunkInfos = getISOBMFFTimingInfos(chunkBytes,
                                           isChunked,
                                           segment,
                                           initTimescale);
  const chunkData = getISOBMFFEmbeddedTextTrackData(content,
                                                    chunkBytes,
                                                    chunkInfos,
                                                    isChunked);
  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
  const parsedTrackInfos: Observable<ITextParserSegmentResponse> =
    observableOf({ type: "parsed-segment" as const,
                   value: { chunkData,
                            chunkInfos,
                            chunkOffset,
                            appendWindow: [period.start, period.end] } });

  if (indexReferences !== null && indexReferences.length > 0) {
    if (scheduleRequest == null) {
      throw new Error("Can't schedule request for loading indexes.");
    }
    return loadIndexes(indexReferences, content, scheduleRequest).pipe(
      mergeMap((evt) => {
        if (evt.type === "retry") {
          return observableOf(evt);
        }
        return parsedTrackInfos;
      })
    );
  }
  return parsedTrackInfos;
}

/**
 * Parse TextTrack data in plain text form.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function parsePlainTextTrack(
  { response,
    content } : ISegmentParserArguments< Uint8Array |
                                         ArrayBuffer |
                                         string >
) : ITextParserObservable {
  const { period, segment } = content;
  const { timestampOffset = 0 } = segment;
  if (segment.isInit) {
    return observableOf({ type: "parsed-init-segment",
                          value: { initializationData: null,
                                   segmentProtections: [],
                                   initTimescale: undefined } });
  }

  const { data, isChunked } = response;
  let textTrackData : string;
  if (typeof data !== "string") {
    const bytesData = data instanceof Uint8Array ? data :
                                                   new Uint8Array(data);
    textTrackData = bytesToStr(bytesData);
  } else {
    textTrackData = data;
  }
  const chunkData = getPlainTextTrackData(content, textTrackData, isChunked);
  return observableOf({ type: "parsed-segment",
                        value: { chunkData,
                                 chunkInfos: null,
                                 chunkOffset: timestampOffset,
                                 appendWindow: [period.start, period.end] } });
}

/**
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
export default function textTrackParser(
  { response,
    content,
    initTimescale,
    scheduleRequest } : ISegmentParserArguments< Uint8Array |
                                               ArrayBuffer |
                                               string |
                                               null >
) : ITextParserObservable {
  const { period, representation, segment } = content;
  const { timestampOffset = 0 } = segment;
  const { data, isChunked } = response;
  if (data === null) { // No data, just return empty infos
    if (segment.isInit) {
      return observableOf({ type: "parsed-init-segment",
                            value: { initializationData: null,
                                     segmentProtections: [],
                                     initTimescale: undefined } });
    }
    return observableOf({ type: "parsed-segment",
                          value: { chunkData: null,
                                   chunkInfos: null,
                                   chunkOffset: timestampOffset,
                                   appendWindow: [period.start, period.end] } });
  }

  const isMP4 = isMP4EmbeddedTextTrack(representation);
  if (isMP4) {
    return parseISOBMFFEmbeddedTextTrack({ response: { data, isChunked },
                                           content,
                                           initTimescale },
                                           scheduleRequest);
  } else {
    return parsePlainTextTrack({ response: { data, isChunked }, content });
  }
}
