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
import dashManifestParser from "../../parsers/manifest/dash";
import request from "../../utils/request";
import generateManifestLoader from "../utils/manifest_loader";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import generateSegmentLoader from "./segment_loader";
import {
  loader as TextTrackLoader,
  parser as TextTrackParser,
} from "./texttracks";
import { addNextSegments } from "./utils";

import {
  CustomManifestLoader,
  CustomSegmentLoader,
  ILoaderObservable,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ITransportPipelines,
  SegmentParserObservable,
} from "../types";

interface IDASHOptions {
  manifestLoader? : CustomManifestLoader;
  segmentLoader? : CustomSegmentLoader;
  // contentProtectionParser? : IContentProtectionParser;
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
) : ITransportPipelines {
  const manifestLoader = generateManifestLoader({
    customManifestLoader: options.manifestLoader,
  });
  const segmentLoader = generateSegmentLoader(options.segmentLoader);
  // const { contentProtectionParser } = options;

  const manifestPipeline = {
    loader(
      { url } : IManifestLoaderArguments
    ) : ILoaderObservable<Document|string> {
      return manifestLoader(url);
    },

    parser(
      { response, url } : IManifestParserArguments<Document|string>
    ) : IManifestParserObservable {
      const data = typeof response.responseData === "string" ?
        new DOMParser().parseFromString(response.responseData, "text/xml") :
        response.responseData;
      return Observable.of({
        manifest: dashManifestParser(data, url/*, contentProtectionParser*/),
        url: response.url,
      });
    },
  };

  const segmentPipeline = {
    loader({ adaptation, init, manifest, period, representation, segment }
      : ISegmentLoaderArguments
    ) : ILoaderObservable<Uint8Array|ArrayBuffer> {
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
      const segmentData : Uint8Array = response.responseData instanceof Uint8Array ?
        response.responseData :
        new Uint8Array(response.responseData);
      const indexRange = segment.indexRange;
      const sidxSegments = parseSidx(segmentData, indexRange ? indexRange[0] : 0);

      if (!segment.isInit) {
        return Observable.of({
          segmentData,
          segmentInfos: getISOBMFFTimingInfos(segment, segmentData, sidxSegments, init),
        });
      }

      if (sidxSegments) {
        const nextSegments = sidxSegments;
        addNextSegments(representation, nextSegments);
      }
      const timescale = getMDHDTimescale(segmentData);
      return Observable.of({
        segmentData,
        segmentInfos: timescale > 0 ? { time: -1, duration: 0, timescale } : null,
      });
    },
  };

  const textTrackPipeline = {
    loader: TextTrackLoader,
    parser: TextTrackParser,
  };

  const imageTrackPipeline = {
    loader(
      { segment } : ISegmentLoaderArguments
    ) : ILoaderObservable<ArrayBuffer|null> {
      if (segment.isInit) {
        // image do not need an init segment. Passthrough directly to the parser
        return Observable.of({
          type: "data" as "data",
          value: { responseData: null },
        });
      }

      const { media } = segment;
      return request({ url: media, responseType: "arraybuffer" });
    },

    parser(
      { response, segment } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ImageParserObservable {
      const responseData = response.responseData;

      if (responseData === null) {
        return Observable.of({
          segmentData: null,
          segmentInfos: segment.timescale > 0 ? {
            duration: segment.isInit ? 0 : segment.duration,
            time: segment.isInit ? -1 : segment.time,
            timescale: segment.timescale,
          } : null,
        });
      }

      const bifObject = parseBif(new Uint8Array(responseData));
      const data = bifObject.thumbs;
      return Observable.of({
        segmentData: {
          data,
          start: 0,
          end: Number.MAX_VALUE,
          timescale: 1,
          timeOffset: 0,
          type: "bif",
        },
        segmentInfos: {
          time: 0,
          duration: Number.MAX_VALUE,
          timescale: bifObject.timescale,
        },
      });
    },
  };

  const overlayTrackPipeline = {
    loader() : never {
      throw new Error("Overlay tracks not managed in DASH");
    },

    parser() : never {
      throw new Error("Overlay tracks not yet in DASH");
    },
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    image: imageTrackPipeline,
    overlay: overlayTrackPipeline,
  };
}
