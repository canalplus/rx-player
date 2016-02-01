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

function replaceTokens(path, segment) {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    var rep = segment.getRepresentation();
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g, rep.id)
      .replace(/\$Bandwidth\$/g, rep.bitrate)
      .replace(/\$Number\$/g, segment.getNumber())
      .replace(/\$Time\$/g, segment.getTime());
  }
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
    loader({ segment }) {
      var media = segment.getMedia();
      var range = segment.getRange();
      var indexRange = segment.getIndexRange();

      // init segment without initialization media/range/indexRange:
      // we do nothing on the network
      if (segment.isInitSegment() && !(media || range || indexRange)) {
        return empty();
      }

      var mediaHeaders;
      if (range) {
        mediaHeaders = { "Range": byteRange(range) };
      } else {
        mediaHeaders = null;
      }

      var path;
      if (media) {
        path = replaceTokens(media, segment);
      } else {
        path = "";
      }

      var mediaUrl = resolveURL(segment.getResolvedURL(), path);
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
      if (indexRange) {
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

    parser({ segment, response }) {
      var blob = new Uint8Array(response.blob);

      // added segments and timescale informations are extracted from
      // sidx atom
      var nextSegments, timescale, currentSegment;

      // added index (segments and timescale) informations are
      // extracted from sidx atom
      var indexRange = segment.getIndexRange();
      var index = parseSidx(blob, indexRange ? indexRange[0] : 0);
      if (index) {
        nextSegments = index.segments;
        timescale = index.timescale;
      }

      if (!segment.isInitSegment()) {
        // current segment information may originate from the index
        // itself in which case we don't have to use the index
        // segments.
        if (segment.getTime() >= 0 &&
            segment.getDuration() >= 0) {
          currentSegment = {
            ts: segment.getTime(),
            d: segment.getDuration(),
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

      if (segment.isInitSegment()) {
        var adaptation = segment.getAdaptatation();
        if (adaptation.contentProtection) {
          blob = patchPssh(blob, adaptation.contentProtection);
        }
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
    loader(/* { segment } */) {
    },
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
  };
};
