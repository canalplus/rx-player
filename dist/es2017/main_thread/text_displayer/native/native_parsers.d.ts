import type { ICompatVTTCue } from "../../../compat/browser_compatibility_types";
/**
 * Convert text track data into timed VTT Cues.
 * @param {string} type - Text track format wanted
 * @param {string} data - Text track data
 * @param {Number} timestampOffset - offset to apply to every timed text
 * @param {string} [language] - language of the text tracks
 * @returns {Array.<VTTCue>}
 * @throws Error - Throw if no parser is found for the given type
 */
export default function parseTextTrackToCues(type: string, data: string, timestampOffset: number, language?: string): Array<ICompatVTTCue | TextTrackCue>;
