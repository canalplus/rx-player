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
const request = require("canal-js-utils/rx-request");
const { bytesToStr } = require("canal-js-utils/bytes");
const log = require("canal-js-utils/log");

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

function extractISML(doc) {
  return doc.getElementsByTagName("media")[0].getAttribute("src");
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

const req = (reqOptions) => {
  reqOptions.withMetadata = true;
  return request(reqOptions);
};

module.exports = function(options={}) {
  const smoothManifestParser = createSmoothStreamingParser(options);

  const manifestPipeline = {
    resolver({ url }) {
      let resolving;
      const token = extractToken(url);

      if (WSX_REG.test(url)) {
        resolving = req({
          url: replaceToken(url, ""),
          format: "document",
        }).map(({ blob }) => extractISML(blob));
      }
      else {
        resolving = Observable.of(url);
      }

      return resolving
        .map((url) => ({ url: replaceToken(resolveManifest(url), token) }));
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

  function extractTimingsInfos(blob, segment) {
    let nextSegments;
    let currentSegment;

    if (segment.getAdaptation().isLive) {
      const traf = getTraf(blob);
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

        let blob;
        const protection = adaptation.smoothProtection || {};
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
        let headers;

        const range = segment.getRange();
        if (range) {
          headers = { "Range": byteRange(range) };
        }

        const url = buildSegmentURL(segment);
        return req({ url, format: "arraybuffer", headers });
      }
    },

    parser({ segment, response }) {
      if (segment.isInitSegment()) {
        return Observable.of({ blob: response.blob, timings: null });
      }

      const blob = new Uint8Array(response.blob);
      const { nextSegments, currentSegment } = extractTimingsInfos(blob, segment);

      return Observable.of({
        blob: patchSegment(blob, currentSegment.ts),
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
        // in case of TTML declared inside
        // playlists, the TTML file is embededded
        // inside an mp4 fragment.
        return req({ url, format: "arraybuffer" });
      } else {
        return req({ url, format: "text" });
      }
    },

    parser({ response, segment }) {
      const { lang } = segment.getAdaptation();
      const { mimeType, index } = segment.getRepresentation();
      const parser_ = TT_PARSERS[mimeType];
      if (!parser_) {
        throw new Error(`smooth: could not find a text-track parser for the type ${mimeType}`);
      }

      let blob = response.blob;
      let text;
      // in case of TTML declared inside playlists, the TTML file is
      // embededded inside an mp4 fragment.
      if (mimeType.indexOf("mp4") >= 0) {
        blob = new Uint8Array(blob);
        text = bytesToStr(getMdat(blob));
      } else {
        // vod is simple WebVTT or TTML text
        text = blob;
      }

      const { nextSegments, currentSegment } = extractTimingsInfos(blob, segment);

      return Observable.of({
        blob: parser_(text, lang, segment.getTime() / index.timescale),
        currentSegment,
        nextSegments,
      });
    },
  };

  return {
    directFile: false,
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
  };
};
