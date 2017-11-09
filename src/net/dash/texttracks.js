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

import { Observable } from "rxjs/Observable";
import objectAssign from "object-assign";

import { resolveURL } from "../../utils/url";
import { stringFromUTF8 } from "../../utils/strings.js";

import {
  parseSidx,
  getMdat,
  getMDHDTimescale,
} from "../../parsers/containers/isobmff.js";

import request from "./request.js";
import getISOBMFFTimingInfos from "./isobmff_timing_infos.js";
import {
  byteRange,
  replaceTokens,
  isMP4EmbeddedTrack,
} from "./utils.js";

/**
 * Perform requests for "text" segments
 * TODO DRY this (code too similar to segmentPipeline)
 *
 * @param {Object} infos
 * @param {Segment} infos.segment
 * @param {Representation} infos.representation
 * @returns {Observable.<Object>}
 */
function TextTrackLoader({ segment, representation }) {
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
    return Observable.merge(mediaOrInitRequest, indexRequest);
  }
  else {
    return mediaOrInitRequest;
  }
}

/**
 * Parse TextTrack data.
 *
 * @param {Object} infos
 * @param {Segment} infos.segment
 * @param {Adaptation} infos.manifest
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
  manifest,
  init,
}) {
  const { language } = adaptation;
  const { isInit, indexRange } = segment;
  let responseData;
  let nextSegments, segmentInfos;
  let segmentData;

  const isMP4 = isMP4EmbeddedTrack(representation);
  if (isMP4) {
    responseData = new Uint8Array(response.responseData);

    const sidxSegments =
      parseSidx(responseData, indexRange ? indexRange[0] : 0);

    if (sidxSegments) {
      nextSegments = sidxSegments;
    }
    if (!isInit) {
      segmentInfos =
        getISOBMFFTimingInfos(segment, responseData, sidxSegments, init);
    }
  } else { // if not MP4
    responseData = response.responseData;
    segmentInfos = {
      time: segment.time,
      duration: segment.duration,
      timescale: segment.timescale,
    };
  }

  if (isInit) {
    segmentInfos = { time: -1, duration: 0 };
    if (isMP4) {
      const timescale = getMDHDTimescale(responseData);
      if (timescale > 0) {
        segmentInfos.timescale = timescale;
      }
    }

    // void data
    segmentData = {
      start: 0,
      end: 0,
      timescale: segmentInfos.timescale || 0,
      data: [],
      timeOffset: manifest.availabilityStartTime, // TODO + period.start
    };
  } else { // if not init
    const segmentDataBase = {
      start: segmentInfos.time,
      end: segmentInfos.time + segmentInfos.duration,
      language,
      timescale: segmentInfos.timescale,
      timeOffset: manifest.availabilityStartTime, // TODO + period.start
    };
    if (isMP4) {
      const { codec = "" } = representation;
      let type;

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
        data: stringFromUTF8(getMdat(responseData)),
        type,
      }, segmentDataBase);

    } else { // not MP4: check for plain text subtitles
      let type;

      const { mimeType = "" } = representation.mimeType;
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
        data: responseData,
        type,
      }, segmentDataBase);
    }
  }
  return Observable.of({ segmentData, segmentInfos, nextSegments });
}

export {
  TextTrackLoader as loader,
  TextTrackParser as parser,
};
