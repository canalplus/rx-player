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
import assert from "../../utils/assert";
import request from "../../utils/request";
import BoxPatcher from "./isobmff_patcher";

import { ISegmentPrivateInfos } from "../../manifest/representation_index/interfaces";
import { generateManifest } from "../../parsers/manifest/metaplaylist/index";
import { IParserOptions } from "../../parsers/manifest/types";
import {
  ILoaderObservable,
  ILoaderResponse,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  IMetaTransportPipelines,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  SegmentParserObservable,
  TextTrackParserObservable,
} from "../types";

import DASHTransport from "../dash";
import SmoothTransport from "../smooth";

export interface IMetaManifestInfo {
    manifests: Array<{
      manifest: Document;
      url: string;
      startTime: number;
      endTime: number;
      transport: "dash"|"smooth";
    }>;
}

type transportTypes = "dash"|"smooth";

const transportTypes: transportTypes[] = ["dash", "smooth"];

/**
 * Parse playlist string to JSON.
 * Returns an array of contents.
 * @param {string} data
 */
function loadMetaPlaylistData(data: string): Array<{
    url: string;
    startTime: number;
    endTime: number;
    transport: "dash"|"smooth";
  }> {
  const parsedMetaPlaylist = JSON.parse(data);
  const { contents } = parsedMetaPlaylist;
  assert(contents);

  return contents;
}

/**
 * Get transport type from segment's privateInfos
 * @param {Object} privateInfos
 */
function getTypeFromPrivateInfos(privateInfos: ISegmentPrivateInfos): transportTypes {
  const transportType =
    transportTypes.reduce((acc: "dash"|"smooth"|undefined, val) => {
      if (acc !== null &&
        privateInfos[val] === null
      ) {
        return val;
      }
      return acc;
    }, undefined);

  if (!transportType) {
    throw new Error("Undefined transport for content for metaplaylist.");
  }

  return transportType;
}

export default function(
    options: IParserOptions = {}
): IMetaTransportPipelines {

    const transports = {
      dash: DASHTransport(options),
      smooth: SmoothTransport(options),
    };

    const manifestPipeline = {
      loader(
        { url } : IManifestLoaderArguments
      ) : ILoaderObservable<IMetaManifestInfo> {
        return request({
          url,
          responseType: "text",
          ignoreProgressEvents: true,
        }).mergeMap(({ value }) => {
          const data = value.responseData;
          const contents = loadMetaPlaylistData(data); // load data from meta document
          const manifestsInfos$ = contents.map((content) => {
            const transport = transports[content.transport];
            const loader = transport.manifest.loader;

            return loader({ url: content.url })
              .filter((res) => res.type === "response")
              .map((res) => {
                return {
                  // res has been filtered and is always a response event.
                  // TS doesn't guess.
                  manifest: (res as ILoaderResponse<Document>).value.responseData,
                  url: content.url,
                  startTime: content.startTime,
                  endTime: content.endTime,
                  transport: content.transport,
                };
              });
          });

          return Observable
            .combineLatest(manifestsInfos$)
            .map((manifestsInfos) => {
              return {
                type: "response" as "response",
                value: {
                  responseData: {
                    manifests: manifestsInfos,
                  },
                },
              };
            });
        });
      },

      parser(
        { response, url } : IManifestParserArguments<IMetaManifestInfo>
      ) : IManifestParserObservable {

        const documents = response.responseData;
        const manifestsInfos =  documents.manifests;

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
            };
          });
        });

        return Observable.combineLatest(parsedManifestsInfo).map((contents) => {
            const manifest = generateManifest(contents, url);
            return {
              manifest,
              url,
            };
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
        const transportType = getTypeFromPrivateInfos(segment.privateInfos);
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
          const transportType = getTypeFromPrivateInfos(segment.privateInfos);
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

              segmentPatchedData = new BoxPatcher(
                responseData,
                false,
                false,
                offset
              ).filter();
            }
            if (segmentInfos) {
              segmentInfos.time += offset;
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
        const transportType = getTypeFromPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];
        return transport.text.loader(args);
      },
      parser: (
        args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array|null>
      ) : TextTrackParserObservable => {
        if (!args.segment.privateInfos) {
          throw new Error();
        }
        const transportType = getTypeFromPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];
        return transport.text.parser(args).map((_args) => {
          if (_args.segmentData != null) {
            _args.segmentData.timeOffset = args.period.start;
          }
          return { segmentData: _args.segmentData, segmentInfos: _args.segmentInfos };
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
        const transportType = getTypeFromPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];
        return transport.image.loader(args);
      },
      parser(
        args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
      ) : ImageParserObservable {
        if (!args.segment.privateInfos) {
          throw new Error("Segments from metaplaylist must have private infos.");
        }
        const transportType = getTypeFromPrivateInfos(args.segment.privateInfos);
        const transport = transports[transportType];

        return transport.image.parser(args).map((_args) => {
          if (_args.segmentData != null) {
            _args.segmentData.timeOffset = args.period.start;
          }
          return _args;
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
