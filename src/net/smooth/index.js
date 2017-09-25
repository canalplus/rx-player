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
import parseBif from "../../parsers/bif";
import parseSAMIToVTT from "../../parsers/texttracks/sami.js";
import parseTTMLToVTT from "../../parsers/texttracks/ttml/ttml_to_vtt.js";

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

function getTextTrackParser(mimeType = "", codec = "") {
  function fromTTMLInMP4(data) {
    const str = stringFromUTF8(getMdat(data));
    return parseTTMLToVTT(str);
  }

  function fromWebVTTInMP4(data) {
    return stringFromUTF8(getMdat(data));
  }

  switch (mimeType) {

  case "application/x-sami":
  case "application/smil":
    return parseSAMIToVTT;

  case "application/ttml+xml":
    return parseTTMLToVTT;

  case "application/ttml+xml+mp4":
    return fromTTMLInMP4;

  case "text/vtt":
    return (text) => text;

  case "application/mp4":
    const lcCodec = codec.toLowerCase();
    if (lcCodec === "stpp") {
      return fromTTMLInMP4;

    } else if (lcCodec === "wvtt") {
      return fromWebVTTInMP4;
    }
  }
}

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
      const {
        mimeType,
        codec,
      } = representation;

      const ttParser = getTextTrackParser(mimeType, codec);
      if (!ttParser) {
        throw new Error(
          `could not find a text-track parser for the type ${mimeType}`
        );
      }

      let responseData = response.responseData;
      let nextSegments, segmentInfos;
      const segmentData = {};

      // in case of TTML declared inside playlists, the TTML file is
      // embededded inside an mp4 fragment.
      if (mimeType.indexOf("mp4") >= 0) {
        responseData = new Uint8Array(responseData);
        const timings =
          extractTimingsInfos(responseData, segment, manifest.isLive);

        nextSegments = timings.nextSegments;
        segmentInfos = timings.segmentInfos;
        segmentData.start = segmentInfos.time;
        segmentData.end = segmentInfos.duration != null ?
          segmentInfos.time + segmentInfos.duration : undefined;
        segmentData.timescale = segmentInfos.timescale;
      } else {
        // vod is simple WebVTT or TTML text
        segmentData.start = segment.time;
        segmentData.end = segment.duration != null ?
          segment.time + segment.duration : undefined;
        segmentData.timescale = segment.timescale;
      }

      segmentData.data =
        ttParser(
          responseData,
          language /* ,
          segment.time / segment.timescale */ // TODO check that one
        );

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
