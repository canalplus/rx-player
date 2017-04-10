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
const { merge } = require("rxjs/observable/merge");
const assert = require("../../utils/assert");
const { resolveURL } = require("../../utils/url");
const { parseSidx, patchPssh, getMdat } = require("./mp4");
const { bytesToStr } = require("../../utils/bytes.js");

const request = require("../../request");
const dashManifestParser = require("./manifest");

const { parseTTML } = require("../parsers/texttracks/ttml.js");

/**
 * Pad with 0 in the left of the given n argument to reach l length
 * @param {Number|string} n
 * @param {Number} l
 * @returns {string}
 */
function pad(n, l) {
  n = n.toString();
  if (n.length >= l) {
    return n;
  }
  const arr = new Array(l + 1).join("0") + n;
  return arr.slice(-l);
}

/**
 * Returns text-formatted byteRange (`bytes=$start-$end?)`
 * @param {Array.<string|Number>}
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
 * Add formatting when asked in a token (add padding to numbers).
 * @param {string|Number} replacer - the token value
 * @returns {Function} - @see replaceTokens
 */
function processFormatedToken(replacer) {
  return (match, format, widthStr) => {
    const width = widthStr ? parseInt(widthStr, 10) : 1;
    return pad(""+replacer, width);
  };
}

/**
 * Replace "tokens" written in a given path (e.g. $Time$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {Segment} segment
 * @returns {string}
 */
function replaceTokens(path, segment) {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    const rep = segment.getRepresentation();
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g, rep.id)
      .replace(/\$Bandwidth(|\%0(\d+)d)\$/g, processFormatedToken(rep.bitrate))
      .replace(/\$Number(|\%0(\d+)d)\$/g, processFormatedToken(segment.getNumber()))
      .replace(/\$Time(|\%0(\d+)d)\$/g, processFormatedToken(segment.getTime()));
  }
}

/**
 * Returns true if the given texttrack segment represents a textrack embedded
 * in a mp4 file.
 * @param {Segment} segment - __TextTrack__ segment
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(segment) {
  return segment.getRepresentation().mimeType === "application/mp4";
}

/**
 * Returns pipelines used for DASH streaming.
 * @param {Object} opts
 * @param {Function} [opts.createXHR] - Optional custom XMLHttpRequest
 * implementation. Used for each generated http request.
 * @param {Function} [opts.contentProtectionParser] - Optional parser for the
 * manifest's content Protection.
 * @returns {Object}
 */
module.exports = function(opts={}) {
  let { contentProtectionParser } = opts;

  if (!contentProtectionParser) {
    contentProtectionParser = () => {};
  }

  const createXHR = opts.createXHR;

  const manifestPipeline = {
    loader({ url }) {
      return request({
        url,
        responseType: "document",
        createXHR,
      });
    },

    parser({ response }) {
      const data = response.responseData;
      return Observable.of({
        manifest: dashManifestParser(data, contentProtectionParser),
        url: response.url,
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

      const path = media ?
        replaceTokens(media, segment) : "";

      const mediaUrl = resolveURL(segment.getResolvedURL(), path);

      // fire a single time contiguous init and index ranges.
      if (
        range && indexRange &&
        range[1] === indexRange[0] - 1
      ) {
        return request({
          url: mediaUrl,
          responseType: "arraybuffer",
          headers: {
            Range: byteRange([range[0], indexRange[1]]),
          },
          createXHR,
        });
      }

      const mediaHeaders = range ?
        { "Range": byteRange(range) } : null;

      const mediaOrInitRequest = request({
        url: mediaUrl,
        responseType: "arraybuffer",
        headers: mediaHeaders,
        createXHR,
      });

      // If init segment has indexRange metadata, we need to fetch
      // both the initialization data and the index metadata. We do
      // this in parallel and send the both blobs into the pipeline.
      if (indexRange) {
        const indexRequest = request({
          url: mediaUrl,
          responseType: "arraybuffer",
          headers: { "Range": byteRange(indexRange) },
          createXHR,
        });
        return merge(mediaOrInitRequest, indexRequest);
      }
      else {
        return mediaOrInitRequest;
      }
    },

    parser({ segment, response }) {
      const responseData = new Uint8Array(response.responseData);

      // added segments and timescale informations are extracted from
      // sidx atom
      let nextSegments, timescale, currentSegment;

      // added index (segments and timescale) informations are
      // extracted from sidx atom
      const indexRange = segment.getIndexRange();
      const index = parseSidx(responseData, indexRange ? indexRange[0] : 0);
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

      let segmentData = responseData;
      if (segment.isInitSegment()) {
        const adaptation = segment.getAdaptation();
        if (adaptation.contentProtection) {
          segmentData = patchPssh(responseData, adaptation.contentProtection);
        }
      }

      return Observable.of({
        segmentData,
        currentSegment,
        nextSegments,
        timescale,
      });
    },
  };

  const textTrackPipeline = {
    // TODO DRY this (code too similar to segmentPipeline)
    loader({ segment }) {
      const media = segment.getMedia();
      const range = segment.getRange();
      const indexRange = segment.getIndexRange();

      const responseType = isMP4EmbeddedTrack(segment) >= 0 ?
        "arraybuffer" : "text";

      // init segment without initialization media/range/indexRange:
      // we do nothing on the network
      if (segment.isInitSegment() && !(media || range || indexRange)) {
        return empty();
      }

      const path = media ?
        replaceTokens(media, segment) : "";

      const mediaUrl = resolveURL(segment.getResolvedURL(), path);

      // fire a single time contiguous init and index ranges.
      if (
        range && indexRange &&
        range[1] === indexRange[0] - 1
      ) {
        return request({
          url: mediaUrl,
          responseType,
          headers: {
            Range: byteRange([range[0], indexRange[1]]),
          },
          createXHR,
        });
      }

      const mediaOrInitRequest = request({
        url: mediaUrl,
        responseType,
        headers: range ? {
          Range: byteRange(range),
        } : null,
        createXHR,
      });

      // If init segment has indexRange metadata, we need to fetch
      // both the initialization data and the index metadata. We do
      // this in parallel and send the both blobs into the pipeline.
      if (indexRange) {
        const indexRequest = request({
          url: mediaUrl,
          responseType,
          headers: {
            Range: byteRange(indexRange),
          },
          createXHR,
        });
        return merge(mediaOrInitRequest, indexRequest);
      }
      else {
        return mediaOrInitRequest;
      }
    },

    parser({ segment, response }) {
      const { lang } = segment.getAdaptation();
      // const { index: representationIndex } = segment.getRepresentation();

      let responseData;
      let text;

      if (isMP4EmbeddedTrack(segment)) {
        responseData = new Uint8Array(response.responseData);
        text = bytesToStr(getMdat(responseData));
      } else {
        responseData = response.responseData;
        text = responseData;
      }

      // added segments and timescale informations are extracted from
      // sidx atom
      let nextSegments, timescale, currentSegment;

      // added index (segments and timescale) informations are
      // extracted from sidx atom
      const indexRange = segment.getIndexRange();
      const index = parseSidx(responseData, indexRange ? indexRange[0] : 0);
      if (index) {
        nextSegments = index.segments;
        timescale = index.timescale;
      }

      let segmentData = [];

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

        // const timescale = (index && index.timescale) ||
        //   representationIndex.timescale;

        // TODO check if TTML / webVTT (from codecs)
        segmentData = parseTTML(text, lang, 0);
      }

      return Observable.of({
        segmentData,
        currentSegment,
        nextSegments,
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
  };
};
