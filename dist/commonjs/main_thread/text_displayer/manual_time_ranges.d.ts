/**
 * Simulate TimeRanges as returned by SourceBuffer.prototype.buffered.
 * Add an "insert" and "remove" methods to manually update it.
 * @class ManualTimeRanges
 */
export default class ManualTimeRanges implements TimeRanges {
    length: number;
    private _ranges;
    constructor();
    insert(start: number, end: number): void;
    remove(start: number, end: number): void;
    start(index: number): number;
    end(index: number): number;
}
