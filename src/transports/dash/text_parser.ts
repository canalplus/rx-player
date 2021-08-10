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
  getMDHDTimescale,
  getSegmentsFromSidx,
} from "../../parsers/containers/isobmff";
import {
  strToUtf8,
  utf8ToStr,
} from "../../utils/string_parsing";
import takeFirstSet from "../../utils/take_first_set";
import {
  ISegmentContext,
  ISegmentParser,
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
 *
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
 * @param {boolean} __priv_patchLastSegmentInSidx - Enable ugly Canal+-specific
 * fix for an issue people on the content-packaging side could not fix.
 * For more information on that, look at the code using it.
 * @returns {Observable.<Object>}
 */
function parseISOBMFFEmbeddedTextTrack(
  data : ArrayBuffer | Uint8Array | string,
  isChunked : boolean,
  context : ISegmentContext,
  initTimescale : number | undefined,
  __priv_patchLastSegmentInSidx? : boolean
) : ISegmentParserParsedMediaChunk< ITextTrackSegmentData | null > |
    ISegmentParserParsedInitChunk< null > {
  const { segment } = context;
  const { isInit, indexRange } = segment;

  const chunkBytes = typeof data === "string"   ? strToUtf8(data) :
                     data instanceof Uint8Array ? data :
                                                  new Uint8Array(data);
  if (isInit) {
    const segmentList =
      getSegmentsFromSidx(chunkBytes, Array.isArray(indexRange) ? indexRange[0] :
                                                                  0);

    // This is a very specific handling for streams we know have a very
    // specific problem at Canal+: The last reference gives a truncated
    // segment.
    // Sadly, people on the packaging side could not fix all legacy contents.
    // This is an easy-but-ugly fix for those.
    // TODO Cleaner way? I tried to always check the obtained segment after
    // a byte-range request but it leads to a lot of code.
    if (__priv_patchLastSegmentInSidx === true &&
        segmentList !== null &&
        segmentList.length > 0)
    {
      const lastSegment = segmentList[ segmentList.length - 1 ];
      if (Array.isArray(lastSegment.range)) {
        lastSegment.range[1] = Infinity;
      }
    }

    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    return { segmentType: "init",
             initializationData: null,
             initializationDataSize: 0,
             protectionData: [],
             initTimescale: mdhdTimescale,
             segmentList: segmentList ?? undefined };
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
           appendWindow: [context.periodStart, context.periodEnd] };
}

/**
 * Parse TextTrack data when it is in plain text form.
 *
 * @param {ArrayBuffer|Uint8Array|string} data - The segment data.
 * @param {boolean} isChunked - If `true`, the `data` may contain only a
 * decodable subpart of the full data in the linked segment.
 * @param {Object} context - Object describing the context of the given
 * segment's data: of which segment, `Representation`, `Adaptation`, `Period`,
 * `Manifest` it is a part of etc.
 * @returns {Observable.<Object>}
 */
function parsePlainTextTrack(
  data : ArrayBuffer | Uint8Array | string,
  isChunked : boolean,
  context : ISegmentContext
) : ISegmentParserParsedMediaChunk< ITextTrackSegmentData | null > |
    ISegmentParserParsedInitChunk< null > {
  const { periodStart, periodEnd, segment } = context;
  const { timestampOffset = 0 } = segment;
  if (segment.isInit) {
    return { segmentType: "init",
             initializationData: null,
             initializationDataSize: 0,
             protectionData: [],
             initTimescale: undefined };
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
  return { segmentType: "media",
           chunkData,
           chunkSize,
           chunkInfos: null,
           chunkOffset: timestampOffset,
           protectionData: [],
           appendWindow: [periodStart, periodEnd] };
}

/**
 * Generate a "segment parser" for DASH text tracks.
 *
 * @param {Object} config
 * @returns {Function}
 */
export default function generateTextTrackParser(
  { __priv_patchLastSegmentInSidx } : {
    __priv_patchLastSegmentInSidx? : boolean | undefined;
  }
) : ISegmentParser< ArrayBuffer | Uint8Array | string | null,
                    ITextTrackSegmentData | null > {
  /**
   * Parse TextTrack data.
   * @param {Object} infos
   * @returns {Observable.<Object>}
   */
  return function textTrackParser(
    loadedSegment : { data : ArrayBuffer | Uint8Array | string | null;
                      isChunked : boolean; },
    context : ISegmentContext,
    initTimescale : number | undefined
  ) : ISegmentParserParsedMediaChunk< ITextTrackSegmentData | null > |
      ISegmentParserParsedInitChunk< null > {
    const { periodStart, periodEnd, segment } = context;
    const { data, isChunked } = loadedSegment;

    if (data === null) {
      // No data, just return an empty placeholder object
      return segment.isInit ? { segmentType: "init",
                                initializationData: null,
                                initializationDataSize: 0,
                                protectionData: [],
                                initTimescale: undefined } :

                              { segmentType: "media",
                                chunkData: null,
                                chunkSize: 0,
                                chunkInfos: null,
                                chunkOffset: segment.timestampOffset ?? 0,
                                protectionData: [],
                                appendWindow: [periodStart, periodEnd] };
    }

    const containerType = inferSegmentContainer(context.type, context.mimeType);

    // TODO take a look to check if this is an ISOBMFF/webm when undefined?
    if (containerType === "webm") {
      // TODO Handle webm containers
      throw new Error("Text tracks with a WEBM container are not yet handled.");
    } else if (containerType === "mp4") {
      return parseISOBMFFEmbeddedTextTrack(data,
                                           isChunked,
                                           context,
                                           initTimescale, __priv_patchLastSegmentInSidx);
    } else {
      return parsePlainTextTrack(data, isChunked, context);
    }
  };
}
