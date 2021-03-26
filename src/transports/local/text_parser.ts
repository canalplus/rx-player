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
import { getMDHDTimescale } from "../../parsers/containers/isobmff";
import {
  strToUtf8,
  utf8ToStr,
} from "../../utils/string_parsing";
import takeFirstSet from "../../utils/take_first_set";
import {
  ISegmentParserArguments,
  ITextParserObservable,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isMP4EmbeddedTextTrack from "../utils/is_mp4_embedded_text_track";
import {
  getISOBMFFEmbeddedTextTrackData,
  getPlainTextTrackData,
} from "../utils/parse_text_track";

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
                                               string >
) : ITextParserObservable {
  const { period, segment } = content;
  const { data, isChunked } = response;

  const chunkBytes = typeof data === "string" ? strToUtf8(data) :
                     data instanceof Uint8Array ? data :
                                                  new Uint8Array(data);
  if (segment.isInit) {
    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    return observableOf({ type: "parsed-init-segment",
                          value: { initializationData: null,
                                   initTimescale: mdhdTimescale,
                                   protectionDataUpdate: false } });
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
  return observableOf({ type: "parsed-segment",
                        value: { chunkData,
                                 chunkInfos,
                                 chunkOffset,
                                 appendWindow: [period.start, period.end] } });
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
  if (segment.isInit) {
    return observableOf({ type: "parsed-init-segment",
                          value: { initializationData: null,
                                   initTimescale: undefined,
                                   protectionDataUpdate: false } });
  }

  const { data, isChunked } = response;
  let textTrackData : string;
  if (typeof data !== "string") {
    const bytesData = data instanceof Uint8Array ? data :
                                                   new Uint8Array(data);
    textTrackData = utf8ToStr(bytesData);
  } else {
    textTrackData = data;
  }
  const chunkData = getPlainTextTrackData(content, textTrackData, isChunked);
  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
  return observableOf({ type: "parsed-segment",
                        value: { chunkData,
                                 chunkInfos: null,
                                 chunkOffset,
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
  const { data, isChunked } = response;
  if (data === null) { // No data, just return empty infos
    if (segment.isInit) {
      return observableOf({ type: "parsed-init-segment",
                            value: { initializationData: null,
                                     protectionDataUpdate: false,
                                     initTimescale: undefined } });
    }
    const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    return observableOf({ type: "parsed-segment",
                          value: { chunkData: null,
                                   chunkInfos: null,
                                   chunkOffset,
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
