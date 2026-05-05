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

import log from "../../log.ts";
import type { ISegment } from "../../manifest/index.ts";
import { getMDAT } from "../../parsers/containers/isobmff/index.ts";
import startsWith from "../../utils/starts_with.ts";
import { utf8ToStr } from "../../utils/string_parsing.ts";
import type { IChunkTimeInfo, ISegmentContext, ITextTrackSegmentData } from "../types.ts";

/**
 * Returns the a string expliciting the format of a text track when that text
 * track is embedded into a ISOBMFF file.
 * @param {string|undefined} codecs
 * @returns {string}
 */
export function getISOBMFFTextTrackFormat(codecs: string | undefined): "ttml" | "vtt" {
  if (codecs === undefined) {
    throw new Error("Cannot parse subtitles: unknown format");
  }
  switch (codecs.toLowerCase()) {
    case "stpp": // stpp === TTML in MP4
    case "stpp.ttml":
    case "stpp.ttml.im1t":
      return "ttml";
    case "wvtt": // wvtt === WebVTT in MP4
      return "vtt";
  }
  throw new Error(
    "The codec used for the subtitles " + `"${codecs}" is not managed yet.`,
  );
}

/**
 * Returns the a string expliciting the format of a text track in plain text.
 * @param {string|undefined} codecs
 * @param {string|undefined} mimeType
 * @returns {string}
 */
export function getPlainTextTrackFormat(
  codecs: string | undefined,
  mimeType: string | undefined,
): "ttml" | "sami" | "vtt" | "srt" {
  switch (mimeType) {
    case "application/ttml+xml":
      return "ttml";
    case "application/x-sami":
    case "application/smil":
      return "sami";
    case "text/vtt":
      return "vtt";
  }

  if (codecs !== undefined) {
    const codeLC = codecs.toLowerCase();
    if (codeLC === "srt") {
      return "srt";
    }
  }
  throw new Error(`could not find a text-track parser for the type ${mimeType ?? ""}`);
}

/**
 * @param {Object} content
 * @param {ArrayBuffer|UInt8Array|null} chunkBytes
 * @param {number|undefined} initTimescale
 * @param {Object|null} chunkInfos
 * @param {boolean} isChunked
 * @returns {Object|null}
 */
export function getISOBMFFEmbeddedTextTrackData(
  {
    segment,
    language,
    codecs,
  }: {
    /** The segment containing that subtitles data. */
    segment: ISegment;
    /** The wanted subtitles "codecs" as announced by the packager/encoder. */
    codecs: string | undefined;
    /**
     * The wanted language to display.
     * Some subtitles format embed several different subtitles group for
     * different languages. This allows to select the right one.
     */
    language: string | undefined;
  },
  chunkBytes: Uint8Array<ArrayBuffer>,
  initTimescale: number | undefined,
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
      log.warn("utils", "Unavailable time data for current text track.");
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

  const type: "ttml" | "vtt" = getISOBMFFTextTrackFormat(codecs);
  const mdat = getMDAT(chunkBytes);
  const mdatStr = mdat !== null ? utf8ToStr(mdat) : "";
  if (
    codecs === "wvtt" &&
    !startsWith(mdatStr, "WEBVTT") &&
    !startsWith(mdatStr, "\xfe\xffWEBVTT")
  ) {
    // From how I understand it, we're here in a special WebVTT format  embedded
    // in an MP4 where the whole chunk contains information, now just the MDAT
    return {
      data: chunkBytes,
      type: "mp4vtt",
      language,
      start: startTime,
      end: endTime,
      initTimescale: initTimescale ?? null,
    };
  }
  return {
    data: mdatStr,
    type,
    language,
    start: startTime,
    end: endTime,
    initTimescale: initTimescale ?? null,
  };
}

/**
 * @param {Object} context
 * @param {ArrayBuffer|UInt8Array|null} textTrackData
 * @param {number|undefined} initTimescale
 * @param {boolean} isChunked
 * @returns {Object|null}
 */
export function getPlainTextTrackData(
  context: ISegmentContext,
  textTrackData: string,
  initTimescale: number | undefined,
  isChunked: boolean,
): ITextTrackSegmentData | null {
  const { segment } = context;
  if (segment.isInit) {
    return null;
  }

  let start;
  let end;
  if (isChunked) {
    log.warn("utils", "Unavailable time data for current text track.");
  } else {
    start = segment.time;
    if (segment.complete) {
      end = segment.time + segment.duration;
    }
  }

  const type = getPlainTextTrackFormat(context.chosenCodec, context.mimeType);
  return {
    data: textTrackData,
    type,
    language: context.language,
    start,
    end,
    initTimescale: initTimescale ?? null,
  };
}
