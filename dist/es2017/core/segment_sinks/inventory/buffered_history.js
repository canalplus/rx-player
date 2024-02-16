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
import { areSameContent } from "../../../manifest";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
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
    /**
     * @param {number} lifetime - Maximum time a history entry should be retained.
     * @param {number} maxHistoryLength - Maximum number of entries the history
     * should have.
     */
    constructor(lifetime, maxHistoryLength) {
        this._history = [];
        this._lifetime = lifetime;
        this._maxHistoryLength = maxHistoryLength;
    }
    /**
     * Add an entry to the `BufferedHistory`'s history indicating the buffered
     * range of a pushed segment.
     *
     * To call when the full range of a given segment becomes known.
     *
     * @param {Object} context
     * @param {Array.<number>|null} buffered
     */
    addBufferedSegment(context, buffered) {
        const now = getMonotonicTimeStamp();
        this._history.push({ date: now, buffered, context });
        this._cleanHistory(now);
    }
    /**
     * Returns all entries linked to the given segment.
     * @param {Object} context
     * @returns {Array.<Object>}
     */
    getHistoryFor(context) {
        return this._history.filter((el) => areSameContent(el.context, context));
    }
    /**
     * If the current history does not satisfy `_lifetime` or `_maxHistoryLength`,
     * clear older entries until it does.
     * @param {number} now - Current monotonically-raising timestamp.
     */
    _cleanHistory(now) {
        const historyEarliestLimit = now - this._lifetime;
        let firstKeptIndex = 0;
        for (const event of this._history) {
            if (event.date < historyEarliestLimit) {
                firstKeptIndex++;
            }
            else {
                break;
            }
        }
        if (firstKeptIndex > 0) {
            this._history = this._history.splice(firstKeptIndex);
        }
        if (this._history.length > this._maxHistoryLength) {
            const toRemove = this._history.length - this._maxHistoryLength;
            this._history = this._history.splice(toRemove);
        }
    }
}
