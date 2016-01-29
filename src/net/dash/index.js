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
var { empty, merge } = Observable;
var assert = require("canal-js-utils/assert");
var request = require("canal-js-utils/rx-request");
var { resolveURL } = require("canal-js-utils/url");
var { parseSidx, patchPssh } = require("./mp4");

var dashManifestParser = require("./parser");

function byteRange([start, end]) {
  if (!end || end === Infinity) {
    return "bytes=" + (+start) + "-";
  } else {
    return "bytes=" + (+start) + "-" + (+end);
  }
}

function replaceTokens(path, representation, time, number) {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g, representation.id)
      .replace(/\$Bandwidth\$/g, representation.bitrate)
      .replace(/\$Number\$/g, number)
      .replace(/\$Time\$/g, time);
  }
}

function createURL(adaptation, representation, path) {
  return resolveURL(
    adaptation.rootURL,
    adaptation.baseURL,
    representation.baseURL,
    path
  );
}

var req = reqOptions => {
  reqOptions.withMetadata = true;
  return request(reqOptions);
};

module.exports = function(opts={}) {
  var { contentProtectionParser } = opts;

  if (!contentProtectionParser) contentProtectionParser = () => {};

  var manifestPipeline = {
    loader({ url }) {
      return req({ url, format: "document" });
    },
    parser({ response }) {
      return Observable.of({
        manifest: dashManifestParser(response.blob, contentProtectionParser),
        url:      response.url,
      });
    },
  };

  var segmentPipeline = {
    loader({ adaptation, representation, segment }) {
      var { init, media, range, indexRange } = segment;

      // init segment without initialization media/range/indexRange:
      // we do nothing on the network
      if (init && !(media || range || indexRange)) {
        return empty();
      }

      var mediaHeaders;
      if (Array.isArray(range)) {
        mediaHeaders = { "Range": byteRange(range) };
      } else {
        mediaHeaders = null;
      }

      var path;
      if (media) {
        path = replaceTokens(media, representation, segment.time, segment.number);
      } else {
        path = "";
      }

      var mediaUrl = createURL(adaptation, representation, path);
      var mediaOrInitRequest = req({
        url: mediaUrl,
        format: "arraybuffer",
        headers: mediaHeaders,
      });

      // If init segment has indexRange metadata, we need to fetch
      // both the initialization data and the index metadata. We do
      // this in parallel and send the both blobs into the pipeline.
      // TODO(pierre): we could fire both these requests as one if the
      // init and index ranges are contiguous, which should be the
      // case most of the time.
      if (Array.isArray(indexRange)) {
        var indexRequest = req({
          url: mediaUrl,
          format: "arraybuffer",
          headers: { "Range": byteRange(indexRange) },
        });
        return merge(mediaOrInitRequest, indexRequest);
      }
      else {
        return mediaOrInitRequest;
      }
    },
    parser({ adaptation, segment, response }) {
      var blob = new Uint8Array(response.blob);
      var { init, indexRange } = segment;

      // added segments and timescale informations are extracted from
      // sidx atom
      var nextSegments, timescale, currentSegment;

      // added index (segments and timescale) informations are
      // extracted from sidx atom
      var index = parseSidx(blob, indexRange ? indexRange[0] : 0);
      if (index) {
        nextSegments = index.segments;
        timescale = index.timescale;
      }

      if (!init) {
        // current segment information may originate from the index
        // itself in which case we don't have to use the index
        // segments.
        if (segment.time >= 0 && segment.duration >= 0) {
          currentSegment = {
            ts: segment.time,
            d: segment.duration,
          };
        }
        else if (index && index.segments.length === 1) {
          currentSegment = {
            ts: index.segments[0].ts,
            d:  index.segments[0].d,
          };
        }

        if (__DEV__)
          assert(currentSegment);
      }

      if (init && adaptation.contentProtection) {
        blob = patchPssh(blob, adaptation.contentProtection);
      }

      return Observable.of({
        blob,
        currentSegment,
        nextSegments,
        timescale,
      });
    },
  };

  var textTrackPipeline = {
    loader(/* { adaptation, representation, segment } */) {
    },
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
  };
};
