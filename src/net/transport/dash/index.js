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

import log from "../../../utils/log";
import { resolveURL } from "../../../utils/url";
import { bytesToStr } from "../../../utils/bytes.js";

import {
  parseSidx,
  patchPssh,
  getMdat,
  getMDHDTimescale,
} from "../../parsers/isobmff.js";
import { parseTTML } from "../../parsers/texttracks/ttml.js";
import { parseBif } from "../../parsers/bif.js";

import dashManifestParser from "./manifest";
import getISOBMFFTimingInfos from "./isobmff_timing_infos.js";
import request from "./request.js";
import {
  byteRange,
  replaceTokens,
  isMP4EmbeddedTrack,
} from "./utils.js";
import generateSegmentLoader from "./segment_loader.js";

// TODO Put that doc elsewhere for all transports
// TODO Separate manifest pipeline from other pipelines?
// TODO delete resolver (or move some segment logic into a resolver)?
// TODO merge loader and parser? (DASH xlink)

/**
 * The object returned by the observable of a resolver has the following key:
 *   - url {string}: the url on which the request should be done.
 */

/**
 * The objects returned by the observable of a loader are linked to a request.
 * They can be under two forms:
 *   - 0+ progress reports
 *   - 1 response (always the last object emitted)
 *
 * Those objects have two keys: type {string} and value {Object}. _type_ allows
 * to know which type of object we have:
 *   - "progress": means it is a progress report
 *   - "response" means it is a response
 *
 * The _value_ object differs depending on the type.
 *
 * For progress reports, _value_ has the following keys:
 *   - size {Number}: number of bytes currently loaded
 *   - totalSize {Number|undefined}: number of bytes to download in total
 *   - duration {Number}: amount of time since the beginning of the request, in
 *     ms
 *   - url {string}: the url on which the request was done
 *
 * For a _response_, _value_ has the following keys:
 *   - size {Number|undefined}: number of bytes of the response
 *   - duration {Number}: total amount of time for the request, in ms
 *   - url {string}: the url on which the request was done
 *   - responseData {*}: the response, its value depends on the responseType
 *     header.
 */

/**
 * The object returned by the observable of the manifest parser has the
 * following keys:
 *   - manifest {Object}: The parsed manifest
 *   - url {string}: url at which the manifest was downloaded
 */

/**
 * The object returned by the observable of the audio, video, text and image's
 * parser has the following keys:
 *
 *   - segmentData {*}: The raw exploitable data of the downloaded segment.
 *     The type of data depends on the type of pipeline concerned (audio/video
 *     returns an ArrayBuffer, image an object, text an Array).
 *
 *   - segmentInfos {Object|undefined}: Informations about the parsed segment.
 *     Contains the following keys:
 *
 *       - time {Number}: initial start time for that segment, in the segment
 *         timescale.
 *         Can be -1 if the segment is not meant to be played (e.g. init
 *         segments).
 *
 *       - duration {Number}: duration for that segment, in the segment
 *         timescale. Can be 0 if the segment has no duration (e.g init
 *         segments).
 *
 *       - timescale {Number|undefined}: timescale in which the duration
 *         and time of this same object are defined. For init segments, this
 *         value can be undefined.
 *
 *     For init segments, this object can be important for subsequent download
 *     of "regular" segments. As such, it should be re-fed as an "init" object
 *     to the load function of the corresponding pipeline, for segments linked
 *     to this init segment (the pipelines here do not save any state).
 *
 *   - nextSegments {Array.<Object>|undefined}: Supplementary informations on
 *   subsequent segment. TODO documentation of nextSegments.
 */

/**
 * More specifically, the text parser's segmentData should be an object, with
 * the following keys:
 *
 *   - data {*}: The texttrack data TODO explain
 *
 *   - timescale {Number}: the timescale. That is, the number of time units that
 *     pass in one second. For example, a time coordinate system that measures
 *     time in sixtieths of a second has a timescale of 60.
 *
 *   - start {Number}: The start time, timescaled, those texttracks are for.
 *     Note that this value is different than the start of the first cue:
 *       - the start of the first cue is the time at which the first cue in the
 *         data given should begin to be displayed.
 *       - ``start`` is the absolute start time for which the data apply.
 *     That means, if the given data is for a segment that begins with 10s
 *     without any cue, the ``start`` value should be 10s (timescaled) inferior
 *     to the start of the first cue.
 *     This is useful to copy the behavior of "native" SourceBuffer to indicate
 *     which segments have been "buffered".
 *
 *   - end {Number|undefined}: The end time, timescaled, those texttracks are
 *     for.
 *     Check ``start`` for more informations about the difference between this
 *     value and the end of the last cue in the data.
 *     This number can be undefined to raise the error resilience. In that case,
 *     the end time will be defined from the last text track in the data.
 */

/**
 * Returns pipelines used for DASH streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @param {Function} [options.contentProtectionParser] - Optional parser for the
 * manifest's content Protection.
 * @returns {Object}
 */
export default function(options={}) {
  const segmentLoader = generateSegmentLoader(options.segmentLoader);
  let { contentProtectionParser } = options;

  if (!contentProtectionParser) {
    contentProtectionParser = () => {};
  }

  const manifestPipeline = {
    loader({ url }) {
      return request({
        url,
        responseType: "document",
      });
    },

    parser({ response }) {
      const data = response.responseData;
      return Observable.of({
        manifest: dashManifestParser(data, contentProtectionParser),
        url: response.url,
      });
    },
  };

  const segmentPipeline = {
    loader({ segment, representation, adaptation, manifest }) {
      return segmentLoader({
        segment,
        representation,
        adaptation,
        manifest,
      });
    },

    parser({ segment, adaptation, response, init }) {
      const responseData = new Uint8Array(response.responseData);
      let nextSegments, segmentInfos;
      let segmentData = responseData;

      const indexRange = segment.indexRange;
      const sidxSegments =
        parseSidx(responseData, indexRange ? indexRange[0] : 0);
      if (sidxSegments) {
        nextSegments = sidxSegments;
      }

      if (segment.isInit) {
        segmentInfos = { time: -1, duration: 0 };
        const timescale = getMDHDTimescale(responseData);
        if (timescale > 0) {
          segmentInfos.timescale = timescale;
        }
        if (adaptation.contentProtection) {
          segmentData = patchPssh(responseData, adaptation.contentProtection);
        }
      } else {
        segmentInfos =
          getISOBMFFTimingInfos(segment, responseData, sidxSegments, init);
      }

      return Observable.of({ segmentData, segmentInfos, nextSegments });
    },
  };

  const textTrackPipeline = {
    // TODO DRY this (code too similar to segmentPipeline)
    loader({ segment, representation }) {
      const {
        media,
        range,
        indexRange,
        isInit,
      } = segment;

      const responseType = isMP4EmbeddedTrack(representation) >= 0 ?
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
    },

    parser({ response, segment, adaptation, representation, init }) {
      const { language } = adaptation;
      const { isInit, indexRange } = segment;
      let responseData;
      let text;
      let nextSegments, segmentInfos;
      let segmentData;

      const isMP4 = isMP4EmbeddedTrack(representation);
      if (isMP4) {
        responseData = new Uint8Array(response.responseData);
        text = bytesToStr(getMdat(responseData));

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
        responseData = text = response.responseData;
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
        const { codec = "" } = representation;

        switch (codec.toLowerCase()) {
        case "stpp":
          segmentData = {
            start: segmentInfos.time,
            end: segmentInfos.time + segmentInfos.duration,
            timescale: segmentInfos.timescale,
            data: parseTTML(text, language, 0),
          };
          break;
        default:
          log.warn("The codec used for the subtitle is not managed yet.");
        }
      }
      return Observable.of({ segmentData, segmentInfos, nextSegments });
    },

  };

  const imageTrackPipeline = {
    loader({ segment, representation }) {
      const { isInit } = segment;

      if (isInit) {
        return Observable.empty();
      } else {
        const { media } = segment;

        const path = media ?
          replaceTokens(media, segment, representation) : "";
        const mediaUrl = resolveURL(representation.baseURL, path);
        return request({
          url: mediaUrl,
          responseType: "arraybuffer",
        });
      }
    },

    parser({ response }) {
      const responseData = response.responseData;
      const blob = new Uint8Array(responseData);

      const segmentInfos = {
        time: 0,
        duration:  Number.MAX_VALUE,
      };

      let segmentData;
      if (blob) {
        const bif = parseBif(blob);
        segmentData = bif.thumbs;
        segmentInfos.timescale = bif.timescale;

        // TODO
        // var firstThumb = blob[0];
        // var lastThumb  = blob[blob.length - 1];

        // segmentInfos = {
        //   time: firstThumb.ts,
        //   duration:  lastThumb.ts
        // };
      }

      return Observable.of({ segmentData, segmentInfos });
    },
  };

  return {
    directFile: false,
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    image: imageTrackPipeline,
  };
}
