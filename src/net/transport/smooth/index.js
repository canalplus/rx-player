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

import { bytesToStr } from "../../../utils/bytes";
import { resolveURL } from "../../../utils/url";
import request from "../../../utils/request";

import createSmoothStreamingParser from "./parser";
import { parseBif } from "../../parsers/bif";
import { parseSami } from "../../parsers/texttracks/sami.js";
import { parseTTML } from "../../parsers/texttracks/ttml.js";

import mp4Utils from "./mp4.js";
import parsedRequest from "./request.js";
import {
  extractISML,
  extractToken,
  replaceToken,
  resolveManifest,
  buildSegmentURL,
} from "./utils.js";
import extractTimingsInfos from "./isobmff_timings_infos.js";
import generateSegmentLoader from "./segment_loader.js";

const {
  patchSegment,
  getMdat,
} = mp4Utils;

const TT_PARSERS = {
  "application/x-sami":       parseSami,
  "application/smil":         parseSami,
  "application/ttml+xml":     parseTTML,
  "application/ttml+xml+mp4": parseTTML,
  "text/vtt":                 (text) => text,
};

const WSX_REG = /\.wsx?(\?token=\S+)?/;

export default function(options={}) {
  const smoothManifestParser = createSmoothStreamingParser(options);
  const segmentLoader = generateSegmentLoader(options.segmentLoader);

  const manifestPipeline = {
    resolver({ url }) {
      let resolving;
      const token = extractToken(url);

      // TODO Remove WSX logic
      if (WSX_REG.test(url)) {
        resolving = request({
          url: replaceToken(url, ""),
          responseType: "document",
          ignoreProgressEvents: true,
        })
          .map(({ value }) => value)
          .map(extractISML); // TODO remove completely
      }
      else {
        resolving = Observable.of(url);
      }

      return resolving
        .map((url) => ({ url: replaceToken(resolveManifest(url), token) }));
    },

    loader({ url }) {
      return parsedRequest({
        url,
        responseType: "document",
      });
    },

    parser({ response }) {
      const manifest = smoothManifestParser(response.responseData);
      return Observable.of({ manifest, url: response.url });
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

    parser({ segment, response, manifest }) {
      const { responseData } = response;

      if (segment.isInit) {
        // smooth init segments are crafted by hand. Their timescale is the one
        // from the manifest.
        const segmentInfos = {
          timescale: segment.timescale,
          time: -1,
          duration: 0,
        };
        return Observable.of({ segmentData: responseData, segmentInfos });
      }

      const responseBuffer = new Uint8Array(responseData);
      const { nextSegments, segmentInfos } =
        extractTimingsInfos(responseBuffer, segment, manifest.isLive);
      const segmentData = patchSegment(responseBuffer, segmentInfos.time);
      return Observable.of({ segmentData, segmentInfos, nextSegments });
    },
  };

  const textTrackPipeline = {
    loader({ segment, representation }) {
      if (segment.isInit) {
        return Observable.empty();
      }

      const { mimeType } = representation;
      const base = resolveURL(representation.baseURL);
      const url = buildSegmentURL(base, representation, segment);

      if (mimeType.indexOf("mp4") >= 0) {
        // in case of TTML declared inside playlists, the TTML file is
        // embededded inside an mp4 fragment.
        return parsedRequest({ url, responseType: "arraybuffer" });
      } else {
        return parsedRequest({ url, responseType: "text" });
      }
    },

    parser({ response, segment, representation, adaptation, manifest }) {
      const { language } = adaptation;
      const { mimeType } = representation;

      const ttParser = TT_PARSERS[mimeType];
      if (!ttParser) {
        throw new Error(
          `could not find a text-track parser for the type ${mimeType}`
        );
      }

      let responseData = response.responseData;
      let text;
      // in case of TTML declared inside playlists, the TTML file is
      // embededded inside an mp4 fragment.
      if (mimeType.indexOf("mp4") >= 0) {
        responseData = new Uint8Array(responseData);
        text = bytesToStr(getMdat(responseData));
      } else {
        // vod is simple WebVTT or TTML text
        text = responseData;
      }

      const { nextSegments, segmentInfos } =
        extractTimingsInfos(responseData, segment, manifest.isLive);
      const segmentData =
        ttParser(text, language, segment.time / segment.timescale);

      return Observable.of({ segmentData, segmentInfos, nextSegments });
    },
  };

  const imageTrackPipeline = {
    loader({ segment, representation }) {
      if (segment.isInit) {
        return Observable.empty();
      } else {
        const baseURL = resolveURL(representation.baseURL);
        const url = buildSegmentURL(baseURL, representation, segment);
        return parsedRequest({ url, responseType: "arraybuffer" });
      }
    },

    parser({ response }) {
      const responseData = response.responseData;
      const blob = new Uint8Array(responseData);

      const segmentInfos = {
        time: 0,
        duration: Number.MAX_VALUE,
      };

      let segmentData;
      if (blob) {
        const bif = parseBif(blob);
        segmentData = bif.thumbs;
        segmentInfos.timescale = bif.timescale;

        // var firstThumb = blob[0];
        // var lastThumb  = blob[blob.length - 1];

        // segmentInfos = {
        //   time: firstThumb.ts,
        //   duration: lastThumb.ts
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
