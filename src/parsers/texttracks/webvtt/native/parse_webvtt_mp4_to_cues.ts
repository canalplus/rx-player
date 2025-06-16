import type { ICompatVTTCue } from "../../../../compat/browser_compatibility_types";
import bufferSourceToUint8 from "../../../../utils/buffer_source_to_uint8";
import { strToUtf8 } from "../../../../utils/string_parsing";
import parseMp4EmbeddedWebVtt from "../parse_mp4_embedded_wvtt";
import toNativeCue from "./to_native_cue";

/**
 * Parse WebVTT subtitles format when embedded in an MP4 file.
 * @throws Error - Throws if the given WebVTT format.
 * @param {string | BufferSource} input - The whole webvtt subtitles to parse
 * @param {Object} context
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
export default function parseMp4EmbeddedWebVttToVTTCues(
  input: string | BufferSource,
  { initTimescale }: { initTimescale: number | null },
  timeOffset: number,
): Array<TextTrackCue | ICompatVTTCue> {
  if (typeof input === "string") {
    return parseMp4EmbeddedWebVtt(
      strToUtf8(input),
      initTimescale ?? 1,
      timeOffset,
      toNativeCue,
    );
  } else {
    return parseMp4EmbeddedWebVtt(
      bufferSourceToUint8(input),
      initTimescale ?? 1,
      timeOffset,
      toNativeCue,
    );
  }
}
