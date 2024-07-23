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
Object.defineProperty(exports, "__esModule", { value: true });
var are_arrays_of_numbers_equal_1 = require("../../../utils/are_arrays_of_numbers_equal");
var serializable_bytes_1 = require("./serializable_bytes");
/**
 * Returns `true` if both values are compatible initialization data, which
 * means that one is completely contained in the other.
 *
 * Both values given should be sorted by systemId the same way.
 * @param {Array.<Object>} stored
 * @param {Array.<Object>} newElts
 * @returns {boolean}
 */
function areInitializationValuesCompatible(stored, newElts) {
    var _a, _b;
    return (_b = (_a = _isAInB(stored, newElts)) !== null && _a !== void 0 ? _a : _isAInB(newElts, stored)) !== null && _b !== void 0 ? _b : false;
}
exports.default = areInitializationValuesCompatible;
/**
 * Take two arrays of initialization data values, `a` and `b`, sorted by
 * their `systemId` property in the same order.
 *
 * Returns `true` if `a` is not empty and is completely contained in the `b`
 * array.
 * This is equivalent to: "`a` is contained in `b`".
 *
 * Returns `false` either if `a` is empty or if `b` has different initialization
 * data than it for equivalent system ids.
 * This is equivalent to: "`a` represents different data than `b`".
 *
 * Returns `null` if `a` is not fully contained in `b` but can still be
 * compatible with it.
 * This is equivalent to: "`a` is not contained in `b`, but `b` could be
 * contained in `a`".
 * @param {Array.<Object>} a
 * @param {Array.<Object>} b
 * @returns {boolean}
 */
function _isAInB(a, b) {
    if (a.length === 0) {
        return false;
    }
    if (b.length < a.length) {
        return null;
    }
    var firstAElt = a[0];
    var aIdx = 0;
    var bIdx = 0;
    for (; bIdx < b.length; bIdx++) {
        var bElt = b[bIdx];
        if (bElt.systemId !== firstAElt.systemId) {
            continue;
        }
        if (bElt.hash !== firstAElt.hash) {
            return false;
        }
        var aData = void 0;
        if (firstAElt.data instanceof Uint8Array) {
            aData = firstAElt.data;
        }
        else if (typeof firstAElt.data === "string") {
            aData = serializable_bytes_1.default.decode(firstAElt.data);
        }
        else {
            aData = firstAElt.data.initData;
        }
        var bData = void 0;
        if (bElt.data instanceof Uint8Array) {
            bData = bElt.data;
        }
        else if (typeof bElt.data === "string") {
            bData = serializable_bytes_1.default.decode(bElt.data);
        }
        else {
            bData = bElt.data.initData;
        }
        if (!(0, are_arrays_of_numbers_equal_1.default)(aData, bData)) {
            return false;
        }
        if (b.length - bIdx < a.length) {
            // not enough place to store `a`'s initialization data.
            return null;
        }
        // first `a` value was found. Check if all `a` values are found in `b`
        for (aIdx = 1; aIdx < a.length; aIdx++) {
            var aElt = a[aIdx];
            for (bIdx += 1; bIdx < b.length; bIdx++) {
                var bNewElt = b[bIdx];
                if (aElt.systemId !== bNewElt.systemId) {
                    continue;
                }
                if (aElt.hash !== bNewElt.hash) {
                    return false;
                }
                var aNewData = void 0;
                if (aElt.data instanceof Uint8Array) {
                    aNewData = aElt.data;
                }
                else if (typeof aElt.data === "string") {
                    aNewData = serializable_bytes_1.default.decode(aElt.data);
                }
                else {
                    aNewData = aElt.data.initData;
                }
                var bNewData = void 0;
                if (bNewElt.data instanceof Uint8Array) {
                    bNewData = bNewElt.data;
                }
                else if (typeof bNewElt.data === "string") {
                    bNewData = serializable_bytes_1.default.decode(bNewElt.data);
                }
                else {
                    bNewData = bNewElt.data.initData;
                }
                if (!(0, are_arrays_of_numbers_equal_1.default)(aNewData, bNewData)) {
                    return false;
                }
                break;
            }
            if (aIdx === b.length) {
                // we didn't find `aElt`'s systemId in b
                return null;
            }
        }
        // If we're here, then we've found all `a`'s systemId in `b` and they match
        return true;
    }
    return null; // We didn't find the firstAElt`s systemId in `b`.
}
