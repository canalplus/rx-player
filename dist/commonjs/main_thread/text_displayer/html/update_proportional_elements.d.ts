/**
 * Update size of element which are proportional to the current text track
 * element.
 * Returns `true` if at least a single styling information is proportional,
 * `false` otherwise.
 * @param {number} currentHeight
 * @param {number} currentWidth
 * @param {Object} resolution
 * @param {HTMLElement} textTrackElement
 * @returns {boolean}
 */
export default function updateProportionalElements(currentHeight: number, currentWidth: number, resolution: {
    columns: number;
    rows: number;
}, textTrackElement: HTMLElement): boolean;
