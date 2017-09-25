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

import { resolveURL } from "../../utils/url";

import {
  parseSidx,
  patchPssh,
  getMDHDTimescale,
} from "../../parsers/containers/isobmff.js";
import parseBif from "../../parsers/bif.js";

import dashManifestParser from "./manifest";
import getISOBMFFTimingInfos from "./isobmff_timing_infos.js";
import request from "./request.js";
import { replaceTokens } from "./utils.js";
import generateSegmentLoader from "./segment_loader.js";
import {
  loader as TextTrackLoader,
  parser as TextTrackParser,
} from "./texttracks.js";

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
    loader: TextTrackLoader,
    parser: TextTrackParser,
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
