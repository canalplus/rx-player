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
exports.areSomeKeyIdsContainedIn = exports.areAllKeyIdsContainedIn = void 0;
var are_arrays_of_numbers_equal_1 = require("../../../utils/are_arrays_of_numbers_equal");
/**
 * Returns `true` if all key ids in `wantedKeyIds` are present in the
 * `keyIdsArr` array.
 * @param {Array.<Uint8Array>} wantedKeyIds
 * @param {Array.<Uint8Array>} keyIdsArr
 * @returns {boolean}
 */
function areAllKeyIdsContainedIn(wantedKeyIds, keyIdsArr) {
    var e_1, _a;
    var _loop_1 = function (keyId) {
        var found = keyIdsArr.some(function (k) { return (0, are_arrays_of_numbers_equal_1.default)(k, keyId); });
        if (!found) {
            return { value: false };
        }
    };
    try {
        for (var wantedKeyIds_1 = __values(wantedKeyIds), wantedKeyIds_1_1 = wantedKeyIds_1.next(); !wantedKeyIds_1_1.done; wantedKeyIds_1_1 = wantedKeyIds_1.next()) {
            var keyId = wantedKeyIds_1_1.value;
            var state_1 = _loop_1(keyId);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (wantedKeyIds_1_1 && !wantedKeyIds_1_1.done && (_a = wantedKeyIds_1.return)) _a.call(wantedKeyIds_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return true;
}
exports.areAllKeyIdsContainedIn = areAllKeyIdsContainedIn;
/**
 * Returns `true` if at least one key id in `wantedKeyIds` is present in the
 * `keyIdsArr` array.
 * @param {Array.<Uint8Array>} wantedKeyIds
 * @param {Array.<Uint8Array>} keyIdsArr
 * @returns {boolean}
 */
function areSomeKeyIdsContainedIn(wantedKeyIds, keyIdsArr) {
    var e_2, _a;
    var _loop_2 = function (keyId) {
        var found = keyIdsArr.some(function (k) { return (0, are_arrays_of_numbers_equal_1.default)(k, keyId); });
        if (found) {
            return { value: true };
        }
    };
    try {
        for (var wantedKeyIds_2 = __values(wantedKeyIds), wantedKeyIds_2_1 = wantedKeyIds_2.next(); !wantedKeyIds_2_1.done; wantedKeyIds_2_1 = wantedKeyIds_2.next()) {
            var keyId = wantedKeyIds_2_1.value;
            var state_2 = _loop_2(keyId);
            if (typeof state_2 === "object")
                return state_2.value;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (wantedKeyIds_2_1 && !wantedKeyIds_2_1.done && (_a = wantedKeyIds_2.return)) _a.call(wantedKeyIds_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return false;
}
exports.areSomeKeyIdsContainedIn = areSomeKeyIdsContainedIn;
