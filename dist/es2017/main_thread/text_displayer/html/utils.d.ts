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
 * Check if two cues start are almost the same.
 * It should depend on there relative length:
 *
 * [0, 2] and [2, 4] start are NOT equals
 * [0, 2] and [0, 4]  start are equals
 * [0, 0.1] and [0.101, 2] start are NOT equals
 * [0, 2] and [0.01, 4]  start are equals
 * [0, 100] and [1, 200]  start are NOT equals
 * @see MAX_DELTA_BUFFER_TIME
 * @param {Number} firstCue the existing cue
 * @param {Number} secondCue the cue that we test if it follow firstCue
 * @returns {Boolean}
 */
export declare function areCuesStartNearlyEqual(firstCue: ICuesGroup, secondCue: ICuesGroup): boolean;
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
//# sourceMappingURL=utils.d.ts.map