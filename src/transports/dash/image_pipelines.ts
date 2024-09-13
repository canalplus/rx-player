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

import features from "../../features";
import type { ICdnMetadata } from "../../parsers/manifest";
import request from "../../utils/request";
import type { CancellationSignal } from "../../utils/task_canceller";
import type {
  IImageTrackSegmentData,
  ILoadedImageSegmentFormat,
  ISegmentContext,
  ISegmentLoaderCallbacks,
  ISegmentLoaderOptions,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
} from "../types";
import constructSegmentUrl from "./construct_segment_url";

/**
 * Loads an image segment.
 * @param {Object|null} wantedCdn
 * @param {Object} content
 * @param {Object} options
 * @param {Object} cancelSignal
 * @param {Object} callbacks
 * @returns {Promise}
 */
export async function imageLoader(
  wantedCdn: ICdnMetadata | null,
  content: ISegmentContext,
  options: ISegmentLoaderOptions,
  cancelSignal: CancellationSignal,
  callbacks: ISegmentLoaderCallbacks<ILoadedImageSegmentFormat>,
): Promise<
  | ISegmentLoaderResultSegmentLoaded<ILoadedImageSegmentFormat>
  | ISegmentLoaderResultSegmentCreated<ILoadedImageSegmentFormat>
> {
  const { segment } = content;
  const url = constructSegmentUrl(wantedCdn, segment);
  if (segment.isInit || url === null) {
    return { resultType: "segment-created", resultData: null };
  }
  const data = await request({
    url,
    responseType: "arraybuffer",
    timeout: options.timeout,
    onProgress: callbacks.onProgress,
    cancelSignal,
  });
  return { resultType: "segment-loaded", resultData: data };
}

/**
 * Parses an image segment.
 * @param {Object} loadedSegment
 * @param {Object} content
 * @returns {Object}
 */
export function imageParser(
  loadedSegment: { data: ArrayBuffer | Uint8Array | null; isChunked: boolean },
  content: ISegmentContext,
):
  | ISegmentParserParsedMediaChunk<IImageTrackSegmentData | null>
  | ISegmentParserParsedInitChunk<null> {
  const { segment, period } = content;
  const { data, isChunked } = loadedSegment;

  if (content.segment.isInit) {
    // image init segment has no use
    return {
      segmentType: "init",
      initializationData: null,
      initializationDataSize: 0,
      protectionDataUpdate: false,
      initTimescale: undefined,
    };
  }

  if (isChunked) {
    throw new Error("Image data should not be downloaded in chunks");
  }

  const chunkOffset = segment.timestampOffset ?? 0;

  // TODO image Parsing should be more on the buffer side, no?
  if (data === null || features.imageParser === null) {
    return {
      segmentType: "media",
      chunkData: null,
      chunkSize: 0,
      chunkInfos: { duration: segment.duration, time: segment.time },
      chunkOffset,
      protectionDataUpdate: false,
      appendWindow: [period.start, period.end],
    };
  }

  const bifObject = features.imageParser(new Uint8Array(data));
  const thumbsData = bifObject.thumbs;
  return {
    segmentType: "media",
    chunkData: {
      data: thumbsData,
      start: 0,
      end: Number.MAX_VALUE,
      timescale: 1,
      type: "bif",
    },
    chunkSize: undefined,
    chunkInfos: { time: 0, duration: Number.MAX_VALUE },
    chunkOffset,
    protectionDataUpdate: false,
    appendWindow: [period.start, period.end],
  };
}
