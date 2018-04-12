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
import request from "../../utils/request";

import { IPrivateInfos } from "../../manifest/representation_index/interfaces";
import { generateManifest } from "../../parsers/manifest/metaplaylist/index";
import {
  ILoaderObservable,
  ILoaderResponse,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  IParserOptions,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ITransportPipelines,
  SegmentParserObservable,
} from "../types";

import DASHTransport from "../dash";
import SmoothTransport from "../smooth";
import patchBox from "./isobmff_patcher";

type ITransportTypes = "dash"|"smooth";

export interface IMetaManifestInfo {
    manifests: Array<{
      manifest: Document;
      url: string;
      startTime: number;
      endTime: number;
      transport: ITransportTypes;
      textTracks: [{
        url: string;
        language: string;
        mimeType: string;
      }];
    }>;
}

interface IMetaPlaylistContent {
  url: string;
  startTime: number;
  endTime: number;
  transport: ITransportTypes;
  textTracks: [{
    url: string;
    language: string;
    mimeType: string;
  }];
}

/**
 * Parse playlist string to JSON.
 * Returns an array of contents.
 * @param {string} data
 */
function parseMetaPlaylistData(data: string): IMetaPlaylistContent[] {
  let parsedMetaPlaylist;
  try {
    parsedMetaPlaylist = JSON.parse(data);
  } catch (error) {
    throw new Error("Bad MetaPlaylist file. Expected JSON.");
  }
  const { contents } = parsedMetaPlaylist;
  if (!Array.isArray(contents)) {
    throw new Error("Bad metaplaylist file.");
  }
  contents.forEach((content) => {
    if (
      content.url == null ||
      content.startTime == null ||
      content.endTime == null ||
      content.transport == null
    ) {
      throw new Error("Bad metaplaylist file.");
    }
  });

  return contents;
}

/**
 * Get transport type from segment's privateInfos
 * @param {Object} privateInfos
 */
function getTransportTypeFromSegmentPrivateInfos(
  privateInfos: IPrivateInfos
): ITransportTypes {
  const transportType = privateInfos.transportType;

  if (!transportType) {
    throw new Error("Undefined transport for content for metaplaylist.");
  }

  return transportType;
}

export default function(options: IParserOptions = {}): ITransportPipelines {

    const transports = {
      dash: DASHTransport(options),
      smooth: SmoothTransport(options),
    };

    const manifestPipeline = {
      loader(
        { url } : IManifestLoaderArguments
      ) : ILoaderObservable<Document|string> {
        return request({
          url,
          responseType: "text",
          ignoreProgressEvents: true,
        }).map(({ value }) => {
          return {
            type: "response" as "response",
            value: {
              responseData: value.responseData,
            },
          };
        });
      },

      parser(
        { response, url } : IManifestParserArguments<Document|string>
      ) : IManifestParserObservable {
        if (typeof response.responseData !== "string") {
          throw new Error("Parser input must be string.");
        }
        const contents = parseMetaPlaylistData(response.responseData);
        const manifestsInfos$ = contents.map((content) => {
          const transport = transports[content.transport];
          if (transport == null) {
            throw new Error(
              "Transport" + content.transport + "not supported in MetaPlaylist.");
          }
          const loader = transport.manifest.loader;

          return loader({ url: content.url })
            .filter((res): res is ILoaderResponse<Document> => res.type === "response")
            .map((res) => {
              return {
                manifest: res.value.responseData,
                url: content.url,
                startTime: content.startTime,
                endTime: content.endTime,
                transport: content.transport,
                textTracks: content.textTracks,
              };
            });
        });

        return Observable
          .combineLatest(manifestsInfos$)
          .mergeMap((combinedManifest) => {
            const manifestsInfos =  combinedManifest;
            const parsedManifestsInfo = manifestsInfos.map((manifestInfos) => {
              const transport = transports[manifestInfos.transport];
              const parser = transport.manifest.parser;
              const fakeResponse = {
                responseData: manifestInfos.manifest,
              };
              return parser({ response: fakeResponse, url: manifestInfos.url })
              .map((mpd) => {
                const type = mpd.manifest.type;
                if (type !== "static") {
                  throw new Error("Content from metaplaylist is not static.");
                }
                return {
                  manifest: mpd.manifest,
                  transport: manifestInfos.transport,
                  url: manifestInfos.url,
                  startTime: manifestInfos.startTime,
                  endTime: manifestInfos.endTime,
                  textTracks: manifestInfos.textTracks,
                };
              });
            });
            return Observable.combineLatest(parsedManifestsInfo).map((_contents) => {
                const manifest = generateManifest(_contents, url);
                return {
                  manifest,
                  url,
                };
            });
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
        if (!segment.privateInfos) {
          throw new Error("Segments from metaplaylist must have private infos.");
        }
        const transportType =
          getTransportTypeFromSegmentPrivateInfos(segment.privateInfos);
        const transport = transports[transportType];
        const segmentLoader = transport.video.loader;
        return segmentLoader({
          adaptation,
          init,
          manifest,
          period,
          representation,
          segment,
        });
      },

      parser(args : ISegmentParserArguments<Uint8Array|ArrayBuffer>
        ) : SegmentParserObservable {
          const { period, init, segment } = args;
          if (!segment.privateInfos) {
            throw new Error("Segments from metaplaylist must have private infos.");
          }
          const transportType =
            getTransportTypeFromSegmentPrivateInfos(segment.privateInfos);
          const transport = transports[transportType];

          if (!transport) {
            throw new Error("Segments from metaplaylist must have private infos.");
          }
          const segmentParser = transport.video.parser;

          return segmentParser(args).map(({ segmentData, segmentInfos }) => {
            let segmentPatchedData;
            const offset = (period.start || 0) *
              (init ? (init.timescale || segment.timescale) :  segment.timescale);

            if(segmentData !== undefined){
              const responseData = segmentData instanceof Uint8Array ?
                segmentData :
                new Uint8Array(segmentData);

              segmentPatchedData =  patchBox(
                responseData,
                offset
              );
              if (segmentInfos) {
                segmentInfos.time += offset;
              }
            }
            return { segmentData: segmentPatchedData, segmentInfos };
          });

        },
      };

    const textTrackPipeline = {
      loader: (args: ISegmentLoaderArguments) => {
        if (!args.segment.privateInfos) {
          throw new Error("Segments from metaplaylist must have private infos.");
        }
        const transportType =
          getTransportTypeFromSegmentPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];
        return transport.text.loader(args);
      },
      parser: (args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array>) => {
        if (!args.segment.privateInfos) {
          throw new Error();
        }
        const transportType =
          getTransportTypeFromSegmentPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];
        return transport.text.parser(args).map((parsed) => {
          if (parsed.segmentData != null) {
            parsed.segmentData.timeOffset += args.period.start;
          }
          return { segmentData: parsed.segmentData, segmentInfos: parsed.segmentInfos };
        });
      },
    };

    const imageTrackPipeline = {
      loader(args : ISegmentLoaderArguments) : ILoaderObservable<ArrayBuffer|Uint8Array> {
        if (!args.segment.privateInfos) {
          throw new Error("Segments from metaplaylist must have private infos.");
        }
        const transportType =
          getTransportTypeFromSegmentPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];
        return transport.image.loader(args);
      },
      parser(
        args : ISegmentParserArguments<ArrayBuffer|Uint8Array>
      ) : ImageParserObservable {
        if (!args.segment.privateInfos) {
          throw new Error("Segments from metaplaylist must have private infos.");
        }
        const transportType =
          getTransportTypeFromSegmentPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];

        return transport.image.parser(args).map((parsed) => {
          if (parsed.segmentData != null) {
            parsed.segmentData.timeOffset += args.period.start;
          }
          return parsed;
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
