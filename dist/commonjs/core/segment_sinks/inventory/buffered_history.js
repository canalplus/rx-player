"use strict";
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var manifest_1 = require("../../../manifest");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
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
var BufferedHistory = /** @class */ (function () {
    /**
     * @param {number} lifetime - Maximum time a history entry should be retained.
     * @param {number} maxHistoryLength - Maximum number of entries the history
     * should have.
     */
    function BufferedHistory(lifetime, maxHistoryLength) {
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
    BufferedHistory.prototype.addBufferedSegment = function (context, buffered) {
        var now = (0, monotonic_timestamp_1.default)();
        this._history.push({ date: now, buffered: buffered, context: context });
        this._cleanHistory(now);
    };
    /**
     * Returns all entries linked to the given segment.
     * @param {Object} context
     * @returns {Array.<Object>}
     */
    BufferedHistory.prototype.getHistoryFor = function (context) {
        return this._history.filter(function (el) { return (0, manifest_1.areSameContent)(el.context, context); });
    };
    /**
     * If the current history does not satisfy `_lifetime` or `_maxHistoryLength`,
     * clear older entries until it does.
     * @param {number} now - Current monotonically-raising timestamp.
     */
    BufferedHistory.prototype._cleanHistory = function (now) {
        var e_1, _a;
        var historyEarliestLimit = now - this._lifetime;
        var firstKeptIndex = 0;
        try {
            for (var _b = __values(this._history), _c = _b.next(); !_c.done; _c = _b.next()) {
                var event_1 = _c.value;
                if (event_1.date < historyEarliestLimit) {
                    firstKeptIndex++;
                }
                else {
                    break;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (firstKeptIndex > 0) {
            this._history = this._history.splice(firstKeptIndex);
        }
        if (this._history.length > this._maxHistoryLength) {
            var toRemove = this._history.length - this._maxHistoryLength;
            this._history = this._history.splice(toRemove);
        }
    };
    return BufferedHistory;
}());
exports.default = BufferedHistory;
