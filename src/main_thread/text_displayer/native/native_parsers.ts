import type { ICompatVTTCue } from "../../../compat/browser_compatibility_types";
import features from "../../../features";
import log from "../../../log";
import type { ISupportedTextTrackFormat } from "../../../transports";

/**
 * Convert text track data into timed VTT Cues.
 * @param {string} type - Text track format wanted
 * @param {string|BufferSource} data - Text track data
 * @param {Number} timescale - Potential external timescale to convert timing
 * information into seconds.
 * @param {Number} timestampOffset - offset to apply to every timed text
 * @param {string} [language] - language of the text tracks
 * @returns {Array.<VTTCue>}
 * @throws Error - Throw if no parser is found for the given type
 */
export default function parseTextTrackToCues(
  type: ISupportedTextTrackFormat,
  data: string | BufferSource,
  timescale: number,
  timestampOffset: number,
  language?: string,
): Array<ICompatVTTCue | TextTrackCue> {
  log.debug("NTSB: Finding parser for native text tracks:", type);
  const parser = features.nativeTextTracksParsers[type];

  if (typeof parser !== "function") {
    throw new Error("no parser found for the given text track");
  }

  log.debug("NTSB: Parser found, parsing...");
  const parsed = parser(data, timescale, timestampOffset, language);
  log.debug("NTSB: Parsed successfully!", parsed.length);
  return parsed;
}
