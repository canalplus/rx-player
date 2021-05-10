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
import {
  getMDHDTimescale,
  getSegmentsFromSidx,
} from "../../parsers/containers/isobmff";
import { BaseRepresentationIndex } from "../../parsers/manifest/dash";
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
import isMP4EmbeddedTextTrack from "../utils/is_mp4_embedded_text_track";
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
 * @param {boolean} __priv_patchLastSegmentInSidx - Enable ugly Canal+-specific
 * fix for an issue people on the content-packaging side could not fix.
 * For more information on that, look at the code using it.
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
  const { period, representation, segment } = content;
  const { isInit, indexRange } = segment;

  const chunkBytes = typeof data === "string"   ? strToUtf8(data) :
                     data instanceof Uint8Array ? data :
                                                  new Uint8Array(data);
  if (isInit) {
    const sidxSegments =
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
        sidxSegments !== null &&
        sidxSegments.length > 0)
    {
      const lastSegment = sidxSegments[ sidxSegments.length - 1 ];
      if (Array.isArray(lastSegment.range)) {
        lastSegment.range[1] = Infinity;
      }
    }

    const mdhdTimescale = getMDHDTimescale(chunkBytes);
    if (representation.index instanceof BaseRepresentationIndex &&
        sidxSegments !== null &&
        sidxSegments.length > 0)
    {
      representation.index._addSegments(sidxSegments);
    }
    return { segmentType: "init",
             initializationData: null,
             protectionDataUpdate: false,
             initTimescale: mdhdTimescale };
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
  const { timestampOffset = 0 } = segment;
  if (segment.isInit) {
    return { segmentType: "init",
             initializationData: null,
             protectionDataUpdate: false,
             initTimescale: undefined };
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
  return { segmentType: "media",
           chunkData,
           chunkInfos: null,
           chunkOffset: timestampOffset,
           appendWindow: [period.start, period.end] };
}

/**
 * Generate a "segment parser" for DASH text tracks.
 *
 * @param {Object} config
 * @returns {Function}
 */
export default function generateTextTrackParser(
  { __priv_patchLastSegmentInSidx } : { __priv_patchLastSegmentInSidx? : boolean }
) {
  /**
   * Parse TextTrack data.
   * @param {Object} infos
   * @returns {Observable.<Object>}
   */
  return function textTrackParser(
    { response,
      content,
      initTimescale } : ISegmentParserArguments< Uint8Array |
                                                 ArrayBuffer |
                                                 string |
                                                 null >
  ) : ISegmentParserParsedInitSegment<null> |
      ISegmentParserParsedSegment<ITextTrackSegmentData | null>
  {
    const { period, representation, segment } = content;
    const { data, isChunked } = response;

    if (data === null) {
      // No data, just return an empty placeholder object
      return segment.isInit ? { segmentType: "init",
                                initializationData: null,
                                protectionDataUpdate: false,
                                initTimescale: undefined } :

                              { segmentType: "media",
                                chunkData: null,
                                chunkInfos: null,
                                chunkOffset: segment.timestampOffset ?? 0,
                                appendWindow: [period.start, period.end] };
    }

    return isMP4EmbeddedTextTrack(representation) ?
      parseISOBMFFEmbeddedTextTrack(data,
                                    isChunked,
                                    content,
                                    initTimescale,
                                    __priv_patchLastSegmentInSidx) :
      parsePlainTextTrack(data, isChunked, content);
  };
}
