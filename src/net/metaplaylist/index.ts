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

import objectAssign from "object-assign";
import { combineLatest } from "rxjs";
import {
  filter,
  map,
  mergeMap,
} from "rxjs/operators";
import { ISegment } from "../../manifest/representation_index/interfaces";
import parseMetaManifest from "../../parsers/manifest/metaplaylist";
import request from "../../utils/request";
import DASHTransport from "../dash";
import SmoothTransport from "../smooth";
import {
  ILoaderObservable,
  ILoaderResponse,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ITransportOptions,
  ITransportPipelines,
  SegmentParserObservable,
} from "../types";

export interface IMetaManifestInfo {
    manifests: Array<{
      manifest: Document;
      url: string;
      startTime: number;
      endTime: number;
      transport: string;
      textTracks: [{
        url: string;
        language: string;
        mimeType: string;
      }];
    }>;
}

interface IMetaPlaylist {
  contents: Array<{
    url: string;
    startTime: number;
    endTime: number;
    transport: string;
    textTracks: [{
      url: string;
      language: string;
      mimeType: string;
    }];
  }>;
  attributes: {
    timeShiftBufferDepth: number;
  };
}

/**
 * Parse playlist string to JSON.
 * Returns an array of contents.
 * @param {string} data
 */
function parseMetaPlaylistData(data: string): IMetaPlaylist {
  let parsedMetaPlaylist;
  try {
    parsedMetaPlaylist = JSON.parse(data);
  } catch (error) {
    throw new Error("Bad MetaPlaylist file. Expected JSON.");
  }
  const { contents, attributes } = parsedMetaPlaylist;
  if (!Array.isArray(contents)) {
    throw new Error("Bad metaplaylist file.");
  }
  contents.forEach((content) => {
    if (
      content.url == null ||
      content.startTime == null ||
      content.endTime == null ||
      content.transport == null ||
      (attributes && attributes.timeShiftBufferDepth == null)
    ) {
      throw new Error("Bad metaplaylist file.");
    }
    if (content.textTracks) {
      content.textTracks.forEach((textTrack: {
        url: string;
        language: string;
        mimeType: string;
      }) => {
        if (
          textTrack.url == null ||
          textTrack.language == null ||
          textTrack.mimeType == null
        ) {
          throw new Error("Bad metaplaylist file.");
        }
      });
    }
  });

  return { contents, attributes };
}

/**
 * Get parsers base arguments from segment indexes.
 * Patches segment time and get Manifest, Period,
 * Adaptation and Representation from base content.
 */
function getParserBaseArguments<T>(
  segment: ISegment,
  metaplaylistArguments: ISegmentParserArguments<T>,
  offset?: number
): ISegmentParserArguments<T>;
function getParserBaseArguments(
  segment: ISegment,
  metaplaylistArguments: ISegmentLoaderArguments,
  offset?: number
): ISegmentLoaderArguments;
function getParserBaseArguments<T>(
  segment: ISegment,
  metaplaylistArguments: ISegmentParserArguments<T>|ISegmentLoaderArguments,
  offset?: number
): ISegmentParserArguments<T>|ISegmentLoaderArguments {
  const originalSegment =
    offset ?
      objectAssign(
        {},
        segment,
        { time: segment.isInit ? segment.time : segment.time - offset }
      ) :
      segment;

  if (segment.privateInfos && segment.privateInfos.baseContentInfos) {
    const contentInfos = segment.privateInfos.baseContentInfos;
    return objectAssign({}, metaplaylistArguments, {
      manifest: contentInfos.manifest,
      period: contentInfos.period || metaplaylistArguments.period,
      adaptation: contentInfos.adaptation || metaplaylistArguments.adaptation,
      representation: contentInfos.representation || metaplaylistArguments.representation,
      segment: originalSegment,
    });
  } else {
    return objectAssign({}, metaplaylistArguments, { segment: originalSegment });
  }
}

/**
 * @param {Object} segment
 * @param {Object} transports
 * @returns {Object}
 */
function getTransportPipelinesFromSegment(
  segment : ISegment,
  transports : Partial<Record<string, ITransportPipelines>>
): ITransportPipelines {
  if (!segment.privateInfos) {
    throw new Error("Segments from metaplaylist must have private infos.");
  }

  const transportType = segment.privateInfos.transportType;
  if (!transportType) {
    throw new Error("Undefined transport for content for metaplaylist.");
  }

  const transport = transports[transportType];
  if (transport == null) {
    throw new Error(`MetatPlaylist: Unknown transport ${transportType}.`);
  }

  return transport;
}

export default function(options?: ITransportOptions): ITransportPipelines {

    const transports : Partial<Record<string, ITransportPipelines>> = {
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
        });
      },

      parser(
        { response, url } : IManifestParserArguments<Document|string>
      ) : IManifestParserObservable {
        if (typeof response.responseData !== "string") {
          throw new Error("Parser input must be string.");
        }
        const { contents, attributes } = parseMetaPlaylistData(response.responseData);
        const contents$ = contents.map((content) => {
          const transport = transports[content.transport];
          if (transport == null) {
            throw new Error(
              "Transport" + content.transport + "not supported in MetaPlaylist.");
          }
          const loader = transport.manifest.loader;

          return loader({ url: content.url })
            .pipe(
              filter((res): res is ILoaderResponse<Document> => res.type === "response"),
              mergeMap((res) => {
                const parser = transport.manifest.parser;
                const fakeResponse = {
                  responseData: res.value.responseData,
                };

                return parser({ response: fakeResponse, url: content.url })
                  .pipe(
                    map((mpd) => {
                      if (mpd.manifest.isLive) {
                        throw new Error("Content from metaplaylist is not static.");
                      }
                      return objectAssign(content, { manifest: mpd.manifest });
                    })
                  );
              })
            );
        });

        return combineLatest(contents$)
          .pipe(
            map((combinedContents) => {
              const manifest = parseMetaManifest(combinedContents, attributes, url);
              return {
                manifest,
                url,
              };
            })
          );
      },
    };

    const segmentPipeline = {
      loader(
        args : ISegmentLoaderArguments
      ) : ILoaderObservable<Uint8Array|ArrayBuffer|null> {
        const {
          segment,
          // period,
          // init, // XXX TODO
        } = args;
        const transport = getTransportPipelinesFromSegment(segment, transports);
        const segmentLoader = transport.video.loader;
        // XXX TODO
        // const offset = (period.start || 0) *
        //   (init ? (init.timescale || segment.timescale) :  segment.timescale);
        const parserArgs = getParserBaseArguments(segment, args /*, offset */);
        return segmentLoader(parserArgs);
      },

      parser(args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
        ) : SegmentParserObservable {
          const { period, init, segment } = args;
          const transport = getTransportPipelinesFromSegment(segment, transports);
          const segmentParser = transport.video.parser;
          const offset = (period.start || 0) *
            (init ? (init.timescale || segment.timescale) :  segment.timescale);

          const parserArgs = getParserBaseArguments(segment, args, offset);

          return segmentParser(parserArgs)
            .pipe(map(({ segmentData, segmentInfos }) => {
              if (segmentData == null) {
                return { segmentData: null, segmentInfos: null, segmentOffset: 0 };
              }
              const responseData = segmentData instanceof Uint8Array ?
                segmentData : new Uint8Array(segmentData);

              if (segmentInfos && segmentInfos.time > -1) {
                segmentInfos.time += offset;
              }
              return {
                segmentData: responseData,
                segmentInfos,
                segmentOffset: offset / segment.timescale,
              };
            }));
        },
      };

    const textTrackPipeline = {
      loader: (args: ISegmentLoaderArguments) => {
        const transport = getTransportPipelinesFromSegment(args.segment, transports);
        const offset = args.period.start;
        const parserArgs = getParserBaseArguments(args.segment, args, offset);
        return transport.text.loader(parserArgs);
      },
      parser: (args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array|null>) => {
        const transport = getTransportPipelinesFromSegment(args.segment, transports);
        const offset = args.period.start;
        const parserArgs = getParserBaseArguments(args.segment, args, offset);
        return transport.text.parser(parserArgs)
          .pipe(map(({ segmentInfos, segmentData }) => {
            if (segmentInfos && segmentInfos.time > -1) {
              segmentInfos.time += offset;
            }
            return { segmentData, segmentInfos, segmentOffset: offset };
          }));
      },
    };

    const imageTrackPipeline = {
      loader(args : ISegmentLoaderArguments) :
        ILoaderObservable<ArrayBuffer|Uint8Array|null> {
        const transport = getTransportPipelinesFromSegment(args.segment, transports);
        const offset = args.period.start;
        const parserArgs = getParserBaseArguments(args.segment, args, offset);
        return transport.image.loader(parserArgs);
      },
      parser(
        args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
      ) : ImageParserObservable {
        const transport = getTransportPipelinesFromSegment(args.segment, transports);
        const offset = args.period.start;
        const parserArgs = getParserBaseArguments(args.segment, args, offset);
        return transport.image.parser(parserArgs)
          .pipe(map(({ segmentInfos, segmentData }) => {
            if (segmentInfos && segmentInfos.time > -1) {
              segmentInfos.time += offset;
            }
            return { segmentData, segmentInfos, segmentOffset: offset };
          }));
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
