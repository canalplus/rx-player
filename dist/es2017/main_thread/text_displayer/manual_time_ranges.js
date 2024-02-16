import assert from "../../utils/assert";
import { insertInto, keepRangeIntersection } from "../../utils/ranges";
/**
 * Simulate TimeRanges as returned by SourceBuffer.prototype.buffered.
 * Add an "insert" and "remove" methods to manually update it.
 * @class ManualTimeRanges
 */
export default class ManualTimeRanges {
    constructor() {
        this._ranges = [];
        this.length = 0;
    }
    insert(start, end) {
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            assert(start >= 0, "invalid start time");
            assert(end - start > 0, "invalid end time");
        }
        insertInto(this._ranges, { start, end });
        this.length = this._ranges.length;
    }
    remove(start, end) {
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            assert(start >= 0, "invalid start time");
            assert(end - start > 0, "invalid end time");
        }
        const rangesToIntersect = [];
        if (start > 0) {
            rangesToIntersect.push({ start: 0, end: start });
        }
        if (end < Infinity) {
            rangesToIntersect.push({ start: end, end: Infinity });
        }
        this._ranges = keepRangeIntersection(this._ranges, rangesToIntersect);
        this.length = this._ranges.length;
    }
    start(index) {
        if (index >= this._ranges.length) {
            throw new Error("INDEX_SIZE_ERROR");
        }
        return this._ranges[index].start;
    }
    end(index) {
        if (index >= this._ranges.length) {
            throw new Error("INDEX_SIZE_ERROR");
        }
        return this._ranges[index].end;
    }
}
