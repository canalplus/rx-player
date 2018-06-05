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

import objectAssign from "object-assign";
import {
  merge as observableMerge,
  of as observableOf,
} from "rxjs";

import assert from "../../utils/assert";
import { stringFromUTF8 } from "../../utils/strings";

import {
  getMDAT,
  getMDHDTimescale,
  parseSidx,
} from "../../parsers/containers/isobmff";

import request from "../../utils/request";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import {
  addNextSegments,
  byteRange,
  isMP4EmbeddedTrack
} from "./utils";

import {
  ILoaderObservable,
  INextSegmentsInfos,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentTimingInfos,
  ITextTrackSegmentData,
  TextTrackParserObservable,
} from "../types";

/**
 * Perform requests for "text" segments
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function TextTrackLoader(
  { segment, representation } : ISegmentLoaderArguments
) : ILoaderObservable<ArrayBuffer|string|null> {
  const {
    mediaURL,
    range,
    indexRange,
  } = segment;

  // ArrayBuffer when in mp4 to parse isobmff manually, text otherwise
  const responseType = isMP4EmbeddedTrack(representation) ? "arraybuffer" : "text";

  // init segment without initialization media/range/indexRange:
  // we do nothing on the network
  if (mediaURL == null) {
    return observableOf({
      type: "data" as "data",
      value: { responseData: null },
    });
  }

  // fire a single time for contiguous init and index ranges
  if (range && indexRange && range[1] === indexRange[0] - 1) {
    return request({
      url: mediaURL,
      responseType,
      headers: {
        Range: byteRange([range[0], indexRange[1]]),
      },
    });
  }

  const mediaRequest = request<ArrayBuffer|string>({
    url: mediaURL,
    responseType,
    headers: range ? {
      Range: byteRange(range),
    } : null,
  });

  if (!indexRange) {
    return mediaRequest;
  }

  // If init segment has indexRange metadata, we need to fetch
  // both the initialization data and the index metadata. We do
  // this in parallel and send the both blobs into the pipeline.
  // TODO Find a solution for calling only one time the parser
  const indexRequest = request<ArrayBuffer|string>({
    url: mediaURL,
    responseType,
    headers: {
      Range: byteRange(indexRange),
    },
  });
  return observableMerge(mediaRequest, indexRequest);
}

/**
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function TextTrackParser({
  response,
  segment,
  adaptation,
  representation,
  init,
} : ISegmentParserArguments<Uint8Array|ArrayBuffer|string|null>
) : TextTrackParserObservable {
  const { language } = adaptation;
  const { isInit, indexRange } = segment;

  if (response.responseData == null) {
    return observableOf({
      segmentData: null,
      segmentInfos: segment.timescale > 0 ? {
        duration: segment.isInit ? 0 : segment.duration,
        time: segment.isInit ? -1 : segment.time,
        timescale: segment.timescale,
      } : null,
    });
  }

  let responseData : Uint8Array|string;
  let nextSegments : INextSegmentsInfos[]|undefined;
  let segmentInfos : ISegmentTimingInfos;
  let segmentData : ITextTrackSegmentData|null;

  const isMP4 = isMP4EmbeddedTrack(representation);
  if (isMP4) {
    assert(response.responseData instanceof ArrayBuffer);
    responseData = new Uint8Array(response.responseData as ArrayBuffer);

    const sidxSegments =
      parseSidx(responseData, indexRange ? indexRange[0] : 0);

    if (sidxSegments) {
      nextSegments = sidxSegments;
    }
    segmentInfos = isInit ?
      { time: -1, duration: 0, timescale: segment.timescale } :
      getISOBMFFTimingInfos(segment, responseData, sidxSegments, init);
  } else { // if not MP4
    assert(typeof response.responseData === "string");
    responseData = response.responseData as string;
    if (isInit) {
      segmentInfos = { time: -1, duration: 0, timescale: segment.timescale };
    } else {
      segmentInfos = {
        time: segment.time || 0, // TODO either force time tbd or better logic
        duration: segment.duration,
        timescale: segment.timescale,
      };
    }
  }

  if (isInit) {
    if (isMP4) {
      const timescale = getMDHDTimescale(responseData as Uint8Array);
      if (timescale > 0) {
        segmentInfos = {
          time: -1,
          duration: 0,
          timescale,
        };
      }
    }
    segmentData = null;
  } else { // if not init
    assert(segmentInfos != null);
    const segmentDataBase = {
      start: segmentInfos.time,
      end: segmentInfos.time + (segmentInfos.duration || 0),
      language,
      timescale: segmentInfos.timescale,
      timeOffset: 0,
    };
    if (isMP4) {
      const { codec = "" } = representation;
      let type : string|undefined;

      switch (codec.toLowerCase()) {
        case "stpp": // stpp === TTML in MP4
          type = "ttml";
          break;
        case "wvtt": // wvtt === WebVTT in MP4
          type = "vtt";
      }

      if (!type) {
        throw new Error(
          "The codec used for the subtitle is not managed yet.");
      }

      segmentData = objectAssign({
        data: stringFromUTF8(getMDAT(responseData as Uint8Array)),
        type,
      }, { timescale: 1 }, segmentDataBase);

    } else { // not MP4: check for plain text subtitles
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

      segmentData = objectAssign({
        data: responseData as string,
        type,
      }, { timescale: 1 }, segmentDataBase);
    }
  }

  if (nextSegments) {
    addNextSegments(representation, nextSegments, segmentInfos);
  }
  return observableOf({ segmentData, segmentInfos });
}

export {
  TextTrackLoader as loader,
  TextTrackParser as parser,
};
