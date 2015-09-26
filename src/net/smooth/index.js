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

var { Observable } = require("rxjs");
var { empty } = Observable;
var request = require("canal-js-utils/rx-request");
var { resolveURL } = require("canal-js-utils/url");
var { bytesToStr } = require("canal-js-utils/bytes");
var log = require("canal-js-utils/log");

var createSmoothStreamingParser = require("./parser");

var {
  patchSegment,
  createVideoInitSegment,
  createAudioInitSegment,
  getMdat,
  getTraf,
  parseTfrf,
  parseTfxd
} = require("./mp4");

var { parseSami } = require("./tt-sami");
var { parseTTML } = require("./tt-ttml");
var TT_PARSERS = {
  "application/x-sami":       parseSami,
  "application/smil":         parseSami,
  "application/ttml+xml":     parseTTML,
  "application/ttml+xml+mp4": parseTTML,
  "text/vtt":                 (text) => text,
};

var ISM_REG = /\.(isml?)(\?token=\S+)?$/;
var WSX_REG = /\.wsx?(\?token=\S+)?/;
var TOKEN_REG = /\?token=(\S+)/;

function byteRange([start, end]) {
  if (!end || end === Infinity) {
    return "bytes=" + (+start) + "-";
  } else {
    return "bytes=" + (+start) + "-" + (+end);
  }
}

function extractISML(doc) {
  return doc.getElementsByTagName("media")[0].getAttribute("src");
}

function extractToken(url) {
  var tokenMatch = url.match(TOKEN_REG);
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
  var ismMatch = url.match(ISM_REG);
  if (ismMatch) {
    return url.replace(ismMatch[1], ismMatch[1] + "/manifest");
  } else {
    return url;
  }
}

function buildSegmentURL(adaptation, representation, segment) {
  return resolveURL(adaptation.rootURL, adaptation.baseURL, representation.baseURL)
    .replace(/\{bitrate\}/g, representation.bitrate)
    .replace(/\{start time\}/g, segment.time);
}

var req = reqOptions => {
  reqOptions.withMetadata = true;
  return request(reqOptions);
};

module.exports = function(options={}) {
  var smoothManifestParser = createSmoothStreamingParser(options);

  var manifestPipeline = {
    resolver({ url }) {
      var resolving;
      var token = extractToken(url);

      if (WSX_REG.test(url)) {
        resolving = req({
          url: replaceToken(url, ""),
          format: "document"
        }).map(({ blob }) => extractISML(blob));
      }
      else {
        resolving = Observable.of(url);
      }

      return resolving
        .map(url => ({ url: replaceToken(resolveManifest(url), token) }));
    },
    loader({ url }) {
      return req({ url, format: "document" });
    },
    parser({ response }) {
      return Observable.of({
        manifest: smoothManifestParser(response.blob),
        url:      response.url,
      });
    },
  };

  function extractTimingsInfos(blob, adaptation, segment) {
    var nextSegments;
    var currentSegment;

    if (adaptation.isLive) {
      var traf = getTraf(blob);
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

  var segmentPipeline = {
    loader({ adaptation, representation, segment }) {
      if (segment.init) {
        var blob;
        var protection = adaptation.smoothProtection || {};
        switch(adaptation.type) {
        case "video": blob = createVideoInitSegment(
          representation.index.timescale,
          representation.width,
          representation.height,
          72, 72, 4, // vRes, hRes, nal
          representation.codecPrivateData,
          protection.keyId,     // keyId
          protection.keySystems // pssList
        ); break;
        case "audio": blob = createAudioInitSegment(
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

        return Observable.of({ blob, size: blob.length, duration: 100 });
      }
      else {
        var headers;

        var range = segment.range;
        if (range) {
          headers = { "Range": byteRange(range) };
        }

        var url = buildSegmentURL(adaptation, representation, segment);
        return req({ url, format: "arraybuffer", headers });
      }
    },
    parser({ adaptation, response, segment }) {
      if (segment.init) {
        return Observable.of({ blob: response.blob, timings: null });
      }

      var blob = new Uint8Array(response.blob);
      var { nextSegments, currentSegment } = extractTimingsInfos(blob, adaptation, segment);

      return Observable.of({
        blob: patchSegment(blob, currentSegment.ts),
        nextSegments,
        currentSegment,
      });
    },
  };

  var textTrackPipeline = {
    loader({ adaptation, representation, segment }) {
      if (segment.init)
        return empty();

      var mimeType = representation.mimeType;
      var url = buildSegmentURL(adaptation, representation, segment);

      if (mimeType.indexOf("mp4") >= 0) {
        // in case of TTML declared inside
        // playlists, the TTML file is embededded
        // inside an mp4 fragment.
        return req({ url, format: "arraybuffer" });
      } else {
        return req({ url, format: "text" });
      }
    },
    parser({ response, adaptation, representation, segment }) {
      var { lang } = adaptation;
      var mimeType = representation.mimeType;
      var parser_ = TT_PARSERS[mimeType];
      if (!parser_) {
        throw new Error(`smooth: could not find a text-track parser for the type ${mimeType}`);
      }

      var blob = response.blob;
      var text;
      // in case of TTML declared inside playlists, the TTML file is
      // embededded inside an mp4 fragment.
      if (mimeType.indexOf("mp4") >= 0) {
        blob = new Uint8Array(blob);
        text = bytesToStr(getMdat(blob));
      } else {
        // vod is simple WebVTT or TTML text
        text = blob;
      }

      var { nextSegments, currentSegment } = extractTimingsInfos(blob, adaptation, segment);

      return Observable.of({
        blob: parser_(text, lang, segment.time / representation.index.timescale),
        currentSegment,
        nextSegments,
      });
    },
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
  };
};
