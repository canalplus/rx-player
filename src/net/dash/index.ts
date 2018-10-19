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

/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import { of as observableOf } from "rxjs";
import { tap } from "rxjs/operators";
import features from "../../features";
import {
  getMDHDTimescale,
  getSegmentsFromSidx,
} from "../../parsers/containers/isobmff";
import {
  getSegmentsFromCues,
  getTimeCodeScale,
} from "../../parsers/containers/matroska";
import dashManifestParser from "../../parsers/manifest/dash";
import request from "../../utils/request";
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
import generateManifestLoader from "../utils/manifest_loader";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import updateManifestWithParsedLinkedPeriods from "./linked_periods";
import generateSegmentLoader from "./segment_loader";
import {
  loader as TextTrackLoader,
  parser as TextTrackParser,
} from "./texttracks";
import { addNextSegments } from "./utils";

import getPresentationLiveGap from "./get_presentation_live_gap";

interface IDASHOptions {
  manifestLoader? : CustomManifestLoader;
  segmentLoader? : CustomSegmentLoader;
}

/**
 * Returns pipelines used for DASH streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @returns {Object}
 */
export default function(
  options : IDASHOptions = {}
) : ITransportPipelines {
  const manifestLoader = generateManifestLoader({
    customManifestLoader: options.manifestLoader,
  });
  const segmentLoader = generateSegmentLoader(options.segmentLoader);

  const manifestPipeline = {
    loader(
      { url, partialManifest } : IManifestLoaderArguments
    ) : ILoaderObservable<Document|string> {
      if (partialManifest && partialManifest.linkedPeriods) {
        // Manifest exists, supplementary content must be downloaded.
        const partialContentUrl = partialManifest.linkedPeriods[0].linkURL || "";
        return manifestLoader(partialContentUrl, "text");
      } else { // regular manifest loader, from scratch
        return manifestLoader(url, "Document");
      }
    },

    parser(
      { response, url: reqURL, partialManifest } :
        IManifestParserArguments<Document|string>
    ) : IManifestParserObservable {
      const url = response.url == null ? reqURL : response.url;
      let manifestObservable;

      if (partialManifest && partialManifest.linkedPeriods) {
        // "response" is data from loaded partial content.
        // Manifest is updated with parsed partial content.
        const { responseData } = response;
        if (typeof responseData !== "string") {
          throw new Error("Response from period loader should be a string.");
        }

        const linkedPeriodData = {
          rawText: responseData,
          xlink: partialManifest.linkedPeriods[0],
        };

        const updatedManifest = updateManifestWithParsedLinkedPeriods(
          partialManifest,
          linkedPeriodData
        );

        manifestObservable = observableOf({
          manifest: updatedManifest,
          url,
          isComplete: (updatedManifest.linkedPeriods || []).length === 0,
        });
      } else {
        // No partial manifest has been loaded/parsed.
        // "response" is the result from the first loaded manifest.
        const data = typeof response.responseData === "string" ?
          new DOMParser().parseFromString(response.responseData, "text/xml") :
          response.responseData;

        const manifest = dashManifestParser(data, url);

        manifestObservable = observableOf({
          manifest:  dashManifestParser(data, url),
          url,
          isComplete: (manifest.linkedPeriods || []).length === 0,
        });
      }

      return manifestObservable.pipe(
        tap(({ manifest }) => {
          if (manifest.isLive) {
            manifest.presentationLiveGap =
              getPresentationLiveGap(manifest);
          }
        })
      );
    },
  };

  const segmentPipeline = {
    loader({ adaptation, manifest, period, representation, segment }
      : ISegmentLoaderArguments
    ) : ILoaderObservable<Uint8Array|ArrayBuffer|null> {
      return segmentLoader({
        adaptation,
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
    } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : SegmentParserObservable {
      const { responseData } = response;
      if (responseData == null) {
        return observableOf({
          segmentData: null,
          segmentInfos: null,
          segmentOffset: 0,
        });
      }
      const segmentData : Uint8Array = responseData instanceof Uint8Array ?
        responseData :
        new Uint8Array(responseData);
      const indexRange = segment.indexRange;
      const isWEBM = representation.mimeType === "video/webm" ||
        representation.mimeType === "audio/webm";
      const nextSegments = isWEBM ?
        getSegmentsFromCues(segmentData, 0) :
        getSegmentsFromSidx(segmentData, indexRange ? indexRange[0] : 0);

      if (!segment.isInit) {
        const segmentInfos = isWEBM ?
          {
            time: segment.time,
            duration: segment.duration,
            timescale: segment.timescale,
          } :
          getISOBMFFTimingInfos(segment, segmentData, nextSegments, init);
        const segmentOffset = segment.timestampOffset || 0;
        return observableOf({ segmentData, segmentInfos, segmentOffset });
      }

      if (nextSegments) {
        addNextSegments(representation, nextSegments);
      }
      const timescale = isWEBM ?
        getTimeCodeScale(segmentData, 0) :
        getMDHDTimescale(segmentData);
      return observableOf({
        segmentData,
        segmentInfos: timescale && timescale > 0 ?
          { time: -1, duration: 0, timescale } : null,
        segmentOffset: segment.timestampOffset || 0,
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
      if (segment.isInit || segment.mediaURL == null) {
        return observableOf({
          type: "data" as "data",
          value: { responseData: null },
        });
      }
      const { mediaURL } = segment;
      return request({ url: mediaURL, responseType: "arraybuffer" });
    },

    parser(
      { response, segment } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ImageParserObservable {
      const responseData = response.responseData;

      // TODO image Parsing should be more on the sourceBuffer side, no?
      if (responseData === null || features.imageParser == null) {
        return observableOf({
          segmentData: null,
          segmentInfos: segment.timescale > 0 ? {
            duration: segment.isInit ? 0 : segment.duration,
            time: segment.isInit ? -1 : segment.time,
            timescale: segment.timescale,
          } : null,
          segmentOffset: segment.timestampOffset || 0,
        });
      }

      const bifObject = features.imageParser(new Uint8Array(responseData));
      const data = bifObject.thumbs;
      return observableOf({
        segmentData: {
          data,
          start: 0,
          end: Number.MAX_VALUE,
          timescale: 1,
          type: "bif",
        },
        segmentInfos: {
          time: 0,
          duration: Number.MAX_VALUE,
          timescale: bifObject.timescale,
        },
        segmentOffset: segment.timestampOffset || 0,
      });
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
