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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";

import assert from "../../utils/assert";
import { stringFromUTF8 } from "../../utils/strings";
import { resolveURL } from "../../utils/url";

import {
  getMdat,
  getMDHDTimescale,
  parseSidx,
} from "../../parsers/containers/isobmff";

import request from "../../utils/request";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import {
  addNextSegments,
  byteRange,
  isMP4EmbeddedTrack,
  replaceTokens,
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
 * TODO DRY this (code too similar to segmentPipeline)
 *
 * @param {Object} infos
 * @param {Segment} infos.segment
 * @param {Representation} infos.representation
 * @returns {Observable.<Object>}
 */
function TextTrackLoader(
  { segment, representation } : ISegmentLoaderArguments
) : ILoaderObservable<ArrayBuffer|string> {
  const {
    media,
    range,
    indexRange,
    isInit,
  } = segment;

  /**
   * ArrayBuffer when in mp4 to parse isobmff manually, text otherwise
   * @type string
   */
  const responseType = isMP4EmbeddedTrack(representation) ?
    "arraybuffer" : "text";

  // init segment without initialization media/range/indexRange:
  // we do nothing on the network
  if (isInit && !(media || range || indexRange)) {
    return Observable.empty();
  }

  /**
   * filename
   * @type string
   */
  const path = media ?
    replaceTokens(media, segment, representation) : "";

  /**
   * Complete path of the segment.
   * @type string
   */
  const mediaUrl = resolveURL(representation.baseURL, path);

  // fire a single time contiguous init and index ranges.
  // TODO Find a solution for indicating that special case to the parser
  if (
    range && indexRange &&
    range[1] === indexRange[0] - 1
  ) {
    return request({
      url: mediaUrl,
      responseType,
      headers: {
        Range: byteRange([range[0], indexRange[1]]),
      },
    });
  }

  /**
   * Segment request.
   * @type Observable.<Object>
   */
  const mediaOrInitRequest = request({
    url: mediaUrl,
    responseType,
    headers: range ? {
      Range: byteRange(range),
    } : null,
  });

  // If init segment has indexRange metadata, we need to fetch
  // both the initialization data and the index metadata. We do
  // this in parallel and send the both blobs into the pipeline.
  // TODO Find a solution for calling only one time the parser
  if (indexRange) {
    const indexRequest = request({
      url: mediaUrl,
      responseType,
      headers: {
        Range: byteRange(indexRange),
      },
    });
    // TypeScript just break here, supposedly for the responseType
    // TODO A TS Bug? Open an issue. Investigate first.
    return Observable.merge(mediaOrInitRequest, indexRequest) as
      ILoaderObservable<ArrayBuffer|string>;
  }
  else {
    // TypeScript just break here, supposedly for the responseType
    // TODO A TS Bug? Open an issue. Investigate first.
    return mediaOrInitRequest as ILoaderObservable<ArrayBuffer|string>;
  }
}

/**
 * Parse TextTrack data.
 *
 * @param {Object} infos
 * @param {Segment} infos.segment
 * @param {Manifest} infos.manifest
 * @param {Adaptation} infos.adaptation
 * @param {Representation} infos.representation
 * @param {Object} infos.init
 * @returns {Observable.<Object>}
 */
function TextTrackParser({
  response,
  segment,
  adaptation,
  representation,
  init,
} : ISegmentParserArguments<Uint8Array|ArrayBuffer|string>
) : TextTrackParserObservable {
  const { language } = adaptation;
  const { isInit, indexRange } = segment;

  let responseData : Uint8Array|string;
  let nextSegments : INextSegmentsInfos[]|undefined;
  let segmentInfos : ISegmentTimingInfos;
  let segmentData : ITextTrackSegmentData|undefined;

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
    segmentData = undefined;
  } else { // if not init
    assert(segmentInfos);
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
        data: stringFromUTF8(getMdat(responseData as Uint8Array)),
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
  return Observable.of({ segmentData, segmentInfos });
}

export {
  TextTrackLoader as loader,
  TextTrackParser as parser,
};
