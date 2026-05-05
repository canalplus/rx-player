import bufferSourceToUint8 from "../../../../utils/buffer_source_to_uint8.ts";
import { strToUtf8 } from "../../../../utils/string_parsing.ts";
import parseMp4EmbeddedWebVtt from "../parse_mp4_embedded_wvtt.ts";
import type { IVTTHTMLCue } from "./to_html.ts";
import toHTML from "./to_html.ts";

/**
 * Parse WebVTT subtitles format when embedded in an MP4 file.
 * @throws Error - Throws if the given WebVTT format.
 * @param {string | BufferSource} text - The whole webvtt subtitles to parse
 * @param {Object} context
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
export default function parseWebVTTMp4(
  text: string | BufferSource,
  { initTimescale }: { initTimescale: number | null },
  timeOffset: number,
): IVTTHTMLCue[] {
  if (typeof text === "string") {
    return parseMp4EmbeddedWebVtt(
      strToUtf8(text),
      initTimescale ?? 1,
      timeOffset,
      toHTML,
    );
  }
  return parseMp4EmbeddedWebVtt(
    bufferSourceToUint8(text),
    initTimescale ?? 1,
    timeOffset,
    toHTML,
  );
}
