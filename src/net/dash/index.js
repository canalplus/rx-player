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
const { mergeStatic } = require("rxjs/operator/merge");
const assert = require("canal-js-utils/assert");
const request = require("canal-js-utils/rx-request");
const { resolveURL } = require("canal-js-utils/url");
const { pad } = require("canal-js-utils/misc");
const { parseSidx, patchPssh } = require("./mp4");

const dashManifestParser = require("./parser");

function byteRange([start, end]) {
  if (!end || end === Infinity) {
    return "bytes=" + (+start) + "-";
  } else {
    return "bytes=" + (+start) + "-" + (+end);
  }
}

function procesFormatedToken(replacer) {
  return function(match, format, widthStr) {
    let width = widthStr ? parseInt(widthStr, 10) : 1;
    return pad(replacer, width);
  };
}

function replaceTokens(path, segment) {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    const rep = segment.getRepresentation();
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g, rep.id)
      .replace(/\$Bandwidth(|\%0(\d+)d)\$/g, procesFormatedToken(rep.bitrate))
      .replace(/\$Number(|\%0(\d+)d)\$/g, procesFormatedToken(segment.getNumber()))
      .replace(/\$Time(|\%0(\d+)d)\$/g, procesFormatedToken(segment.getTime()));
  }
}

const req = (reqOptions) => {
  reqOptions.withMetadata = true;
  return request(reqOptions);
};

module.exports = function(opts={}) {
  let { contentProtectionParser } = opts;

  if (!contentProtectionParser) {
    contentProtectionParser = () => {};
  }

  const manifestPipeline = {
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

  const segmentPipeline = {
    loader({ segment }) {
      const media = segment.getMedia();
      const range = segment.getRange();
      const indexRange = segment.getIndexRange();

      // init segment without initialization media/range/indexRange:
      // we do nothing on the network
      if (segment.isInitSegment() && !(media || range || indexRange)) {
        return empty();
      }

      let mediaHeaders;
      if (range) {
        mediaHeaders = { "Range": byteRange(range) };
      } else {
        mediaHeaders = null;
      }

      let path;
      if (media) {
        path = replaceTokens(media, segment);
      } else {
        path = "";
      }

      const mediaUrl = resolveURL(segment.getResolvedURL(), path);
      const mediaOrInitRequest = req({
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
        const indexRequest = req({
          url: mediaUrl,
          format: "arraybuffer",
          headers: { "Range": byteRange(indexRange) },
        });
        return mergeStatic(mediaOrInitRequest, indexRequest);
      }
      else {
        return mediaOrInitRequest;
      }
    },

    parser({ segment, response }) {
      let blob = new Uint8Array(response.blob);

      // added segments and timescale informations are extracted from
      // sidx atom
      let nextSegments, timescale, currentSegment;

      // added index (segments and timescale) informations are
      // extracted from sidx atom
      const indexRange = segment.getIndexRange();
      const index = parseSidx(blob, indexRange ? indexRange[0] : 0);
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

        if (__DEV__) {
          assert(currentSegment);
        }
      }

      if (segment.isInitSegment()) {
        const adaptation = segment.getAdaptatation();
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

  const textTrackPipeline = {
    loader(/* { segment } */) {
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
