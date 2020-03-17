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

import {
  Observable,
  of as observableOf,
} from "rxjs";
import { map } from "rxjs/operators";
import features from "../../features";
import Manifest, {
  Adaptation,
  IMetaPlaylistPrivateInfos,
  ISegment,
  LoadedPeriod,
  PartialPeriod,
  Representation,
} from "../../manifest";
import parseMetaPlaylist, {
  transformManifestToMetaplaylistPeriod,
} from "../../parsers/manifest/metaplaylist";
import filterMap from "../../utils/filter_map";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import {
  IAudioVideoParserObservable,
  IChunkTimeInfo,
  IImageParserObservable,
  IManifestParserArguments,
  IManifestParserEvent,
  IManifestParserObservable,
  IPeriodLoaderArguments,
  IPeriodLoaderEvent,
  IPeriodParserArguments,
  IPeriodParserEvent,
  IPeriodParserResponseEvent,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentParserParsedSegment,
  ITextParserObservable,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import generateManifestLoader from "./manifest_loader";

/**
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getContent(
  segment : ISegment,
  offset : number
) : { manifest : Manifest;
      period : LoadedPeriod;
      adaptation : Adaptation;
      representation : Representation;
      segment : ISegment; }
{
  if (segment.privateInfos?.metaplaylistInfos === undefined) {
    throw new Error("MetaPlaylist: missing private infos");
  }
  const { manifest,
          period,
          adaptation,
          representation } = segment.privateInfos.metaplaylistInfos.baseContent;
  const newTime = segment.time < 0 ? segment.time :
                                     segment.time - (offset * segment.timescale);
  const offsetedSegment = objectAssign({}, segment, { time: newTime });
  return  { manifest,
            period,
            adaptation,
            representation,
            segment: offsetedSegment };
}

/**
 * Prepare any wrapped segment loader's arguments.
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getLoaderArguments(
  segment : ISegment,
  url : string | null,
  offset : number
) : ISegmentLoaderArguments {
  const content = getContent(segment, offset);
  return objectAssign({ url }, content);
}

/**
 * Prepare any wrapped segment parser's arguments.
 * @param {Object} arguments
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getParserArguments<T>(
  { initTimescale, response } : ISegmentParserArguments<T>,
  segment : ISegment,
  offset : number
) : ISegmentParserArguments<T> {
  return { initTimescale,
           response,
           content: getContent(segment, offset) };
}

/**
 * @param {Object} transports
 * @param {string} transportName
 * @param {Object} options
 * @returns {Object}
 */
function getTransportPipelines(
  transports : Partial<Record<string, ITransportPipelines>>,
  transportName : string,
  options : ITransportOptions
) : ITransportPipelines {
  const initialTransport = transports[transportName];
  if (initialTransport !== undefined) {
    return initialTransport;
  }

  const feature = features.transports[transportName];

  if (feature === undefined) {
    throw new Error(`MetaPlaylist: Unknown transport ${transportName}.`);
  }
  const transport = feature(options);
  transports[transportName] = transport;
  return transport;
}

/**
 * @param {Object} segment
 * @returns {Object}
 */
function getMetaPlaylistPrivateInfos(segment : ISegment) : IMetaPlaylistPrivateInfos {
  const { privateInfos } = segment;
  if (privateInfos?.metaplaylistInfos === undefined) {
    throw new Error("MetaPlaylist: Undefined transport for content for metaplaylist.");
  }
  return privateInfos.metaplaylistInfos;
}
export default function(options : ITransportOptions): ITransportPipelines {
  const transports : Partial<Record<string, ITransportPipelines>> = {};

  const manifestLoader = generateManifestLoader({
    customManifestLoader: options.manifestLoader,
  });

  // remove some options that we might not want to apply to the
  // other streaming protocols used here
  const otherTransportOptions = objectAssign({},
                                             options,
                                             { manifestLoader: undefined,
                                               supplementaryTextTracks: [],
                                               supplementaryImageTracks: [] });

  const manifestPipeline = {
    loader: manifestLoader,
    parser(
      { response, url: loaderURL } : IManifestParserArguments
    ) : IManifestParserObservable {
      const url = response.url === undefined ? loaderURL :
                                               response.url;
      const { responseData } = response;

      const parserOptions = { url,
                              serverSyncInfos: options.serverSyncInfos };

      const parsedManifest = parseMetaPlaylist(responseData, parserOptions);
      const manifest = new Manifest(parsedManifest, options);
      return observableOf({ type: "parsed",
                            value: { manifest } });

    },
  };

  const periodPipeline = {
    loader({ period } : IPeriodLoaderArguments) : Observable<IPeriodLoaderEvent> {
      const url = getURLFromPeriod(period);
      const pipelines = getTransportPipelinesFromPeriod(period);
      return pipelines.manifest.loader({ url });
    },

    parser({ externalClockOffset, // XXX TODO
             period,
             response,
             scheduleRequest } : IPeriodParserArguments
    ) : Observable<IPeriodParserEvent> {
      const url = getURLFromPeriod(period);
      const pipelines = getTransportPipelinesFromPeriod(period);
      return pipelines.manifest.parser({ response,
                                         url,
                                         scheduleRequest,

                                         // XXX TODO
                                         previousManifest: null,
                                         unsafeMode: false,
                                         externalClockOffset })
        .pipe(filterMap<IManifestParserEvent,
                        IPeriodParserResponseEvent,
                        null>((parserData) => {
          if (parserData.type === "warning") {
            return null; // XXX TODO
          }
          const transformed =
            transformManifestToMetaplaylistPeriod(period, parserData.value.manifest);
          const periods = transformed.map(parsedPeriod => {
            return parsedPeriod.isLoaded ? new LoadedPeriod(parsedPeriod) :
                                           new PartialPeriod(parsedPeriod);
          });
          return { type : "parsed" as const,
                   periods };
        }, null));
    },
  };

  /**
   * @param {Object} segment
   * @param {Object} transports
   * @returns {Object}
   */
  function getTransportPipelinesFromSegment(
    segment : ISegment
  ): ITransportPipelines {
    const { transportType } = getMetaPlaylistPrivateInfos(segment);
    return getTransportPipelines(transports, transportType, otherTransportOptions);
  }

  function getURLFromPeriod(
    period : LoadedPeriod | PartialPeriod
  ): string {
    if (period.url === undefined || period.url === null) {
      throw new Error("Cannot perform HTTP(s) request. URL not known");
    }
    return period.url;
  }

  function getTransportPipelinesFromPeriod(
    period : LoadedPeriod | PartialPeriod
  ): ITransportPipelines {
    const transportType = getTransportTypeFromPeriod(period);
    return getTransportPipelines(transports, transportType, otherTransportOptions);
  }

  function getTransportTypeFromPeriod(
    period : LoadedPeriod | PartialPeriod
  ) : string {
    const mplPrivateInfos = period.privateInfos.metaplaylist;
    if (mplPrivateInfos === undefined) {
      throw new Error("A MetaPlaylist Partial Period should have the " +
                      "corresponding privateInfos");
    }
    return mplPrivateInfos.transportType;
  }

  /**
   * @param {number} contentOffset
   * @param {number} scaledContentOffset
   * @param {number|undefined} contentEnd
   * @param {Object} segmentResponse
   * @returns {Object}
   */
  function offsetTimeInfos(
    contentOffset : number,
    scaledContentOffset : number,
    contentEnd : number | undefined,
    segmentResponse : ISegmentParserParsedSegment<unknown>
  ) : { chunkInfos : IChunkTimeInfo | null;
        chunkOffset : number;
        appendWindow : [ number | undefined, number | undefined ]; } {
    const offsetedSegmentOffset = segmentResponse.chunkOffset + contentOffset;
    if (isNullOrUndefined(segmentResponse.chunkData)) {
      return { chunkInfos: segmentResponse.chunkInfos,
               chunkOffset: offsetedSegmentOffset,
               appendWindow: [undefined, undefined] };
    }

    // clone chunkInfos
    const { chunkInfos, appendWindow } = segmentResponse;
    const offsetedChunkInfos = chunkInfos === null ? null :
                                                     objectAssign({}, chunkInfos);
    if (offsetedChunkInfos !== null && offsetedChunkInfos.time > -1) {
      offsetedChunkInfos.time += scaledContentOffset;
    }

    const offsetedWindowStart = appendWindow[0] !== undefined ?
      Math.max(appendWindow[0] + contentOffset, contentOffset) :
      contentOffset;

    let offsetedWindowEnd : number|undefined;
    if (appendWindow[1] !== undefined) {
      offsetedWindowEnd = contentEnd !== undefined ?
        Math.min(appendWindow[1] + contentOffset, contentEnd) :
        appendWindow[1] + contentOffset;
    } else if (contentEnd !== undefined) {
      offsetedWindowEnd = contentEnd;
    }
    return { chunkInfos: offsetedChunkInfos,
             chunkOffset: offsetedSegmentOffset,
             appendWindow: [ offsetedWindowStart, offsetedWindowEnd ] };
  }

  const audioPipeline = {
    loader({ segment, period, url } : ISegmentLoaderArguments) {
      const { audio } = getTransportPipelinesFromSegment(segment);
      return audio.loader(getLoaderArguments(segment, url, period.start));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : IAudioVideoParserObservable {
      const { initTimescale, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (initTimescale ?? segment.timescale);
      const { audio } = getTransportPipelinesFromSegment(segment);
      return audio.parser(getParserArguments(args, segment, contentStart))
        .pipe(map(res => {
          if (res.type === "parsed-init-segment") {
            return res;
          }
          const timeInfos = offsetTimeInfos(contentStart,
                                            scaledOffset,
                                            contentEnd,
                                            res.value);
         return objectAssign({ type: "parsed-segment",
                               value: objectAssign({}, res.value, timeInfos) });
        }));
    },
  };

  const videoPipeline = {
    loader({ segment, period, url } : ISegmentLoaderArguments) {
      const { video } = getTransportPipelinesFromSegment(segment);
      return video.loader(getLoaderArguments(segment, url, period.start));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : IAudioVideoParserObservable {
      const { initTimescale, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (initTimescale ?? segment.timescale);
      const { video } = getTransportPipelinesFromSegment(segment);
      return video.parser(getParserArguments(args, segment, contentStart))
        .pipe(map(res => {
          if (res.type === "parsed-init-segment") {
            return res;
          }
          const timeInfos = offsetTimeInfos(contentStart,
                                            scaledOffset,
                                            contentEnd,
                                            res.value);
         return objectAssign({ type: "parsed-segment",
                               value: objectAssign({}, res.value, timeInfos) });
        }));
    },
  };

  const textTrackPipeline = {
    loader({ segment, period, url } : ISegmentLoaderArguments) {
      const { text } = getTransportPipelinesFromSegment(segment);
      return text.loader(getLoaderArguments(segment, url, period.start));
    },

    parser: (
      args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array|null>
    ) : ITextParserObservable => {
      const { initTimescale, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (initTimescale ?? segment.timescale);
      const { text } = getTransportPipelinesFromSegment(segment);
      return text.parser(getParserArguments(args, segment, contentStart))
        .pipe(map(res => {
          if (res.type === "parsed-init-segment") {
            return res;
          }
          const timeInfos = offsetTimeInfos(contentStart,
                                            scaledOffset,
                                            contentEnd,
                                            res.value);
         return objectAssign({ type: "parsed-segment",
                               value: objectAssign({}, res.value, timeInfos) });
        }));
    },
  };

  const imageTrackPipeline = {
    loader({ segment, period, url } : ISegmentLoaderArguments) {
      const { image } = getTransportPipelinesFromSegment(segment);
      return image.loader(getLoaderArguments(segment, url, period.start));
    },

    parser(
      args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
    ) : IImageParserObservable {
      const { initTimescale, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (initTimescale ?? segment.timescale);
      const { image } = getTransportPipelinesFromSegment(segment);
      return image.parser(getParserArguments(args, segment, contentStart))
        .pipe(map(res => {
          if (res.type === "parsed-init-segment") {
            return res;
          }
          const timeInfos = offsetTimeInfos(contentStart,
                                            scaledOffset,
                                            contentEnd,
                                            res.value);
         return objectAssign({ type: "parsed-segment",
                               value: objectAssign({}, res.value, timeInfos) });
        }));
    },
  };

  return { manifest: manifestPipeline,
           period: periodPipeline,
           audio: audioPipeline,
           video: videoPipeline,
           text: textTrackPipeline,
           image: imageTrackPipeline };
}
