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
import { stringFromUTF8 } from "../../utils/strings.js";
import request from "../../utils/request";

import createHSSManifestParser from "./parser";
import parseBif from "../../parsers/images/bif.js";

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

const WSX_REG = /\.wsx?(\?token=\S+)?/;

export default function(options={}) {
  const smoothManifestParser = createHSSManifestParser(options);
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

      return parsedRequest({
        url,
        responseType: mimeType.indexOf("mp4") >= 0 ?
          "arraybuffer" : "text",
      });
    },

    parser({ response, segment, representation, adaptation, manifest }) {
      const { language } = adaptation;
      const {
        mimeType = "",
        codec = "",
      } = representation;

      let responseData = response.responseData;
      let nextSegments, segmentInfos;
      const segmentData = { language };
      const isMP4 = mimeType.indexOf("mp4") >= 0;

      if (isMP4) {
        responseData = new Uint8Array(responseData);
        const timings =
          extractTimingsInfos(responseData, segment, manifest.isLive);

        nextSegments = timings.nextSegments;
        segmentInfos = timings.segmentInfos || {};
        segmentData.start = segmentInfos.time;
        segmentData.end = segmentInfos.duration != null ?
          segmentInfos.time + segmentInfos.duration : undefined;
        segmentData.timescale = segmentInfos.timescale;
        segmentData.timeOffset = segmentData.start / segmentData.timescale;
      } else {
        // vod is simple WebVTT or TTML text
        segmentData.start = segment.time;
        segmentData.end = segment.duration != null ?
          segment.time + segment.duration : undefined;
        segmentData.timescale = segment.timescale;
        segmentData.timeOffset = segmentData.start / segmentData.timescale;
      }

      if (isMP4) {
        const lcCodec = codec.toLowerCase();
        if (mimeType === "application/ttml+xml+mp4" || lcCodec === "stpp") {
          segmentData.type = "ttml";
        } else if (lcCodec === "wvtt") {
          segmentData.type = "vtt";
        } else {
          throw new Error(
            `could not find a text-track parser for the type ${mimeType}`);
        }
        segmentData.data = stringFromUTF8(getMdat(responseData));
      } else {
        switch (mimeType) {
          case "application/x-sami":
          case "application/smil": // TODO SMIL should be its own format, no?
            segmentData.type = "sami";
            break;
          case "application/ttml+xml":
            segmentData.type = "ttml";
            break;
          case "text/vtt":
            segmentData.type = "vtt";
            break;
        }
        if (!segmentData.type) {
          const lcCodec = codec.toLowerCase();
          if (lcCodec === "srt") {
            segmentData.type = "srt";
          } else {
            throw new Error(
              `could not find a text-track parser for the type ${mimeType}`);
          }
        }
        segmentData.data = responseData;
      }

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
