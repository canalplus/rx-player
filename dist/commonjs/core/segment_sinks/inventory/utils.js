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
exports.getFirstSegmentAfterPeriod = exports.getLastSegmentBeforePeriod = void 0;
/**
 * Returns the last segment in the `inventory` which is linked to a Period
 * before `period`.
 * @param {Array.<Object>} inventory
 * @param {Object} period
 * @returns {Object|null}
 */
function getLastSegmentBeforePeriod(inventory, period) {
    for (var i = 0; i < inventory.length; i++) {
        if (inventory[i].infos.period.start >= period.start) {
            if (i > 0) {
                return inventory[i - 1];
            }
            return null;
        }
    }
    return inventory.length > 0 ? inventory[inventory.length - 1] : null;
}
exports.getLastSegmentBeforePeriod = getLastSegmentBeforePeriod;
/**
 * Returns the first segment in the `inventory` which is linked to a Period
 * after `period`.
 * @param {Array.<Object>} inventory
 * @param {Object} period
 * @returns {Object|null}
 */
function getFirstSegmentAfterPeriod(inventory, period) {
    var e_1, _a;
    try {
        for (var inventory_1 = __values(inventory), inventory_1_1 = inventory_1.next(); !inventory_1_1.done; inventory_1_1 = inventory_1.next()) {
            var segment = inventory_1_1.value;
            if (segment.infos.period.start > period.start) {
                return segment;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (inventory_1_1 && !inventory_1_1.done && (_a = inventory_1.return)) _a.call(inventory_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return null;
}
exports.getFirstSegmentAfterPeriod = getFirstSegmentAfterPeriod;
