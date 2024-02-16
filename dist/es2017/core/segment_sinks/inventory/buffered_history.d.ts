/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { IChunkContext } from "./types";
/**
 * Entry of a `BufferedHistory`, added when the initial buffered range of a
 * **full segment** (and not just of a sub-chunk of a segment like in some
 * low-latency streaming usages) in the buffer becomes known.
 */
export interface IBufferedHistoryEntry {
    /** The RxPlayer's monotonically-raising timestamp when the event happened. */
    date: number;
    /**
     * Timestamps of what has been buffered with that segment.
     * `null` if it has been immediately garbage collected.
     */
    buffered: null | {
        /** Start time at which we observed that segment/chunk starts at, in seconds. */
        start: number;
        /** *End time at which we observed that segment/chunk ends at, in seconds. */
        end: number;
    };
    /** Content metadata linked to the segment, allowing to recognize it. */
    context: IChunkContext;
}
/**
 * Register a short-lived history of buffer information.
 *
 * This class can be useful to develop heuristics based on short-term buffer
 * history, such as knowing the real start and end of a buffered segment once
 * it has been pushed in a buffer.
 *
 * By storing in a history important recent actions and events, the
 * `BufferedHistory` can help other RxPlayer modules detect and work-around
 * unusual behavior.
 *
 * @class BufferedHistory
 */
export default class BufferedHistory {
    /** Complete recent history in chronological order (from oldest to newest) */
    private _history;
    /** Maximum time a history entry should be retained. */
    private _lifetime;
    /** Maximum number of entries the `BufferedHistory`'s history should have. */
    private _maxHistoryLength;
    /**
     * @param {number} lifetime - Maximum time a history entry should be retained.
     * @param {number} maxHistoryLength - Maximum number of entries the history
     * should have.
     */
    constructor(lifetime: number, maxHistoryLength: number);
    /**
     * Add an entry to the `BufferedHistory`'s history indicating the buffered
     * range of a pushed segment.
     *
     * To call when the full range of a given segment becomes known.
     *
     * @param {Object} context
     * @param {Array.<number>|null} buffered
     */
    addBufferedSegment(context: IChunkContext, buffered: {
        start: number;
        end: number;
    } | null): void;
    /**
     * Returns all entries linked to the given segment.
     * @param {Object} context
     * @returns {Array.<Object>}
     */
    getHistoryFor(context: IChunkContext): IBufferedHistoryEntry[];
    /**
     * If the current history does not satisfy `_lifetime` or `_maxHistoryLength`,
     * clear older entries until it does.
     * @param {number} now - Current monotonically-raising timestamp.
     */
    private _cleanHistory;
}
