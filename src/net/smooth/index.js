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

const { Observable } = require("rxjs/Observable");
const empty = require("rxjs/observable/EmptyObservable").EmptyObservable.create;
const { bytesToStr } = require("../../utils/bytes");
const log = require("../../utils/log");

const request = require("../../request");
const { RequestResponse } = request;
const createSmoothStreamingParser = require("./parser");

const {
  patchSegment,
  createVideoInitSegment,
  createAudioInitSegment,
  getMdat,
  getTraf,
  parseTfrf,
  parseTfxd,
} = require("./mp4");

const {
  parseBif,
} = require("../bif");

const { parseSami } = require("./tt-sami");
const { parseTTML } = require("./tt-ttml");
const TT_PARSERS = {
  "application/x-sami":       parseSami,
  "application/smil":         parseSami,
  "application/ttml+xml":     parseTTML,
  "application/ttml+xml+mp4": parseTTML,
  "text/vtt":                 (text) => text,
};

const ISM_REG = /\.(isml?)(\?token=\S+)?$/;
const WSX_REG = /\.wsx?(\?token=\S+)?/;
const TOKEN_REG = /\?token=(\S+)/;

function byteRange([start, end]) {
  if (!end || end === Infinity) {
    return "bytes=" + (+start) + "-";
  } else {
    return "bytes=" + (+start) + "-" + (+end);
  }
}

function extractISML({ responseData }) {
  return responseData.getElementsByTagName("media")[0].getAttribute("src");
}

function extractToken(url) {
  const tokenMatch = url.match(TOKEN_REG);
  return (tokenMatch && tokenMatch[1]) || "";
}

function replaceToken(url, token) {
  if (token) {
    return url.replace(TOKEN_REG, "?token=" + token);
  } else {
    return url.replace(TOKEN_REG, "");
  }
}

function resolveManifest(url) {
  const ismMatch = url.match(ISM_REG);
  if (ismMatch) {
    return url.replace(ismMatch[1], ismMatch[1] + "/manifest");
  } else {
    return url;
  }
}

function buildSegmentURL(segment) {
  return segment.getResolvedURL()
    .replace(/\{bitrate\}/g,    segment.getRepresentation().bitrate)
    .replace(/\{start time\}/g, segment.getTime());
}

module.exports = function(options={}) {
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

  function extractTimingsInfos(responseData, segment) {
    let nextSegments;
    let currentSegment;

    if (segment.getAdaptation().isLive) {
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
        d:  segment.getDuration(),
        ts: segment.getTime(),
      };
    }

    return { nextSegments, currentSegment };
  }

  const segmentPipeline = {
    loader({ segment }) {
      if (segment.isInitSegment()) {
        const adaptation = segment.getAdaptation();
        const representation = segment.getRepresentation();

        let responseData;
        const protection = adaptation.smoothProtection || {};
        switch(adaptation.type) {
        case "video": responseData = createVideoInitSegment(
          representation.index.timescale,
          representation.width,
          representation.height,
          72, 72, 4, // vRes, hRes, nal
          representation.codecPrivateData,
          protection.keyId,     // keyId
          protection.keySystems // pssList
        ); break;
        case "audio": responseData = createAudioInitSegment(
          representation.index.timescale,
          representation.channels,
          representation.bitsPerSample,
          representation.packetSize,
          representation.samplingRate,
          representation.codecPrivateData,
          protection.keyId,     // keyId
          protection.keySystems // pssList
        ); break;
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
        let headers;

        const range = segment.getRange();
        if (range) {
          headers = { "Range": byteRange(range) };
        }

        const url = buildSegmentURL(segment);
        return request({
          url,
          responseType: "arraybuffer",
          headers,
          createXHR,
        });
      }
    },

    parser({ segment, response }) {
      const { responseData } = response;

      if (segment.isInitSegment()) {
        return Observable.of({
          segmentData: responseData,
          timings: null,
        });
      }

      const responseBuffer = new Uint8Array(responseData);
      const { nextSegments, currentSegment } = extractTimingsInfos(responseBuffer, segment);

      const segmentData = patchSegment(responseBuffer, currentSegment.ts);

      return Observable.of({
        segmentData,
        nextSegments,
        currentSegment,
      });
    },
  };

  const textTrackPipeline = {
    loader({ segment }) {
      if (segment.isInitSegment()) {
        return empty();
      }

      const { mimeType } = segment.getRepresentation();
      const url = buildSegmentURL(segment);

      if (mimeType.indexOf("mp4") >= 0) {
        // in case of TTML declared inside playlists, the TTML file is
        // embededded inside an mp4 fragment.
        return request({ url, responseType: "arraybuffer", createXHR });
      } else {
        return request({ url, responseType: "text", createXHR });
      }
    },

    parser({ response, segment }) {
      const { lang } = segment.getAdaptation();
      const { mimeType, index } = segment.getRepresentation();
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

      const { nextSegments, currentSegment } = extractTimingsInfos(responseData, segment);
      const segmentData = ttParser(text, lang, segment.getTime() / index.timescale);

      return Observable.of({
        segmentData,
        currentSegment,
        nextSegments,
      });
    },
  };

  const imageTrackPipeline = {
    loader({ segment }) {
      if (segment.init) {
        return empty();
      } else {
        const url = buildSegmentURL(segment);
        return request({ url, responseType: "arraybuffer", createXHR });
      }
    },
    parser({ response /*, adaptation, representation, segment */ }) {
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
};
