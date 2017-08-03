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
import { EmptyObservable } from "rxjs/observable/EmptyObservable";
import { merge } from "rxjs/observable/merge";
import log from "../../utils/log";
import assert from "../../utils/assert";
import { resolveURL } from "../../utils/url";
import { parseSidx, patchPssh, getMdat } from "./mp4";
import { bytesToStr } from "../../utils/bytes.js";

import request from "../../utils/request";
import dashManifestParser from "./manifest";

import { parseTTML } from "../../parsers/texttracks/ttml.js";
import { parseBif } from "../../parsers/bif.js";

const empty = EmptyObservable.create;

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
function replaceTokens(path, segment, representation) {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g,
        representation.id)
      .replace(/\$Bandwidth(|\%0(\d+)d)\$/g,
        processFormatedToken(representation.bitrate))
      .replace(/\$Number(|\%0(\d+)d)\$/g,
        processFormatedToken(segment.number))
      .replace(/\$Time(|\%0(\d+)d)\$/g,
        processFormatedToken(segment.time));
  }
}

/**
 * Returns true if the given texttrack segment represents a textrack embedded
 * in a mp4 file.
 * @param {Segment} segment - __TextTrack__ segment
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(representation) {
  return representation.mimeType === "application/mp4";
}

function mapRequestResponses({ type, value }) {
  if (type === "response") {
    return {
      type: "response",
      value: {
        responseData: value.responseData,
        size: value.size,
        duration: value.receivedTime - value.sentTime,
        url: value.url,
      },
    };
  }

  return {
    type: "progress",
    value: {
      size: value.loadedSize,
      totalSize: value.totalSize,
      duration: value.currentTime - value.sentTime,
      url: value.url,
    },
  };
}

const parsedRequest = requestData =>
  request(requestData).map(mapRequestResponses);

/**
 * Returns pipelines used for DASH streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @param {Function} [options.contentProtectionParser] - Optional parser for the
 * manifest's content Protection.
 * @returns {Object}
 */
export default function(options={}) {
  let { contentProtectionParser } = options;

  if (!contentProtectionParser) {
    contentProtectionParser = () => {};
  }

  const segmentLoader = ({
    url,
    segment,
  }) => {
    const { range, indexRange } = segment;

    // fire a single time contiguous init and index ranges.
    if (
      range && indexRange &&
      range[1] === indexRange[0] - 1
    ) {
      return parsedRequest({
        url: url,
        responseType: "arraybuffer",
        headers: {
          Range: byteRange([range[0], indexRange[1]]),
        },
      });
    }

    const mediaHeaders = range ?
      { "Range": byteRange(range) } : null;

    const mediaOrInitRequest = parsedRequest({
      url: url,
      responseType: "arraybuffer",
      headers: mediaHeaders,
    });

    // If init segment has indexRange metadata, we need to fetch
    // both the initialization data and the index metadata. We do
    // this in parallel and send the both blobs into the pipeline.
    if (indexRange) {
      const indexRequest = parsedRequest({
        url: url,
        responseType: "arraybuffer",
        headers: { "Range": byteRange(indexRange) },
      });
      return merge(mediaOrInitRequest, indexRequest);
    }
    else {
      return mediaOrInitRequest;
    }
  };

  const segmentPreLoader = ({
    segment,
    adaptation,
    representation,
    manifest,
  }) => {
    const {
      media,
      range,
      indexRange,
      isInit,
    } = segment;

    // init segment without initialization media/range/indexRange:
    // we do nothing on the network
    if (isInit && !(media || range || indexRange)) {
      return empty();
    }

    // TODO add get helper
    const customSegmentLoader = options.segmentLoader;

    const path = media ?
      replaceTokens(media, segment, representation) : "";

    const url = resolveURL(representation.baseURL, path);

    const args = {
      adaptation,
      representation,
      manifest,
      segment,
      transport: "dash",
      url,
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
  };

  const manifestPipeline = {
    loader({ url }) {
      return parsedRequest({
        url,
        responseType: "document",
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
    loader({ segment, representation, adaptation, manifest }) {
      return segmentPreLoader({
        segment,
        representation,
        adaptation,
        manifest,
      });
    },

    parser({ segment, adaptation, response }) {
      const responseData = new Uint8Array(response.responseData);

      // added segments and timescale informations are extracted from
      // sidx atom
      let nextSegments, timescale, currentSegment;

      // added index (segments and timescale) informations are
      // extracted from sidx atom
      const indexRange = segment.indexRange;
      const isInit = segment.isInit;
      const index = parseSidx(responseData, indexRange ? indexRange[0] : 0);
      if (index) {
        nextSegments = index.segments;
        timescale = index.timescale;
      }

      if (!isInit) {
        // current segment information may originate from the index
        // itself in which case we don't have to use the index
        // segments.
        if (segment.time >= 0 &&
            segment.duration >= 0) {
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

        if (__DEV__) {
          assert(currentSegment);
        }
      }

      let segmentData = responseData;
      if (isInit) {
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
    loader({ segment, representation }) {
      const {
        media,
        range,
        indexRange,
        isInit,
      } = segment;

      const responseType = isMP4EmbeddedTrack(representation) >= 0 ?
        "arraybuffer" : "text";

      // init segment without initialization media/range/indexRange:
      // we do nothing on the network
      if (isInit && !(media || range || indexRange)) {
        return empty();
      }

      const path = media ?
        replaceTokens(media, segment, representation) : "";

      const mediaUrl = resolveURL(representation.baseURL, path);

      // fire a single time contiguous init and index ranges.
      if (
        range && indexRange &&
        range[1] === indexRange[0] - 1
      ) {
        return parsedRequest({
          url: mediaUrl,
          responseType,
          headers: {
            Range: byteRange([range[0], indexRange[1]]),
          },
        });
      }

      const mediaOrInitRequest = parsedRequest({
        url: mediaUrl,
        responseType,
        headers: range ? {
          Range: byteRange(range),
        } : null,
      });

      // If init segment has indexRange metadata, we need to fetch
      // both the initialization data and the index metadata. We do
      // this in parallel and send the both blobs into the pipeline.
      if (indexRange) {
        const indexRequest = parsedRequest({
          url: mediaUrl,
          responseType,
          headers: {
            Range: byteRange(indexRange),
          },
        });
        return merge(mediaOrInitRequest, indexRequest);
      }
      else {
        return mediaOrInitRequest;
      }
    },

    parser({ response, segment, adaptation, representation }) {
      const { language } = adaptation;
      const { isInit } = segment;

      // added index (segments and timescale) informations are
      // extracted from sidx atom
      const { indexRange } = segment;

      let responseData;
      let text;

      if (isMP4EmbeddedTrack(representation)) {
        responseData = new Uint8Array(response.responseData);
        text = bytesToStr(getMdat(responseData));
      } else {
        responseData = response.responseData;
        text = responseData;
      }

      // added segments and timescale informations are extracted from
      // sidx atom
      let nextSegments, timescale, currentSegment;

      const index = parseSidx(responseData, indexRange ? indexRange[0] : 0);
      if (index) {
        nextSegments = index.segments;
        timescale = index.timescale;
      }

      let segmentData = [];

      if (!isInit) {
        // current segment information may originate from the index
        // itself in which case we don't have to use the index
        // segments.
        if (segment.time >= 0 &&
            segment.duration >= 0) {
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

        if (__DEV__) {
          assert(currentSegment);
        }

        // const timescale = (index && index.timescale) ||
        //   representationIndex.timescale;

        const { codec = "" } = representation;

        switch (codec.toLowerCase()) {
        case "stpp":
          segmentData = parseTTML(text, language, 0);
          break;
        default:
          log.warn("The codec used for the subtitle is not managed yet.");
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

  const imageTrackPipeline = {
    loader({ segment, representation }) {
      const { isInit } = segment;

      if (isInit) {
        return empty();
      } else {
        const { media } = segment;

        const path = media ?
          replaceTokens(media, segment, representation) : "";
        const mediaUrl = resolveURL(representation.baseURL, path);
        return parsedRequest({
          url: mediaUrl,
          responseType: "arraybuffer",
        });
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
