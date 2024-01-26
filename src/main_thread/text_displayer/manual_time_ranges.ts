import assert from "../../utils/assert";
import { insertInto, keepRangeIntersection } from "../../utils/ranges";

/**
 * Simulate TimeRanges as returned by SourceBuffer.prototype.buffered.
 * Add an "insert" and "remove" methods to manually update it.
 * @class ManualTimeRanges
 */
export default class ManualTimeRanges implements TimeRanges {
  public length: number;

  private _ranges: Array<{
    start: number;
    end: number;
  }>;

  constructor() {
    this._ranges = [];
    this.length = 0;
  }

  insert(start: number, end: number): void {
    if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
      assert(start >= 0, "invalid start time");
      assert(end - start > 0, "invalid end time");
    }
    insertInto(this._ranges, { start, end });
    this.length = this._ranges.length;
  }

  remove(start: number, end: number): void {
    if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
      assert(start >= 0, "invalid start time");
      assert(end - start > 0, "invalid end time");
    }
    const rangesToIntersect: Array<{ start: number; end: number }> = [];
    if (start > 0) {
      rangesToIntersect.push({ start: 0, end: start });
    }
    if (end < Infinity) {
      rangesToIntersect.push({ start: end, end: Infinity });
    }
    this._ranges = keepRangeIntersection(this._ranges, rangesToIntersect);
    this.length = this._ranges.length;
  }

  start(index: number): number {
    if (index >= this._ranges.length) {
      throw new Error("INDEX_SIZE_ERROR");
    }
    return this._ranges[index].start;
  }

  end(index: number): number {
    if (index >= this._ranges.length) {
      throw new Error("INDEX_SIZE_ERROR");
    }
    return this._ranges[index].end;
  }
}
