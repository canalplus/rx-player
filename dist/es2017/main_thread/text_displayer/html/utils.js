/**
 * Maximum time difference, in seconds, between two text segment's start times
 * and/or end times for them to be considered the same.
 *
 * For example for two segments s1 and s2 which have a start time respectively
 * of st1 and st2 and end time of et1 and et2:
 *   - if both the absolute difference between st1 and st2 AND the one between
 *     et1 and et2 is inferior or equal to the MAX_DELTA_BUFFER_TIME, s1 and s2
 *     are considered to target the exact same time. As a consequence, if s2 is
 *     added after s1 in the buffer, s1 will be completely replaced by it and
 *     vice-versa.
 *   - if only one of the two (absolute difference between st1 and st2 OR et1
 *     and et2) is inferior to the MAX_DELTA_BUFFER_TIME then the last added
 *     is not completely considered the same. It WILL still replace - either
 *     partially or completely (depending on the sign of the other difference) -
 *     the previously added segment.
 *   - if both differences are strictly superior to the MAX_DELTA_BUFFER_TIME,
 *     then they are not considered to have the same start nor the same end.
 *     They can still overlap however, and MIGHT thus still replace partially
 *     or completely each other.
 *
 * Setting a value too low might lead to two segments targeting the same time,
 * both being present in the buffer. In worst case scenarios, this could lead
 * to indicate that an unwanted text track is still here (theorically though,
 * this is a case that should never happen for reasons that might be too long
 * to explain here).
 *
 * Setting a value too high might lead to two segments targeting different times
 * to be wrongly believed to target the same time. In worst case scenarios, this
 * could lead to wanted text tracks being removed.
 *
 * When comparing 2 segments s1 and s2, you may want to take into account the duration
 * of the segments:
 *   - if s1 is [0, 2] and s2 is [0, 2.1] s1 and s2 can be considered as nearly equal as
 *     there is a relative difference of: (2.1-2) / 2 = 5%;
 *     Formula: (end_s1 - end_s2) / duration_s2 = relative_difference
 *   - if s1 is [0, 0.04] and s2 is [0.04, 0.08] s1 and s2 may not considered as nearly
 *     equal as there is a relative difference of: (0.04-0.08) / 0.04 = 100%
 *
 * To compare relatively to the duration of a segment you can provide and additional
 * parameter "delta" that remplace MAX_DELTA_BUFFER_TIME.
 * If parameter "delta" is higher than MAX_DELTA_BUFFER_TIME, MAX_DELTA_BUFFER_TIME
 * is used instead of delta. This ensure that segments are nearly equal when comparing
 * relatively AND absolutely.
 *
 * @type Number
 */
const MAX_DELTA_BUFFER_TIME = 0.2;
/**
 * @see MAX_DELTA_BUFFER_TIME
 * @param {Number} a
 * @param {Number} b
 * @param {Number} delta
 * @returns {Boolean}
 */
export function areNearlyEqual(a, b, delta = MAX_DELTA_BUFFER_TIME) {
    return Math.abs(a - b) <= Math.min(delta, MAX_DELTA_BUFFER_TIME);
}
const EPSILON = 5e-2; // 5%
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
export function areCuesStartNearlyEqual(firstCue, secondCue) {
    const firstCueDuration = firstCue.end - firstCue.start;
    const secondCueDuration = secondCue.end - secondCue.start;
    const diffBetweenStart = Math.abs(firstCue.start - secondCue.start);
    const minDuration = Math.min(firstCueDuration, secondCueDuration, MAX_DELTA_BUFFER_TIME);
    return diffBetweenStart / minDuration <= EPSILON; // ratio diff/ minduration is bellow 5%
}
/**
 * Get all cues which have data before the given time.
 * @param {Object} cues
 * @param {Number} time
 * @returns {Array.<Object>}
 */
export function getCuesBefore(cues, time) {
    for (let i = cues.length - 1; i >= 0; i--) {
        const cue = cues[i];
        if (cue.start < time) {
            return cues.slice(0, i + 1);
        }
    }
    return [];
}
/**
 * Get all cues which have data after the given time.
 * @param {Object} cues
 * @param {Number} time
 * @returns {Array.<Object>}
 */
export function getCuesAfter(cues, time) {
    for (let i = 0; i < cues.length; i++) {
        const cue = cues[i];
        if (cue.end > time) {
            return cues.slice(i, cues.length);
        }
    }
    return [];
}
/**
 * @param {Object} cuesInfos
 * @param {Number} start
 * @param {Number} end
 * @returns {Array.<Object>}
 */
export function removeCuesInfosBetween(cuesInfos, start, end) {
    const endCuesInfos1 = Math.max(cuesInfos.start, start);
    const cues1 = getCuesBefore(cuesInfos.cues, start);
    const cuesInfos1 = {
        start: cuesInfos.start,
        end: endCuesInfos1,
        cues: cues1,
    };
    const startCuesInfos2 = Math.min(end, cuesInfos.end);
    const cues2 = getCuesAfter(cuesInfos.cues, end);
    const cuesInfos2 = {
        start: startCuesInfos2,
        end: cuesInfos.end,
        cues: cues2,
    };
    return [cuesInfos1, cuesInfos2];
}
