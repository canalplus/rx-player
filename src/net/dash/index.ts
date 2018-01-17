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
import {
  getMDHDTimescale,
  parseSidx,
} from "../../parsers/containers/isobmff";
import parseBif from "../../parsers/images/bif";
import request from "../../utils/request";
import { resolveURL } from "../../utils/url";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import dashManifestParser, {
  IContentProtectionParser,
} from "./manifest";
import generateSegmentLoader from "./segment_loader";
import {
  loader as TextTrackLoader,
  parser as TextTrackParser,
} from "./texttracks";
import {
  addNextSegments,
  replaceTokens,
} from "./utils";

import {
  CustomSegmentLoader,
  ILoaderObservable,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  INextSegmentsInfos,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentTimingInfos,
  ITransportPipelines,
  SegmentParserObservable,
} from "../types";

interface IDASHOptions {
  segmentLoader? : CustomSegmentLoader;
  contentProtectionParser? : IContentProtectionParser;
}

/**
 * Returns pipelines used for DASH streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @param {Function} [options.contentProtectionParser] - Optional parser for the
 * manifest's content Protection.
 * @returns {Object}
 */
export default function(
  options : IDASHOptions = {}
) : ITransportPipelines<
  Document,
  ArrayBuffer|Uint8Array,
  ArrayBuffer|Uint8Array,
  ArrayBuffer|string,
  ArrayBuffer
>{
  const segmentLoader = generateSegmentLoader(options.segmentLoader);
  const { contentProtectionParser } = options;

  const manifestPipeline = {
    loader(
      { url } : IManifestLoaderArguments
    ) : ILoaderObservable<Document> {
      return request({
        url,
        responseType: "document",
      });
    },

    parser(
      { response, url } : IManifestParserArguments<Document>
    ) : IManifestParserObservable {
      const data = response.responseData;
      return Observable.of({
        manifest: dashManifestParser(data, url, contentProtectionParser),
        url: response.url,
      });
    },
  };

  const segmentPipeline = {
    loader({
      adaptation,
      init,
      manifest,
      period,
      representation,
      segment,
    } : ISegmentLoaderArguments) : ILoaderObservable<Uint8Array|ArrayBuffer> {
      return segmentLoader({
        adaptation,
        init,
        manifest,
        period,
        representation,
        segment,
      });
    },

    parser({
      segment,
      representation,
      response,
      init,
    } : ISegmentParserArguments<Uint8Array|ArrayBuffer>
    ) : SegmentParserObservable {

      const responseData = response.responseData instanceof Uint8Array
      ? response.responseData
       : new Uint8Array(response.responseData);

      let nextSegments : INextSegmentsInfos[]|undefined;
      let segmentInfos : ISegmentTimingInfos;
      const segmentData : Uint8Array = responseData;

      const indexRange = segment.indexRange;
      const sidxSegments =
        parseSidx(responseData, indexRange ? indexRange[0] : 0);
      if (sidxSegments) {
        nextSegments = sidxSegments;
      }

      if (segment.isInit) {
        segmentInfos = { time: -1, duration: 0 };
        const timescale = getMDHDTimescale(responseData);
        if (timescale > 0) {
          segmentInfos.timescale = timescale;
        }
      } else {
        segmentInfos =
          getISOBMFFTimingInfos(segment, responseData, sidxSegments, init);
      }

      if (nextSegments) {
        addNextSegments(representation, segmentInfos, nextSegments);
      }
      return Observable.of({ segmentData, segmentInfos });
    },
  };

  const textTrackPipeline = {
    loader: TextTrackLoader,
    parser: TextTrackParser,
  };

  const imageTrackPipeline = {
    loader(
      { segment, representation } : ISegmentLoaderArguments
    ) : ILoaderObservable<ArrayBuffer> {
      const { isInit } = segment;

      if (isInit) {
        return Observable.empty();
      } else {
        const { media } = segment;

        const path = media ?
          replaceTokens(media, segment, representation) : "";
        const mediaUrl = resolveURL(representation.baseURL, path);
        return request({
          url: mediaUrl,
          responseType: "arraybuffer",
        });
      }
    },

    parser(
      { response } : ISegmentParserArguments<ArrayBuffer>
    ) : ImageParserObservable {
      const responseData = response.responseData;
      const blob = new Uint8Array(responseData);

      const bif = parseBif(blob);
      const data = bif.thumbs;

      const segmentInfos = {
        time: 0,
        duration: Number.MAX_VALUE,
        timescale: bif.timescale,
      };
      const segmentData = {
        data,
        start: 0,
        end: Number.MAX_VALUE,
        timescale: 1,
        timeOffset: 0,
        type: "bif",
      };
      return Observable.of({ segmentData, segmentInfos });
    },
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    image: imageTrackPipeline,
  };
}
