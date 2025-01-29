import features from "../../../features";
import log from "../../../log";
import type { ISupportedTextTrackFormat } from "../../../transports";

export interface IHTMLCue {
  start: number;
  end: number;
  element: HTMLElement;
}

/**
 * Convert text track data into timed HTML Cues.
 * @param {string} type - Text track format wanted
 * @param {string} data - Text track data
 * @param {Number} timescale - Potential external timescale to convert timing
 * information into seconds.
 * @param {Number} timestampOffset - offset to apply to every timed text
 * @param {string} [language] - language of the text tracks
 * @returns {Array.<Object>}
 * @throws Error - Throw if no parser is found for the given type
 */
export default function parseTextTrackToElements(
  type: ISupportedTextTrackFormat,
  data: string | BufferSource,
  timescale: number,
  timestampOffset: number,
  language?: string,
): IHTMLCue[] {
  log.debug("HTSB: Finding parser for html text tracks:", type);
  const parser = features.htmlTextTracksParsers[type];

  if (typeof parser !== "function") {
    throw new Error("no parser found for the given text track");
  }
  log.debug("HTSB: Parser found, parsing...");
  const parsed = parser(data, timescale, timestampOffset, language);
  log.debug("HTTB: Parsed successfully!", parsed.length);
  return parsed;
}
