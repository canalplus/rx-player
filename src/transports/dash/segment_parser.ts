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
  ISegmentParserArguments,
  ISegmentParserInitSegment,
  ISegmentParserSegment,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import inferSegmentContainer from "../utils/infer_segment_container";
import getEventsOutOfEMSGs from "./get_events_out_of_emsgs";

/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateAudioVideoSegmentParser(
  { __priv_patchLastSegmentInSidx } : { __priv_patchLastSegmentInSidx? : boolean }
) {
  return function audioVideoSegmentParser(
    { content,
      response,
      initTimescale } : ISegmentParserArguments< Uint8Array |
                                                 ArrayBuffer |
                                                 null >
  ) : ISegmentParserInitSegment<Uint8Array | ArrayBuffer | null> |
      ISegmentParserSegment< Uint8Array | ArrayBuffer | null> {
    const { period, adaptation, representation, segment, manifest } = content;
    const { data, isChunked } = response;
    const appendWindow : [number, number | undefined] = [ period.start, period.end ];

    if (data === null) {
      if (segment.isInit) {
        return { type: "parsed-init-segment" as const,
                 value: { initializationData: null,
                          protectionDataUpdate: false,
                          initTimescale: undefined } };
      }
      return { type: "parsed-segment" as const,
               value: { chunkData: null,
                        chunkInfos: null,
                        chunkOffset: 0,
                        protectionDataUpdate: false,
                        appendWindow } };
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
            return { type: "parsed-segment",
                     value: { chunkData,
                              chunkInfos,
                              chunkOffset,
                              appendWindow,
                              inbandEvents,
                              protectionDataUpdate,
                              needsManifestRefresh } };
          }
        }
      }

      return { type: "parsed-segment",
               value: { chunkData,
                        chunkInfos,
                        chunkOffset,
                        protectionDataUpdate,
                        appendWindow } };
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

    return { type: "parsed-init-segment",
             value: { initializationData: chunkData,
                      protectionDataUpdate,
                      initTimescale: parsedTimescale } };
  };
}
