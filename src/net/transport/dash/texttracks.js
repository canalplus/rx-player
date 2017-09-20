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
import { Observable } from "rxjs/Observable";

import log from "../../../utils/log";
import { resolveURL } from "../../../utils/url";
import { stringFromUTF8 } from "../../../utils/strings.js";

import {
  parseSidx,
  getMdat,
  getMDHDTimescale,
} from "../../parsers/isobmff.js";
import parseSAMIToVTT from "../../parsers/texttracks/sami.js";
import parseTTMLToVTT from "../../parsers/texttracks/ttml/ttml_to_vtt.js";

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

  const responseType = isMP4EmbeddedTrack(representation) ?
    "arraybuffer" : "text";

  // init segment without initialization media/range/indexRange:
  // we do nothing on the network
  if (isInit && !(media || range || indexRange)) {
    return Observable.empty();
  }

  const path = media ?
    replaceTokens(media, segment, representation) : "";

  const mediaUrl = resolveURL(representation.baseURL, path);

  // fire a single time contiguous init and index ranges.
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
  } else {
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
    };
  } else {
    const segmentDataBase = {
      start: segmentInfos.time,
      end: segmentInfos.time + segmentInfos.duration,
      timescale: segmentInfos.timescale,
    };
    if (isMP4) {
      const { codec = "" } = representation;

      switch (codec.toLowerCase()) {

      case "stpp": // stpp === TTML in MP4
        const str = stringFromUTF8(getMdat(responseData));
        segmentData = objectAssign({
          data: parseTTMLToVTT(str),
        }, segmentDataBase);
        break;

      case "wvtt": // wvtt === WebVTT in MP4
        segmentData = objectAssign({
          data: stringFromUTF8(getMdat(responseData)),
        }, segmentDataBase);
        break;

      default:
        log.warn("The codec used for the subtitle is not managed yet.");
      }
    } else { // check for plain text subtitles
      switch (representation.mimeType) {

      case "application/ttml+xml":
        segmentData = objectAssign({
          data: parseTTMLToVTT(responseData, language, 0),
        }, segmentDataBase);
        break;

      case "application/x-sami":
      case "application/smil":
        segmentData = objectAssign({
          data: parseSAMIToVTT(responseData, language, 0),
        }, segmentDataBase);
        break;

      case "text/vtt":
        segmentData = objectAssign({
          data: responseData,
        }, segmentDataBase);
        break;

      default:
        log.warn("The codec used for the subtitle is not managed yet.");
      }
    }
  }
  return Observable.of({ segmentData, segmentInfos, nextSegments });
}

export {
  TextTrackLoader as loader,
  TextTrackParser as parser,
};
