export interface IHTMLCue {
    start: number;
    end: number;
    element: HTMLElement;
}
/**
 * Convert text track data into timed HTML Cues.
 * @param {string} type - Text track format wanted
 * @param {string} data - Text track data
 * @param {Number} timestampOffset - offset to apply to every timed text
 * @param {string} [language] - language of the text tracks
 * @returns {Array.<Object>}
 * @throws Error - Throw if no parser is found for the given type
 */
export default function parseTextTrackToElements(type: string, data: string, timestampOffset: number, language?: string): IHTMLCue[];
