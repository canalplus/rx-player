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
  filter,
  map,
  mergeMap,
} from "rxjs/operators";
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
import request from "../../utils/request/xhr";
import takeFirstSet from "../../utils/take_first_set";
import {
  IChunkTimingInfos,
  IContent,
  ILoaderDataLoadedValue,
  ISegmentParserArguments,
  ISegmentParserObservable,
  ISegmentParserResponse,
} from "../types";
import byteRange from "../utils/byte_range";
import isWEBMEmbeddedTrack from "./is_webm_embedded_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";

/**
 *
 * @param {String} url
 * @param {Object} range
 */
function requestResource(
  url : string,
  range? : [number, number]
) : Observable<ILoaderDataLoadedValue<ArrayBuffer>> {
  let headers = {};
  if (range !== undefined) {
    headers = { Range: byteRange(range) };
  }
  return request({ url,
                   responseType: "arraybuffer",
                   headers })
  .pipe(
    filter((e) => e.type === "data-loaded"),
    map((e) => e.value)
  );
}

/**
 *
 * @param {Object} content
 * @param {Object} response
 * @param {Object} init
 */
function parseSegmentInfos(content: IContent,
                           response: { data: ArrayBuffer|Uint8Array|null;
                                       isChunked : boolean; },
                           init?: IChunkTimingInfos
): { parserResponse : ISegmentParserResponse<Uint8Array |
                                             ArrayBuffer>;
     externalRessources?: ISidxReference[]; } {
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
  const externalRessources = [];

  if (isWEBM) {
    nextSegments = getSegmentsFromCues(chunkData, 0);
  } else {
    const initialOffset = Array.isArray(indexRange) ? indexRange[0] :
                                                      range !== undefined ? range[0] :
                                                                            undefined;
    const referencesFromSidx = getReferencesFromSidx(chunkData, initialOffset);
    if (referencesFromSidx !== null) {
      const segments = referencesFromSidx.filter((ref) => ref.referenceTo === "segment");
      if (segments.length > 0) {
        nextSegments = segments;
      }
      const externalReferences = referencesFromSidx.filter((ref) => ref.referenceTo === "index");
      externalRessources.push(...externalReferences);
    }
  }

  let parserResponse;
  if (!segment.isInit) {
    const chunkInfos = isWEBM ? null : // TODO extract from webm
                                getISOBMFFTimingInfos(chunkData,
                                                      isChunked,
                                                      segment,
                                                      init);
    const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    const appendWindow: [number|undefined, number|undefined] =
      [period.start, period.end];
    parserResponse = { chunkData,
                       chunkInfos,
                       chunkOffset,
                       segmentProtections: [],
                       appendWindow };
  } else { // it is an initialization segment
    if (nextSegments != null && nextSegments.length > 0) {
      representation.index._addSegments(nextSegments);
    }

    const timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
                               getMDHDTimescale(chunkData);

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
    const appendWindow: [number|undefined, number|undefined] =
      [period.start, period.end];
    parserResponse = { chunkData,
                       chunkInfos,
                       chunkOffset: takeFirstSet<number>(segment.timestampOffset,
                        0),
                       segmentProtections,
                       appendWindow };
  }

  return {
    parserResponse,
    externalRessources,
  };
}

export default function parser({ content,
                                 response,
                                 init,
                                 scheduleRequest } : ISegmentParserArguments<Uint8Array |
                                                                             ArrayBuffer |
                                                                             null >
) : ISegmentParserObservable< Uint8Array | ArrayBuffer > {
  const parsedSegmentsInfos = parseSegmentInfos(content, response, init);

  function loadExternalRessources(
    resp : { parserResponse : ISegmentParserResponse<Uint8Array |
                                                     ArrayBuffer>;
    externalRessources: ISidxReference[]; }
  ): Observable<ISegmentParserResponse<Uint8Array|ArrayBuffer>> {
    if (scheduleRequest == null) {
      throw new Error();
    }

    const range: [number, number] =
      [resp.externalRessources[0].range[0],
       resp.externalRessources[resp.externalRessources.length - 1].range[1]];

    const url = content.segment.mediaURL;
    if (url === null) {
      throw new Error();
    }
    const loadedRessource$ = scheduleRequest(() => {
      return requestResource(url, range).pipe(
        map((r) => {
          return {
            response: r,
            ranges: resp.externalRessources.map(({ range: _r }) => _r),
          };
        })
      );
    });

    return loadedRessource$.pipe(
      mergeMap((loadedRessource) => {
        const newSegments: ISidxReference[] = [];
        const newExternalRessources: ISidxReference[] = [];
        const {
          response: { responseData },
          ranges,
        } = loadedRessource;
        if (responseData !== undefined) {
          const data = new Uint8Array(responseData);
          let totalLen = 0;
          for (let i = 0; i < ranges.length; i++) {
            const length = ranges[i][1] - ranges[i][0] + 1;
            const element = data.subarray(totalLen, totalLen + length);
            const initialOffset = ranges[i][0];
            const references = getReferencesFromSidx(element, initialOffset);
            if (references !== null) {
              references.forEach((ref) => {
                if (ref.referenceTo === "segment") {
                  newSegments.push(ref);
                } else {
                  newExternalRessources.push(ref);
                }
              });
            }
            totalLen += length;
          }
        }

        if (newSegments.length > 0) {
          content.representation.index._addSegments(newSegments);
        }
        if (newExternalRessources.length > 0) {
          resp.externalRessources = newExternalRessources;
          return loadExternalRessources(resp);
        }
        return observableOf(resp.parserResponse);
      })
    );
  }

  const { externalRessources, parserResponse } = parsedSegmentsInfos;
  if (externalRessources == null ||
      externalRessources.length === 0) {
    return observableOf(parsedSegmentsInfos.parserResponse);
  }

  return loadExternalRessources({
    parserResponse,
    externalRessources,
  });
}
