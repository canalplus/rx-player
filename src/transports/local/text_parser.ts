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
import {
  strToUtf8,
  utf8ToStr,
} from "../../utils/string_parsing";
import takeFirstSet from "../../utils/take_first_set";
import {
  ILoadedTextSegmentFormat,
  ISegmentContext,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
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
 * @param {ArrayBuffer|Uint8Array|string} data - The segment data.
 * @param {boolean} isChunked - If `true`, the `data` may contain only a
 * decodable subpart of the full data in the linked segment.
 * @param {Object} context - Object describing the context of the given
 * segment's data: of which segment, `Representation`, `Adaptation`, `Period`,
 * `Manifest` it is a part of etc.
 * @param {number|undefined} initTimescale - `timescale` value - encountered
 * in this linked initialization segment (if it exists) - that may also apply
 * to that segment if no new timescale is defined in it.
 * Can be `undefined` if no timescale was defined, if it is not known, or if
 * no linked initialization segment was yet parsed.
 * @returns {Object}
 */
function parseISOBMFFEmbeddedTextTrack(
  data : string | Uint8Array | ArrayBuffer,
  isChunked : boolean,
  context : ISegmentContext,
  initTimescale : number | undefined
) : ISegmentParserParsedInitChunk<null> |
    ISegmentParserParsedMediaChunk<ITextTrackSegmentData | null>
{
  const { periodStart, periodEnd, segment } = context;

  const chunkBytes = typeof data === "string" ? strToUtf8(data) :
                     data instanceof Uint8Array ? data :
                                                  new Uint8Array(data);
  if (segment.isInit) {
    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    return { segmentType: "init",
             initializationData: null,
             initializationDataSize: 0,
             initTimescale: mdhdTimescale,
             protectionData: [] };
  }
  const chunkInfos = getISOBMFFTimingInfos(chunkBytes,
                                           isChunked,
                                           segment,
                                           initTimescale);
  const chunkData = getISOBMFFEmbeddedTextTrackData(context,
                                                    chunkBytes,
                                                    chunkInfos,
                                                    isChunked);
  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
  return { segmentType: "media",
           chunkData,
           chunkSize: chunkBytes.length,
           chunkInfos,
           chunkOffset,
           protectionData: [],
           appendWindow: [periodStart, periodEnd] };
}

/**
 * Parse TextTrack data when it is in plain text form.
 * @param {ArrayBuffer|Uint8Array|string} data - The segment data.
 * @param {boolean} isChunked - If `true`, the `data` may contain only a
 * decodable subpart of the full data in the linked segment.
 * @param {Object} context - Object describing the context of the given
 * segment's data: of which segment, `Representation`, `Adaptation`, `Period`,
 * `Manifest` it is a part of etc.
 * @returns {Object}
 */
function parsePlainTextTrack(
  data : string | Uint8Array | ArrayBuffer,
  isChunked : boolean,
  context : ISegmentContext
) : ISegmentParserParsedInitChunk<null> |
    ISegmentParserParsedMediaChunk<ITextTrackSegmentData | null>
{
  const { segment, periodStart, periodEnd } = context;
  if (segment.isInit) {
    return { segmentType: "init",
             initializationData: null,
             initializationDataSize: 0,
             initTimescale: undefined,
             protectionData: [] };
  }

  let textTrackData : string;
  let chunkSize : number | undefined;
  if (typeof data !== "string") {
    const bytesData = data instanceof Uint8Array ? data :
                                                   new Uint8Array(data);
    textTrackData = utf8ToStr(bytesData);
    chunkSize = bytesData.length;
  } else {
    textTrackData = data;
  }
  const chunkData = getPlainTextTrackData(context, textTrackData, isChunked);
  const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
  return { segmentType: "media",
           chunkData,
           chunkSize,
           chunkInfos: null,
           chunkOffset,
           protectionData: [],
           appendWindow: [periodStart, periodEnd] };
}

/**
 * Parse TextTrack data.
 * @param {Object} loadedSegment
 * @param {Object} context
 * @param {number | undefined} initTimescale
 * @returns {Object}
 */
export default function textTrackParser(
  loadedSegment : { data : ILoadedTextSegmentFormat;
                    isChunked : boolean; },
  context : ISegmentContext,
  initTimescale : number | undefined
) : ISegmentParserParsedInitChunk<null> |
    ISegmentParserParsedMediaChunk<ITextTrackSegmentData | null>
{
  const { segment, periodStart, periodEnd } = context;
  const { data, isChunked } = loadedSegment;

  if (data === null) {
    // No data, just return an empty placeholder object
    if (segment.isInit) {
      return { segmentType: "init",
               initializationData: null,
               initializationDataSize: 0,
               protectionData: [],
               initTimescale: undefined };
    }
    const chunkOffset = segment.timestampOffset ?? 0;
    return { segmentType: "media",
             chunkData: null,
             chunkSize: 0,
             chunkInfos: null,
             chunkOffset,
             protectionData: [],
             appendWindow: [periodStart, periodEnd] };
  }

  const containerType = inferSegmentContainer(context.type, context.mimeType);

  // TODO take a look to check if this is an ISOBMFF/webm when undefined?
  if (containerType === "webm") {
    // TODO Handle webm containers
    throw new Error("Text tracks with a WEBM container are not yet handled.");
  } else if (containerType === "mp4") {
    return parseISOBMFFEmbeddedTextTrack(data, isChunked, context, initTimescale);
  } else {
    return parsePlainTextTrack(data, isChunked, context);
  }
}
