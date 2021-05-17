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

import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { getMDHDTimescale } from "../../parsers/containers/isobmff";
import {
  strToUtf8,
  utf8ToStr,
} from "../../utils/string_parsing";
import takeFirstSet from "../../utils/take_first_set";
import {
  ISegmentParserArguments,
  ISegmentParserParsedInitSegment,
  ISegmentParserParsedSegment,
  ITextTrackSegmentData,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import inferSegmentContainer from "../utils/infer_segment_container";
import {
  getISOBMFFEmbeddedTextTrackData,
  getPlainTextTrackData,
} from "../utils/parse_text_track";

/**
 * Parse TextTrack data when it is embedded in an ISOBMFF file.
 *
 * @param {ArrayBuffer|Uint8Array|string} data - The segment data.
 * @param {boolean} isChunked - If `true`, the `data` may contain only a
 * decodable subpart of the full data in the linked segment.
 * @param {Object} content - Object describing the context of the given
 * segment's data: of which segment, `Representation`, `Adaptation`, `Period`,
 * `Manifest` it is a part of etc.
 * @param {number|undefined} initTimescale - `timescale` value - encountered
 * in this linked initialization segment (if it exists) - that may also apply
 * to that segment if no new timescale is defined in it.
 * Can be `undefined` if no timescale was defined, if it is not known, or if
 * no linked initialization segment was yet parsed.
 * @returns {Observable.<Object>}
 */
function parseISOBMFFEmbeddedTextTrack(
  data : Uint8Array | ArrayBuffer | string,
  isChunked : boolean,
  content : { manifest : Manifest;
              period : Period;
              adaptation : Adaptation;
              representation : Representation;
              segment : ISegment; },
  initTimescale : number | undefined,
  __priv_patchLastSegmentInSidx? : boolean
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
           protectionDataUpdate: false,
           appendWindow: [period.start, period.end] };
}

/**
 * Parse TextTrack data when it is in plain text form.
 *
 * @param {ArrayBuffer|Uint8Array|string} data - The segment data.
 * @param {boolean} isChunked - If `true`, the `data` may contain only a
 * decodable subpart of the full data in the linked segment.
 * @param {Object} content - Object describing the context of the given
 * segment's data: of which segment, `Representation`, `Adaptation`, `Period`,
 * `Manifest` it is a part of etc.
 * @returns {Observable.<Object>}
 */
function parsePlainTextTrack(
  data : Uint8Array | ArrayBuffer | string,
  isChunked : boolean,
  content : { manifest : Manifest;
              period : Period;
              adaptation : Adaptation;
              representation : Representation;
              segment : ISegment; }
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
           protectionDataUpdate: false,
           appendWindow: [period.start, period.end] };
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
) : ISegmentParserParsedInitSegment<null> |
    ISegmentParserParsedSegment<ITextTrackSegmentData | null>
{
  const { period, adaptation, representation, segment } = content;
  const { data, isChunked } = response;

  if (data === null) {
    // No data, just return an empty placeholder object
    if (segment.isInit) {
      return { segmentType: "init",
               initializationData: null,
               protectionDataUpdate: false,
               initTimescale: undefined };
    }
    const chunkOffset = segment.timestampOffset ?? 0;
    return { segmentType: "media",
             chunkData: null,
             chunkInfos: null,
             chunkOffset,
             protectionDataUpdate: false,
             appendWindow: [period.start, period.end] };
  }

  const containerType = inferSegmentContainer(adaptation.type, representation);

  // TODO take a look to check if this is an ISOBMFF/webm when undefined?
  if (containerType === "webm") {
    // TODO Handle webm containers
    throw new Error("Text tracks with a WEBM container are not yet handled.");
  } else if (containerType === "mp4") {
    return parseISOBMFFEmbeddedTextTrack(data, isChunked, content, initTimescale);
  } else {
    return parsePlainTextTrack(data, isChunked, content);
  }
}
