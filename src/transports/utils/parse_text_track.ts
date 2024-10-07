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

import log from "../../log";
import type { Adaptation, ISegment, Representation } from "../../manifest";
import { getMDAT } from "../../parsers/containers/isobmff";
import { utf8ToStr } from "../../utils/string_parsing";
import type { IChunkTimeInfo, ITextTrackSegmentData } from "../types";

/**
 * Return plain text text track from the given ISOBMFF.
 * @param {Uint8Array} chunkBytes
 * @returns {string}
 */
export function extractTextTrackFromISOBMFF(chunkBytes: Uint8Array): string {
  const mdat = getMDAT(chunkBytes);
  return mdat === null ? "" : utf8ToStr(mdat);
}

/**
 * Returns the a string expliciting the format of a text track when that text
 * track is embedded into a ISOBMFF file.
 * @param {Object} representation
 * @returns {string}
 */
export function getISOBMFFTextTrackFormat(
  representation: Representation,
): "ttml" | "vtt" {
  const codec = representation.codec;
  if (codec === undefined) {
    throw new Error("Cannot parse subtitles: unknown format");
  }
  switch (codec.toLowerCase()) {
    case "stpp": // stpp === TTML in MP4
    case "stpp.ttml":
    case "stpp.ttml.im1t":
      return "ttml";
    case "wvtt": // wvtt === WebVTT in MP4
      return "vtt";
  }
  throw new Error("The codec used for the subtitles " + `"${codec}" is not managed yet.`);
}

/**
 * Returns the a string expliciting the format of a text track in plain text.
 * @param {Object} representation
 * @returns {string}
 */
export function getPlainTextTrackFormat(
  representation: Representation,
): "ttml" | "sami" | "vtt" | "srt" {
  const { mimeType = "" } = representation;
  switch (representation.mimeType) {
    case "application/ttml+xml":
      return "ttml";
    case "application/x-sami":
    case "application/smil":
      return "sami";
    case "text/vtt":
      return "vtt";
  }

  const { codec = "" } = representation;
  const codeLC = codec.toLowerCase();
  if (codeLC === "srt") {
    return "srt";
  }
  throw new Error(`could not find a text-track parser for the type ${mimeType}`);
}

/**
 * @param {Object} content
 * @param {ArrayBuffer|UInt8Array|null} chunkData
 * @param {Object|null} chunkInfos
 * @param {boolean} isChunked
 * @returns {Object|null}
 */
export function getISOBMFFEmbeddedTextTrackData(
  {
    segment,
    adaptation,
    representation,
  }: { segment: ISegment; adaptation: Adaptation; representation: Representation },
  chunkBytes: Uint8Array,
  chunkInfos: IChunkTimeInfo | null,
  isChunked: boolean,
): ITextTrackSegmentData | null {
  if (segment.isInit) {
    return null;
  }
  let startTime: number | undefined;
  let endTime: number | undefined;
  if (chunkInfos === null) {
    if (!isChunked) {
      log.warn("Transport: Unavailable time data for current text track.");
    } else {
      startTime = segment.time;
      endTime = segment.end;
    }
  } else {
    startTime = chunkInfos.time;
    if (chunkInfos.duration !== undefined) {
      endTime = startTime + chunkInfos.duration;
    } else if (!isChunked && segment.complete) {
      endTime = startTime + segment.duration;
    }
  }

  const type = getISOBMFFTextTrackFormat(representation);
  const textData = extractTextTrackFromISOBMFF(chunkBytes);
  return {
    data: textData,
    type,
    language: adaptation.language,
    start: startTime,
    end: endTime,
  };
}

/**
 * @param {Object} content
 * @param {ArrayBuffer|UInt8Array|null} chunkData
 * @param {Object|null} chunkInfos
 * @param {boolean} isChunked
 * @returns {Object|null}
 */
export function getPlainTextTrackData(
  {
    segment,
    adaptation,
    representation,
  }: { segment: ISegment; adaptation: Adaptation; representation: Representation },
  textTrackData: string,
  isChunked: boolean,
): ITextTrackSegmentData | null {
  if (segment.isInit) {
    return null;
  }

  let start;
  let end;
  if (isChunked) {
    log.warn("Transport: Unavailable time data for current text track.");
  } else {
    start = segment.time;
    if (segment.complete) {
      end = segment.time + segment.duration;
    }
  }

  const type = getPlainTextTrackFormat(representation);
  return { data: textTrackData, type, language: adaptation.language, start, end };
}
