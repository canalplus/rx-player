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
  combineLatest as observableCombineLatest,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  map,
  mergeMap,
} from "rxjs/operators";
import log from "../../log";
import {
  getMDAT,
  getMDHDTimescale,
  getReferencesFromSidx,
  ISidxReference,
} from "../../parsers/containers/isobmff";
import {
  bytesToStr,
  strToBytes,
} from "../../utils/byte_parsing";
import request from "../../utils/request/xhr";
import stringFromUTF8 from "../../utils/string_from_utf8";
import isMP4EmbeddedTextTrack from "./is_mp4_embedded_text_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";

import {
  ILoaderDataLoadedValue,
  ISegmentParserArguments,
  ISegmentParserResponse,
  ITextParserObservable,
  ITextParserResponse,
  ITextTrackSegmentData,
} from "../types";
import byteRange from "../utils/byte_range";

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
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function parseMP4EmbeddedTrack({ response,
                                 content,
                                 init } : ISegmentParserArguments< Uint8Array |
                                                                   ArrayBuffer |
                                                                   string>
) : { parsedTrackInfos: ITextParserResponse; externalRessources: any[] } {
  const { period, representation, segment } = content;
  const { isInit, indexRange, timestampOffset = 0, range } = segment;
  const { language } = content.adaptation;
  const { data, isChunked } = response;

  let chunkBytes : Uint8Array;
  if (typeof data === "string") {
    chunkBytes = strToBytes(data);
  } else {
    chunkBytes = data instanceof Uint8Array ? data :
                                              new Uint8Array(data);
  }
  const externalRessources: ISidxReference[] = [];
  const initialOffset = Array.isArray(indexRange) ? indexRange[0] :
                                                    (range !== undefined) ? range[0] :
                                                                            undefined;
  const sidxReferences = getReferencesFromSidx(chunkBytes, initialOffset);

  const sidxSegments = (sidxReferences !== null && sidxReferences.length > 0) ?
    sidxReferences.filter((s) => s.referenceTo === "segment") : undefined;

  if (sidxReferences !== null && sidxReferences.length > 0) {
    sidxReferences.forEach((s) => {
      if (s.referenceTo === "index") {
        externalRessources.push(s);
      }
    });
  }

  if (isInit) {
    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    const chunkInfos = mdhdTimescale > 0 ? { time: 0,
                                             duration: 0,
                                             timescale: mdhdTimescale } :
                                           null;
    if (Array.isArray(sidxSegments) && sidxSegments.length > 0) {
      representation.index._addSegments(sidxSegments);
    }
    const appendWindow: [number|undefined, number|undefined] =
      [period.start, period.end];
    const parsedTrackInfos = { chunkData: null,
                               chunkInfos,
                               chunkOffset: timestampOffset,
                               segmentProtections: [],
                               appendWindow };
    return { parsedTrackInfos, externalRessources };
  } else { // not init
    const chunkInfos = getISOBMFFTimingInfos(chunkBytes, isChunked, segment, init);
    let startTime : number | undefined;
    let endTime : number | undefined;
    let timescale : number = 1;
    if (chunkInfos == null) {
      if (isChunked) {
        log.warn("DASH: Unavailable time data for current text track.");
      } else {
        startTime = segment.time;
        endTime = startTime + segment.duration;
        timescale = segment.timescale;
      }
    } else {
      startTime = chunkInfos.time;
      if (chunkInfos.duration != null) {
        endTime = startTime + chunkInfos.duration;
      } else if (!isChunked) {
        endTime = startTime + segment.duration;
      }
      timescale = chunkInfos.timescale;
    }

    const  codec = representation.codec == null ? "" :
      representation.codec;
    let type : string|undefined;

    switch (codec.toLowerCase()) {
      case "stpp": // stpp === TTML in MP4
      case "stpp.ttml.im1t":
        type = "ttml";
        break;
      case "wvtt": // wvtt === WebVTT in MP4
        type = "vtt";
    }

    if (type === undefined) {
      throw new Error("The codec used for the subtitles " +
                      `"${codec}" is not managed yet.`);
    }

    const textData = stringFromUTF8(getMDAT(chunkBytes));
    const chunkData = { data: textData,
                        type,
                        language,
                        start: startTime,
                        end: endTime,
                        timescale } ;
    const appendWindow: [number|undefined, number|undefined] =
      [period.start, period.end];
    const parsedTrackInfos = { chunkData,
                               chunkInfos,
                               chunkOffset: timestampOffset,
                               segmentProtections: [],
                               appendWindow };
    return { parsedTrackInfos, externalRessources };
  }
}

function parsePlainTextTrack({ response,
                               content } : ISegmentParserArguments< Uint8Array |
                                                                    ArrayBuffer |
                                                                    string>
) : ITextParserObservable {
  const { adaptation, period, representation, segment } = content;
  const { language } = adaptation;
  const { timestampOffset = 0 } = segment;
  if (segment.isInit) {
    return observableOf({ chunkData: null,
                          chunkInfos: null,
                          chunkOffset: timestampOffset,
                          segmentProtections: [],
                          appendWindow: [period.start, period.end] });
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

  let start : number | undefined;
  let end : number | undefined;
  let timescale : number = 1;
  if (!isChunked) {
    start = segment.time;
    end = start + segment.duration;
    timescale = segment.timescale;
  } else {
    log.warn("DASH: Unavailable time data for current text track.");
  }

  let type : string | undefined;
  const { mimeType = "" } = representation;
  switch (representation.mimeType) {
    case "application/ttml+xml":
      type = "ttml";
      break;
    case "application/x-sami":
    case "application/smil":
      type = "sami";
      break;
    case "text/vtt":
      type = "vtt";
  }

  if (type === undefined) {
    const { codec = "" } = representation;
    const codeLC = codec.toLowerCase();
    if (codeLC === "srt") {
      type = "srt";
    } else {
      throw new Error(
        `could not find a text-track parser for the type ${mimeType}`);
    }
  }

  const chunkData = { data: textTrackData,
                      type,
                      language,
                      start,
                      end,
                      timescale };
  return observableOf({ chunkData,
                        chunkInfos: null,
                        chunkOffset: timestampOffset,
                        segmentProtections: [],
                        appendWindow: [period.start, period.end] });
}

/**
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
export default function textTrackParser({ response,
                                          content,
                                          init,
                                          scheduleRequest } :
                                            ISegmentParserArguments< Uint8Array |
                                                                     ArrayBuffer |
                                                                     string |
                                                                     null >
) : ITextParserObservable {
  const { period, representation, segment } = content;
  const { timestampOffset = 0 } = segment;
  const { data, isChunked } = response;
  if (data == null) { // No data, just return empty infos
    return observableOf({ chunkData: null,
                          chunkInfos: null,
                          chunkOffset: timestampOffset,
                          segmentProtections: [],
                          appendWindow: [period.start, period.end] });
  }

  const isMP4 = isMP4EmbeddedTextTrack(representation);
  if (isMP4) {
    const parserResponse =
      parseMP4EmbeddedTrack({ response: { data, isChunked }, content, init });

    function loadExternalRessources(
      resp : { parsedTrackInfos : ISegmentParserResponse<ITextTrackSegmentData>;
      externalRessources: ISidxReference[]; }
    ): Observable<ISegmentParserResponse<ITextTrackSegmentData>> {
      if (scheduleRequest == null) {
        throw new Error();
      }
      const loadedRessources$ = resp.externalRessources.map((ressource) => {
        const range = ressource.range;
        const url = content.segment.mediaURL;
        if (url == null) {
          throw new Error();
        }
        return scheduleRequest(() => {
          return requestResource(url, range).pipe(
            map((r) => {
              return {
                response: r,
                requestRange: range,
              };
            })
          );
        });
      });

      return observableCombineLatest(loadedRessources$).pipe(
        mergeMap((loadedRessources) => {
          const { newSegments, newExternalRessources } = loadedRessources
            .reduce((acc, loadedRessource) => {
              const {
                response: { responseData },
                requestRange,
              } = loadedRessource;
              if (responseData !== undefined) {
                const _data = new Uint8Array(responseData);
                const initialOffset = requestRange[0];
                const references = getReferencesFromSidx(_data, initialOffset);
                if (references !== null) {
                  references.forEach((ref) => {
                    if (ref.referenceTo === "segment") {
                      acc.newSegments.push(ref);
                    } else {
                      acc.newExternalRessources.push(ref);
                    }
                    return acc;
                  });
                }
              }
              return acc;
            }, { newSegments: [] as ISidxReference[],
                 newExternalRessources: [] as ISidxReference[],
            });

          if (newSegments.length > 0) {
            content.representation.index._addSegments(newSegments);
          }
          if (newExternalRessources.length > 0) {
            resp.externalRessources = newExternalRessources;
            return loadExternalRessources(resp);
          }
          return observableOf(resp.parsedTrackInfos);
        })
      );
    }

    const { externalRessources, parsedTrackInfos } = parserResponse;

    if (externalRessources == null ||
      externalRessources.length === 0) {
      return observableOf(parserResponse.parsedTrackInfos);
    }

    return loadExternalRessources({
      parsedTrackInfos,
      externalRessources,
    });
    // TOUT UN PROGRAMME
  } else {
    return parsePlainTextTrack({ response: { data, isChunked }, content });
  }
}
