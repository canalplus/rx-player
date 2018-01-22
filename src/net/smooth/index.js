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
import { bytesToStr } from "../../utils/bytes";
import log from "../../utils/log";
import { resolveURL } from "../../utils/url";

import request from "../../request";
import createSmoothStreamingParser from "./parser";

import mp4Utils from "./mp4.js";
import { parseBif } from "../parsers/bif";
import { parseSami } from "../parsers/texttracks/sami.js";
import { parseTTML } from "../parsers/texttracks/ttml.js";

const {
  patchSegment,
  createVideoInitSegment,
  createAudioInitSegment,
  getMdat,
  getTraf,
  parseTfrf,
  parseTfxd,
} = mp4Utils;

const TT_PARSERS = {
  "application/x-sami":       parseSami,
  "application/smil":         parseSami,
  "application/ttml+xml":     parseTTML,
  "application/ttml+xml+mp4": parseTTML,
  "text/vtt":                 (text) => text,
};

const { RequestResponse } = request;

const ISM_REG = /\.(isml?)(\?token=\S+)?$/;
const WSX_REG = /\.wsx?(\?token=\S+)?/;
const TOKEN_REG = /\?token=(\S+)/;

/**
 * @param {Array.<Number>} range
 * @returns {string}
 */
function byteRange([start, end]) {
  if (!end || end === Infinity) {
    return "bytes=" + (+start) + "-";
  } else {
    return "bytes=" + (+start) + "-" + (+end);
  }
}

/**
 * @param {Object} response
 * @param {Document} response.responseData
 * @returns {string}
 */
function extractISML({ responseData }) {
  return responseData.getElementsByTagName("media")[0].getAttribute("src");
}

/**
 * Returns string corresponding to the token contained in the url's querystring.
 * Empty string if no token is found.
 * @param {string} url
 * @returns {string}
 */
function extractToken(url) {
  const tokenMatch = url.match(TOKEN_REG);
  return (tokenMatch && tokenMatch[1]) || "";
}

/**
 * Replace/Remove token from the url's querystring
 * @param {string} url
 * @param {string} [token]
 * @returns {string}
 */
function replaceToken(url, token) {
  if (token) {
    return url.replace(TOKEN_REG, "?token=" + token);
  } else {
    return url.replace(TOKEN_REG, "");
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
function resolveManifest(url) {
  const ismMatch = url.match(ISM_REG);
  if (ismMatch) {
    return url.replace(ismMatch[1], ismMatch[1] + "/manifest");
  } else {
    return url;
  }
}

/**
 * @param {Object} [index={}]
 * @returns {number}
 */
function getSegmentTimeOffsetFromIndex(index = {}) {
  // TODO cleaner
  if (!index._index) {
    return 0;
  }

  return index._index.segmentTimeOffset || 0;
}

/**
 * @param {string} url
 * @param {Object} representation
 * @param {Object} segment
 * @returns {string}
 */
function buildSegmentURL(url, representation, segment) {
  const segmentTime = segment.time +
    getSegmentTimeOffsetFromIndex(representation.index);
  return url
    .replace(/\{bitrate\}/g,    representation.bitrate)
    .replace(/\{start time\}/g, segmentTime);
}

export default function(options={}) {
  const smoothManifestParser = createSmoothStreamingParser(options);
  const createXHR = options.createXHR;

  const manifestPipeline = {
    resolver({ url }) {
      let resolving;
      const token = extractToken(url);

      if (WSX_REG.test(url)) {
        resolving = request({
          url: replaceToken(url, ""),
          responseType: "document",
          resultSelector: extractISML,
          createXHR,
        });
      }
      else {
        resolving = Observable.of(url);
      }

      return resolving
        .map((url) => ({ url: replaceToken(resolveManifest(url), token) }));
    },

    loader({ url }) {
      return request({
        url,
        responseType: "document",
        createXHR,
      });
    },

    parser({ response }) {
      return Observable.of({
        manifest: smoothManifestParser(response.responseData),
        url:      response.url,
      });
    },
  };

  function extractTimingsInfos(responseData, segment, isLive) {
    let nextSegments;
    let currentSegment;

    if (isLive) {
      const traf = getTraf(responseData);
      if (traf) {
        nextSegments = parseTfrf(traf);
        currentSegment = parseTfxd(traf);
      } else {
        log.warn("smooth: could not find traf atom");
      }
    } else {
      nextSegments = null;
    }

    if (!currentSegment) {
      currentSegment = {
        d:  segment.duration,
        ts: segment.time,
      };
    }

    return { nextSegments, currentSegment };
  }

  /**
   * Defines the url for the request, load the right loader (custom/default
   * one).
   */
  const segmentPreLoader = ({
    segment,
    representation,
    adaptation,
    manifest,
  }) => {
    if (segment.isInit) {
      let responseData = {};
      const protection = adaptation._smoothProtection || {};

      switch(adaptation.type) {
      case "video":
        responseData = createVideoInitSegment(
          segment.timescale,
          representation.width,
          representation.height,
          72, 72, 4, // vRes, hRes, nal
          representation._codecPrivateData,
          protection.keyId,     // keyId
          protection.keySystems // pssList
        );
        break;
      case "audio":
        responseData = createAudioInitSegment(
          segment.timescale,
          representation._channels,
          representation._bitsPerSample,
          representation._packetSize,
          representation._samplingRate,
          representation._codecPrivateData,
          protection.keyId,     // keyId
          protection.keySystems // pssList
        );
        break;
      }

      return Observable.of(new RequestResponse(
        200,
        "",
        "arraybuffer",
        Date.now() - 100,
        Date.now(),
        responseData.length,
        responseData
      ));
    }
    else {
      const customSegmentLoader = options.segmentLoader;

      const url = buildSegmentURL(
        resolveURL(representation.baseURL),
        representation,
        segment
      );

      const args = {
        adaptation,
        representation,
        segment,
        transport: "smooth",
        url,
        manifest,
      };

      if (!customSegmentLoader) {
        return segmentLoader(args);
      }

      return Observable.create(obs => {
        let hasFinished = false;
        let hasFallbacked = false;

        const resolve = (args = {}) => {
          if (!hasFallbacked) {
            hasFinished = true;
            obs.next({
              responseData: args.data,
              size: args.size || 0,
              duration: args.duration || 0,
            });
            obs.complete();
          }
        };

        const reject = (err = {}) => {
          if (!hasFallbacked) {
            hasFinished = true;
            obs.error(err);
          }
        };

        const fallback = () => {
          hasFallbacked = true;
          segmentLoader(args).subscribe(obs);
        };

        const callbacks = { reject, resolve, fallback };
        const abort = customSegmentLoader(args, callbacks);

        return () => {
          if (!hasFinished && !hasFallbacked && typeof abort === "function") {
            abort();
          }
        };
      });
    }
  };

  const segmentLoader = ({
    url,
    segment,
  }) => {
    let headers;
    const range = segment.range;
    if (range) {
      headers = {
        Range: byteRange(range),
      };
    }
    return request({
      url,
      responseType: "arraybuffer",
      headers,
      createXHR,
    });
  };

  const segmentPipeline = {
    loader({ segment, representation, adaptation, manifest }) {
      return segmentPreLoader({
        segment,
        representation,
        adaptation,
        manifest,
      });
    },

    parser({ segment, response, manifest }) {
      const { responseData } = response;

      if (segment.isInit) {
        return Observable.of({
          segmentData: responseData,
          timings: null,
        });
      }

      const responseBuffer = new Uint8Array(responseData);
      const { nextSegments, currentSegment } =
        extractTimingsInfos(responseBuffer, segment, manifest.isLive);

      const segmentData = patchSegment(responseBuffer, currentSegment.ts);

      return Observable.of({
        segmentData,
        nextSegments,
        currentSegment,
      });
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
        return request({ url, responseType: "arraybuffer", createXHR });
      } else {
        return request({ url, responseType: "text", createXHR });
      }
    },

    parser({ response, segment, representation, adaptation, manifest }) {
      const { language } = adaptation;
      const { mimeType } = representation;

      const ttParser = TT_PARSERS[mimeType];
      if (!ttParser) {
        throw new Error(`could not find a text-track parser for the type ${mimeType}`);
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

      const { nextSegments, currentSegment } =
        extractTimingsInfos(responseData, segment, manifest.isLive);
      const segmentData =
        ttParser(text, language, segment.time / segment.timescale);

      return Observable.of({
        segmentData,
        currentSegment,
        nextSegments,
      });
    },
  };

  const imageTrackPipeline = {
    loader({ segment, representation }) {
      if (segment.isInit) {
        return Observable.empty();
      } else {
        const baseURL = resolveURL(representation.baseURL);
        const url = buildSegmentURL(baseURL, representation, segment);
        return request({ url, responseType: "arraybuffer", createXHR });
      }
    },

    parser({ response }) {
      const responseData = response.responseData;
      const blob = new Uint8Array(responseData);

      const currentSegment = {
        ts: 0,
        d:  Infinity,
      };

      let segmentData, timescale;
      if (blob) {
        const bif = parseBif(blob);
        segmentData = bif.thumbs;
        timescale   = bif.timescale;

        // var firstThumb = blob[0];
        // var lastThumb  = blob[blob.length - 1];

        // currentSegment = {
        //   ts: firstThumb.ts,
        //   d:  lastThumb.ts
        // };
      }

      return Observable.of({
        segmentData,
        currentSegment,
        timescale,
      });
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
