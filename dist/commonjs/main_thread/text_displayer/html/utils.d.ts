export interface IHTMLCue {
    start: number;
    end: number;
    element: HTMLElement;
}
export interface ICuesGroup {
    start: number;
    end: number;
    cues: IHTMLCue[];
}
/**
 * @see MAX_DELTA_BUFFER_TIME
 * @param {Number} a
 * @param {Number} b
 * @param {Number} delta
 * @returns {Boolean}
 */
export declare function areNearlyEqual(a: number, b: number, delta?: number): boolean;
/**
 * Get all cues which have data before the given time.
 * @param {Object} cues
 * @param {Number} time
 * @returns {Array.<Object>}
 */
export declare function getCuesBefore(cues: IHTMLCue[], time: number): IHTMLCue[];
/**
 * Get all cues which have data after the given time.
 * @param {Object} cues
 * @param {Number} time
 * @returns {Array.<Object>}
 */
export declare function getCuesAfter(cues: IHTMLCue[], time: number): IHTMLCue[];
/**
 * @param {Object} cuesInfos
 * @param {Number} start
 * @param {Number} end
 * @returns {Array.<Object>}
 */
export declare function removeCuesInfosBetween(cuesInfos: ICuesGroup, start: number, end: number): [ICuesGroup, ICuesGroup];
