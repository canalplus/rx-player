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
import request from "../../utils/request";
import stringFromUTF8 from "../../utils/string_from_utf8";
import byteRange from "../utils/byte_range";
import isMP4EmbeddedTrack from "./is_mp4_embedded_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";

import {
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
  ISegmentParserArguments,
  ITextParserObservable,
} from "../types";

/**
 * Perform requests for "text" segments
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function TextTrackLoader(
  { segment, representation } : ISegmentLoaderArguments
) : ISegmentLoaderObservable<ArrayBuffer|string|null> {
  const { mediaURL,
          range,
          indexRange } = segment;

  // ArrayBuffer when in mp4 to parse isobmff manually, text otherwise
  const responseType = isMP4EmbeddedTrack(representation) ? "arraybuffer" :
                                                            "text";

  // init segment without initialization media/range/indexRange:
  // we do nothing on the network
  if (mediaURL == null) {
    return observableOf({ type: "data-created",
                          value: { responseData: null } });
  }

  // fire a single time for init and index ranges
  if (range != null && indexRange != null) {
    return request({ url: mediaURL,
                     responseType,
                     headers: { Range: byteRange([ Math.min(range[0], indexRange[0]),
                                                   Math.max(range[1],
                                                            indexRange[1]) ]) },
                     sendProgressEvents: true });
  }
  return request<ArrayBuffer|string>({ url: mediaURL,
                                       responseType,
                                       headers: range ? { Range: byteRange(range) } :
                                                        null,
                                       sendProgressEvents: true });
}

function parseMP4EmbeddedTrack({ response,
                                 content,
                                 init } : ISegmentParserArguments< Uint8Array |
                                                                   ArrayBuffer |
                                                                   string>
) : ITextParserObservable {
  const { representation, segment } = content;
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
                                           indexRange ? indexRange[0] : 0);

  if (isInit) {
    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    const chunkInfos = mdhdTimescale > 0 ? { time: -1,
                                             duration: 0,
                                             timescale: mdhdTimescale } :
                                           null;
    if (sidxSegments) {
      representation.index._addSegments(sidxSegments);
    }
    return observableOf({ chunkData: null,
                          chunkInfos,
                          chunkOffset: segment.timestampOffset || 0 });
  } else { // not init
    const chunkInfos = getISOBMFFTimingInfos(chunkBytes,
                                             isChunked,
                                             segment,
                                             sidxSegments,
                                             init);
    let startTime : number | undefined;
    let endTime : number | undefined;
    let timescale : number = 1;
    if (chunkInfos == null) {
      if (isChunked) {
        log.warn("DASH: Unavailable time data for current text track.");
      } else {
        startTime = segment.time;
        endTime = segment.duration == null ? undefined :
                                             startTime + segment.duration;
        timescale = segment.timescale;
      }
    } else {
      startTime = chunkInfos.time;
      if (chunkInfos.duration != null) {
        endTime = startTime + chunkInfos.duration;
      } else if (!isChunked && segment.duration != null) {
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

    if (!type) {
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
    return observableOf({ chunkData,
                          chunkInfos,
                          chunkOffset: segment.timestampOffset || 0 });
  }
}

function parsePlainTextTrack({ response,
                               content } : ISegmentParserArguments< Uint8Array |
                                                                    ArrayBuffer |
                                                                    string>
) : ITextParserObservable {
  const { segment, representation, adaptation } = content;
  const { language } = adaptation;
  if (segment.isInit) {
    return observableOf({ chunkData: null,
                          chunkInfos: null,
                          chunkOffset: segment.timestampOffset || 0 });
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

  const duration = segment.duration == null ? undefined :
                                              segment.duration;
  let start : number | undefined;
  let end : number | undefined;
  let timescale : number = 1;
  if (!isChunked) {
    start = segment.time;
    end = duration == null ? undefined :
                             start + duration;
    timescale = segment.timescale;
  } else {
    log.warn("DASH: Unavailable time data for current text track.");
  }

  let type;

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

  if (!type) {
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
                        chunkOffset: segment.timestampOffset || 0 });
}

/**
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function TextTrackParser({ response,
                           content,
                           init } : ISegmentParserArguments< Uint8Array |
                                                             ArrayBuffer |
                                                             string |
                                                             null >
) : ITextParserObservable {
  const { segment, representation } = content;
  const { data, isChunked } = response;
  if (data == null) { // No data, just return empty infos
    return observableOf({ chunkData: null,
                          chunkInfos: null,
                          chunkOffset: segment.timestampOffset || 0 });
  }

  const isMP4 = isMP4EmbeddedTrack(representation);
  if (isMP4) {
    return parseMP4EmbeddedTrack({ response: { data, isChunked }, content, init });
  } else {
    return parsePlainTextTrack({ response: { data, isChunked }, content });
  }
}

export {
  TextTrackLoader as loader,
  TextTrackParser as parser,
};
