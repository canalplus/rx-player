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
import parseMetaManifest from "../../parsers/manifest/metaplaylist";
import {
  ILoaderObservable,
  ILoaderResponse,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  IOverlayParserObservable,
  IParserOptions,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ITransportPipelines,
  SegmentParserObservable,
  TextTrackParserObservable,
} from "../types";

import DASHTransport from "../dash";
import SmoothTransport from "../smooth";
import patchBox from "./isobmff_patcher";

type ITransportTypes = "dash"|"smooth";

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
  overlays: any;
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
                overlays: content.overlays,
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
                  overlays: manifestInfos.overlays,
                };
              });
            });
            return Observable.combineLatest(parsedManifestsInfo).map((_contents) => {
                const manifest = parseMetaManifest(_contents, url);
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

            if (segmentData != null) {
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
            return { segmentData: segmentPatchedData || null, segmentInfos };
          });

        },
      };

    const textTrackPipeline = {
      loader: (
        args: ISegmentLoaderArguments
      ) : ILoaderObservable<ArrayBuffer|Uint8Array|string|null> => {
        if (!args.segment.privateInfos) {
          throw new Error("Segments from metaplaylist must have private infos.");
        }
        const transportType =
          getTransportTypeFromSegmentPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];
        return transport.text.loader(args);
      },
      parser: (
        args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array|null>
      ) : TextTrackParserObservable => {
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
      loader(
        args : ISegmentLoaderArguments
      ) : ILoaderObservable<ArrayBuffer|Uint8Array|null> {
        if (!args.segment.privateInfos) {
          throw new Error("Segments from metaplaylist must have private infos.");
        }
        const transportType =
          getTransportTypeFromSegmentPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];
        return transport.image.loader(args);
      },
      parser(
        args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
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

  const overlayPipeline = {
    loader(
      _args : ISegmentLoaderArguments
    ) : ILoaderObservable<Uint8Array|ArrayBuffer|null> {
      // For now, nothing is downloaded.
      // Everything is parsed from the segment
      return Observable.of({
        type: "data" as "data",
        value: { responseData: null },
      });
    },

    parser(
      args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
    ) : IOverlayParserObservable {
      const { segment } = args;
      const { privateInfos } = segment;
      if (!privateInfos || privateInfos.overlayInfos == null) {
        throw new Error("An overlay segment should have private infos.");
      }
      const { overlayInfos } = privateInfos;
      const end = segment.duration != null ?
        segment.duration - segment.time : overlayInfos.end;
      return Observable.of({
        segmentInfos: {
          time: segment.time,
          duration: segment.duration,
          timescale: segment.timescale,
        },
        segmentData: {
          data: [overlayInfos],
          start: segment.time,
          end,
          timeOffset: 0,
          timescale: segment.timescale,
          type: "metadash",
        },
      });
    },
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    image: imageTrackPipeline,
    overlay: overlayPipeline,
  };
}
