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
  takePSSHOut,
} from "../../parsers/containers/isobmff";
import { parseEmsgBoxes } from "../../parsers/containers/isobmff/utils";
import {
  getSegmentsFromCues,
  getTimeCodeScale,
} from "../../parsers/containers/matroska";
import { BaseRepresentationIndex } from "../../parsers/manifest/dash";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import takeFirstSet from "../../utils/take_first_set";
import {
  ISegmentContext,
  ISegmentParser,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import inferSegmentContainer from "../utils/infer_segment_container";
import getEventsOutOfEMSGs from "./get_events_out_of_emsgs";

/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateAudioVideoSegmentParser(
  { __priv_patchLastSegmentInSidx } : {
    __priv_patchLastSegmentInSidx? : boolean | undefined;
  }
) : ISegmentParser<
  ArrayBuffer | Uint8Array | null,
  ArrayBuffer | Uint8Array | null
> {
  return function audioVideoSegmentParser(
    loadedSegment : { data : ArrayBuffer | Uint8Array | null;
                      isChunked : boolean; },
    content : ISegmentContext,
    initTimescale : number | undefined
  ) : ISegmentParserParsedMediaChunk< Uint8Array | ArrayBuffer | null > |
      ISegmentParserParsedInitChunk< Uint8Array | ArrayBuffer | null > {
    const { period, adaptation, representation, segment, manifest } = content;
    const { data, isChunked } = loadedSegment;
    const appendWindow : [number, number | undefined] = [ period.start, period.end ];

    if (data === null) {
      if (segment.isInit) {
        return { segmentType: "init",
                 initializationData: null,
                 initializationDataSize: 0,
                 protectionDataUpdate: false,
                 initTimescale: undefined };
      }
      return { segmentType: "media",
               chunkData: null,
               chunkSize: 0,
               chunkInfos: null,
               chunkOffset: 0,
               protectionDataUpdate: false,
               appendWindow };
    }

    const chunkData = data instanceof Uint8Array ? data :
                                                   new Uint8Array(data);

    const containerType = inferSegmentContainer(adaptation.type, representation);

    // TODO take a look to check if this is an ISOBMFF/webm?
    const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;

    let protectionDataUpdate = false;
    if (seemsToBeMP4) {
      const psshInfo = takePSSHOut(chunkData);
      if (psshInfo.length > 0) {
        protectionDataUpdate = representation._addProtectionData("cenc", psshInfo);
      }
    }

    if (!segment.isInit) {
      const chunkInfos = seemsToBeMP4 ? getISOBMFFTimingInfos(chunkData,
                                                              isChunked,
                                                              segment,
                                                              initTimescale) :
                                        null; // TODO extract time info from webm
      const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);

      if (seemsToBeMP4) {
        const parsedEMSGs = parseEmsgBoxes(chunkData);
        if (parsedEMSGs !== undefined) {
          const whitelistedEMSGs = parsedEMSGs.filter((evt) => {
            if (segment.privateInfos === undefined ||
                segment.privateInfos.isEMSGWhitelisted === undefined) {
              return false;
            }
            return segment.privateInfos.isEMSGWhitelisted(evt);
          });
          const events = getEventsOutOfEMSGs(whitelistedEMSGs,
                                             manifest.publishTime);
          if (events !== undefined) {
            const { needsManifestRefresh, inbandEvents } = events;
            return { segmentType: "media",
                     chunkData,
                     chunkSize: chunkData.length,
                     chunkInfos,
                     chunkOffset,
                     appendWindow,
                     inbandEvents,
                     protectionDataUpdate,
                     needsManifestRefresh };
          }
        }
      }

      return { segmentType: "media",
               chunkData,
               chunkSize: chunkData.length,
               chunkInfos,
               chunkOffset,
               protectionDataUpdate,
               appendWindow };
    }
    // we're handling an initialization segment
    const { indexRange } = segment;

    let nextSegments = null;
    if (containerType === "webm") {
      nextSegments = getSegmentsFromCues(chunkData, 0);
    } else if (seemsToBeMP4) {
      nextSegments = getSegmentsFromSidx(chunkData, Array.isArray(indexRange) ?
                                                      indexRange[0] :
                                                      0);

      // This is a very specific handling for streams we know have a very
      // specific problem at Canal+: The last reference gives a truncated
      // segment.
      // Sadly, people on the packaging side could not fix all legacy contents.
      // This is an easy-but-ugly fix for those.
      // TODO Cleaner way? I tried to always check the obtained segment after
      // a byte-range request but it leads to a lot of code.
      if (__priv_patchLastSegmentInSidx === true &&
          nextSegments !== null &&
          nextSegments.length > 0)
      {
        const lastSegment = nextSegments[ nextSegments.length - 1 ];
        if (Array.isArray(lastSegment.range)) {
          lastSegment.range[1] = Infinity;
        }
      }
    }

    if (representation.index instanceof BaseRepresentationIndex &&
        nextSegments !== null &&
        nextSegments.length > 0)
    {
      representation.index.initializeIndex(nextSegments);
    }

    const timescale = seemsToBeMP4             ? getMDHDTimescale(chunkData) :
                      containerType === "webm" ? getTimeCodeScale(chunkData, 0) :
                                                 undefined;

    const parsedTimescale = isNullOrUndefined(timescale) ? undefined :
                                                           timescale;

    return { segmentType: "init",
             initializationData: chunkData,
             initializationDataSize: chunkData.length,
             protectionDataUpdate,
             initTimescale: parsedTimescale };
  };
}
