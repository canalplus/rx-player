import bufferSourceToUint8 from "../../../../utils/buffer_source_to_uint8";
import { strToUtf8 } from "../../../../utils/string_parsing";
import parseMp4EmbeddedWebVtt from "../parse_mp4_embedded_wvtt";
import type { IVTTHTMLCue } from "./to_html";
import toHTML from "./to_html";

/**
 * Parse WebVTT subtitles format when embedded in an MP4 file.
 * @throws Error - Throws if the given WebVTT format.
 * @param {string | BufferSource} text - The whole webvtt subtitles to parse
 * @param {Number} timescale
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
export default function parseWebVTTMp4(
  text: string | BufferSource,
  timescale: number,
  timeOffset: number,
): IVTTHTMLCue[] {
  if (typeof text === "string") {
    return parseMp4EmbeddedWebVtt(strToUtf8(text), timescale, timeOffset, toHTML);
  }
  return parseMp4EmbeddedWebVtt(bufferSourceToUint8(text), timescale, timeOffset, toHTML);
}
