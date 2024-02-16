import type { IHTMLCue } from "./utils";
/**
 * Manage a buffer of text track cues.
 * Allows to add, remove and recuperate cues at given times.
 * @class TextTrackCuesStore
 */
export default class TextTrackCuesStore {
    private _cuesBuffer;
    constructor();
    isEmpty(): boolean;
    /**
     * Get corresponding cue(s) for the given time.
     * A cue is an object with three properties:
     *   - start {Number}: start time for which the cue should be displayed.
     *   - end {Number}: end time for which the cue should be displayed.
     *   - element {HTMLElement}: The cue to diplay
     *
     * We do not mutate individual cue here.
     * That is, if the ``get`` method returns the same cue's reference than a
     * previous ``get`` call, its properties are guaranteed to have the exact same
     * values than before, if you did not mutate it on your side.
     * The inverse is true, if the values are the same than before, the reference
     * will stay the same (this is useful to easily check if the DOM should be
     * updated, for example).
     *
     * @param {Number} time
     * @returns {Array.<HTMLElement>} - The cues that need to be displayed at that
     * time.
     */
    get(time: number): HTMLElement[];
    /**
     * Remove cue from a certain range of time.
     * @param {Number} from
     * @param {Number} _to
     */
    remove(from: number, _to: number): void;
    /**
     * Insert new cues in our text buffer.
     * cues is an array of objects with three properties:
     *   - start {Number}: start time for which the cue should be displayed.
     *   - end {Number}: end time for which the cue should be displayed.
     *   - element {HTMLElement}: The cue to diplay
     *
     * @param {Array.<Object>} cues - CuesGroups, array of objects with the
     * following properties:
     *   - start {Number}: the time at which the cue will start to be displayed
     *   - end {Number}: the time at which the cue will end to be displayed
     *   - cue {HTMLElement}: The cue
     * @param {Number} start - Start time at which the CuesGroup applies.
     * This is different than the start of the first cue to display in it, this
     * has more to do with the time at which the _text segment_ starts.
     * @param {Number} end - End time at which the CuesGroup applies.
     * This is different than the end of the last cue to display in it, this
     * has more to do with the time at which the _text segment_ ends.
     *
     * TODO add securities to ensure that:
     *   - the start of a CuesGroup is inferior or equal to the start of the first
     *     cue in it
     *   - the end of a CuesGroup is superior or equal to the end of the last
     *     cue in it
     * If those requirements are not met, we could delete some cues when adding
     * a CuesGroup before/after. Find a solution.
     */
    insert(cues: IHTMLCue[], start: number, end: number): void;
}
