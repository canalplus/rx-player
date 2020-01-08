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
import log from "../../log";
import {
  getMDAT,
  getMDHDTimescale,
  getSegmentsFromSidx,
} from "../../parsers/containers/isobmff";
import {
  bytesToStr,
  strToBytes,
} from "../../utils/byte_parsing";
import stringFromUTF8 from "../../utils/string_from_utf8";
import takeFirstSet from "../../utils/take_first_set";
import isMP4EmbeddedTextTrack from "./is_mp4_embedded_text_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";

import {
  ISegmentParserArguments,
  ITextParserObservable,
} from "../types";

/**
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function parseISOBMFFEmbeddedTextTrack(
  { response,
    content,
    initTimescale } : ISegmentParserArguments< Uint8Array |
                                               ArrayBuffer |
                                               string >
) : ITextParserObservable {
  const { period, representation, segment } = content;
  const { isInit, indexRange } = segment;
  const { language } = content.adaptation;
  const { data, isChunked } = response;

  let chunkBytes : Uint8Array;
  if (typeof data === "string") {
    chunkBytes = strToBytes(data);
  } else {
    chunkBytes = data instanceof Uint8Array ? data :
                                              new Uint8Array(data);
  }

  const sidxSegments = getSegmentsFromSidx(chunkBytes,
                                           Array.isArray(indexRange) ? indexRange[0] :
                                                                       0);

  if (isInit) {
    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    if (sidxSegments !== null && sidxSegments.length > 0) {
      representation.index._addSegments(sidxSegments);
    }
    return observableOf({ type: "parsed-init-segment",
                          value: { initializationData: null,
                                   segmentProtections: [],
                                   initTimescale: mdhdTimescale > 0 ? mdhdTimescale :
                                                                       undefined } });
  } else { // not init
    const chunkInfos = getISOBMFFTimingInfos(chunkBytes,
                                             isChunked,
                                             segment,
                                             initTimescale);
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
    const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    return observableOf({ type: "parsed-segment",
                          value: { chunkData,
                                   chunkInfos,
                                   chunkOffset,
                                   appendWindow: [period.start, period.end] } });
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
    initTimescale } : ISegmentParserArguments< Uint8Array |
                                               ArrayBuffer |
                                               string |
                                               null >
) : ITextParserObservable {
  const { period, representation, segment } = content;
  const { timestampOffset = 0 } = segment;
  const { data, isChunked } = response;
  if (data == null) { // No data, just return empty infos
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
                                           initTimescale });
  } else {
    return parsePlainTextTrack({ response: { data, isChunked }, content });
  }
}
