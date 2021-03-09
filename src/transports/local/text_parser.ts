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

import { getMDHDTimescale } from "../../parsers/containers/isobmff";
import assert from "../../utils/assert";
import {
  strToUtf8,
  utf8ToStr,
} from "../../utils/string_parsing";
import takeFirstSet from "../../utils/take_first_set";
import {
  ILoadedTextSegmentFormat,
  ISegmentContext,
  ISegmentParserParsedInitSegment,
  ISegmentParserParsedSegment,
  ITextTrackSegmentData,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isMP4EmbeddedTextTrack from "../utils/is_mp4_embedded_text_track";
import {
  getISOBMFFEmbeddedTextTrackData,
  getPlainTextTrackData,
} from "../utils/parse_text_track";

/**
 * Parse TextTrack data when it is embedded in an ISOBMFF file.
 * @param {string|Uint8Array|ArrayBuffer} data
 * @param {boolean} isChunked
 * @param {Object} content
 * @param {number | undefined} initTimescale
 * @returns {Object}
 */
function parseISOBMFFEmbeddedTextTrack(
  data : string | Uint8Array | ArrayBuffer,
  isChunked : boolean,
  content : ISegmentContext,
  initTimescale : number | undefined
) : ISegmentParserParsedInitSegment<null> |
    ISegmentParserParsedSegment<ITextTrackSegmentData | null>
{
  const { period, segment } = content;
  const chunkBytes = typeof data === "string" ? strToUtf8(data) :
                     data instanceof Uint8Array ? data :
                                                  new Uint8Array(data);
  if (segment.isInit) {
    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    return { segmentType: "init",
             initializationData: null,
             initTimescale: mdhdTimescale,
             protectionDataUpdate: false };
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
  return { segmentType: "media",
           chunkData,
           chunkInfos,
           chunkOffset,
           appendWindow: [period.start, period.end] };
}

/**
 * Parse TextTrack data in plain text form.
 * @param {string|Uint8Array|ArrayBuffer} data
 * @param {boolean} isChunked
 * @param {Object} content
 * @returns {Object}
 */
function parsePlainTextTrack(
  data : string | Uint8Array | ArrayBuffer,
  isChunked : boolean,
  content : ISegmentContext
) : ISegmentParserParsedInitSegment<null> |
    ISegmentParserParsedSegment<ITextTrackSegmentData | null>
{
  const { period, segment } = content;
  if (segment.isInit) {
    return { segmentType: "init",
             initializationData: null,
             initTimescale: undefined,
             protectionDataUpdate: false };
  }

  let textTrackData : string;
  if (typeof data !== "string") {
    // Should already have been taken care of
    // TODO better use TypeScript here?
    assert(data !== null);

    const bytesData = data instanceof Uint8Array ? data :
                                                   new Uint8Array(data);
    textTrackData = utf8ToStr(bytesData);
  } else {
    textTrackData = data;
  }
  const chunkData = getPlainTextTrackData(content, textTrackData, isChunked);
  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
  return { segmentType: "media",
           chunkData,
           chunkInfos: null,
           chunkOffset,
           appendWindow: [period.start, period.end] };
}

/**
 * Parse TextTrack data.
 * @param {Object} loadedSegment
 * @param {Object} content
 * @param {number | undefined} initTimescale
 * @returns {Object}
 */
export default function textTrackParser(
  loadedSegment : { data : ILoadedTextSegmentFormat;
                    isChunked : boolean; },
  content : ISegmentContext,
  initTimescale : number | undefined
) : ISegmentParserParsedInitSegment<null> |
    ISegmentParserParsedSegment<ITextTrackSegmentData | null>
{
  const { period, representation, segment } = content;
  if (loadedSegment.data === null) { // No data, just return empty infos
    if (segment.isInit) {
      return { segmentType: "init",
               initializationData: null,
               protectionDataUpdate: false,
               initTimescale: undefined };
    }
    const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
    return { segmentType: "media",
             chunkData: null,
             chunkInfos: null,
             chunkOffset,
             appendWindow: [period.start, period.end] };
  }

  const isMP4 = isMP4EmbeddedTextTrack(representation);
  if (isMP4) {
    return parseISOBMFFEmbeddedTextTrack(loadedSegment.data,
                                         loadedSegment.isChunked,
                                         content,
                                         initTimescale);
  } else {
    return parsePlainTextTrack(loadedSegment.data, loadedSegment.isChunked, content);
  }
}
