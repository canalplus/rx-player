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
var are_arrays_of_numbers_equal_1 = require("../../../utils/are_arrays_of_numbers_equal");
var key_id_comparison_1 = require("./key_id_comparison");
/**
 * Class storing key-related information linked to a created `MediaKeySession`.
 *
 * This class allows to regroup one or multiple key ids and can be linked to a
 * single MediaKeySession so you can know which key that MediaKeySession
 * handles.
 *
 * The main use case behind the complexities of this `KeySessionRecord` is to
 * better handle the `singleLicensePer` RxPlayer option, which allows the
 * recuperation of a license containing multiple keys, even if only one of
 * those keys was asked for (which in turn allows to reduce the number of
 * requests and to improve performance).
 * Here, the `KeySessionRecord` will regroup all those key's id and can be
 * linked to the corresponding MediaKeySession.
 * That way, you can later check if another encrypted content is compatible with
 * that session through the `KeySessionRecord`'s `isCompatibleWith` method.
 *
 * @example
 * ```js
 * const record = new KeySessionRecord(initData);
 *
 * // Create a MediaKeySession linked to that initialization data and fetch the
 * // license
 * // ...
 *
 * // Once the license has been loaded to the MediaKeySession linked to that
 - // initialization data, associate the license's key Ids with the latter.
 * record.associateKeyIds(someKeyIds);
 *
 * // Function called when new initialization data is encountered
 * function onNewInitializationData(newInitializationData) {
 *   if (record.isCompatibleWith(newInitializationData)) {
 *     console.log("This initialization data should already be handled, ignored.");
 *   } else {
 *     console.log("This initialization data is not handled yet.";
 *   }
 * }
 * ```
 * @class KeySessionRecord
 */
var KeySessionRecord = /** @class */ (function () {
    /**
     * Create a new `KeySessionRecord`, linked to its corresponding initialization
     * data,
     * @param {Object} initializationData
     */
    function KeySessionRecord(initializationData) {
        this._initializationData = initializationData;
        this._keyIds = null;
    }
    /**
     * Associate supplementary key ids to this `KeySessionRecord` so it becomes
     * "compatible" to them.
     *
     * After this call, new initialization data linked to subsets of those key
     * ids will be considered compatible  to this `KeySessionRecord` (calls to
     * `isCompatibleWith` with the corresponding initialization data will return
     * `true`).
     * @param {Array.<Uint8Array>} keyIds
     */
    KeySessionRecord.prototype.associateKeyIds = function (keyIds) {
        var e_1, _a;
        if (this._keyIds === null) {
            this._keyIds = [];
        }
        var keyIdsArr = Array.from(keyIds);
        try {
            for (var keyIdsArr_1 = __values(keyIdsArr), keyIdsArr_1_1 = keyIdsArr_1.next(); !keyIdsArr_1_1.done; keyIdsArr_1_1 = keyIdsArr_1.next()) {
                var keyId = keyIdsArr_1_1.value;
                if (!this.isAssociatedWithKeyId(keyId)) {
                    this._keyIds.push(keyId);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (keyIdsArr_1_1 && !keyIdsArr_1_1.done && (_a = keyIdsArr_1.return)) _a.call(keyIdsArr_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * @param {Uint8Array} keyId
     * @returns {boolean}
     */
    KeySessionRecord.prototype.isAssociatedWithKeyId = function (keyId) {
        var e_2, _a;
        if (this._keyIds === null) {
            return false;
        }
        try {
            for (var _b = __values(this._keyIds), _c = _b.next(); !_c.done; _c = _b.next()) {
                var storedKeyId = _c.value;
                if ((0, are_arrays_of_numbers_equal_1.default)(storedKeyId, keyId)) {
                    return true;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return false;
    };
    /**
     * @returns {Array.<Uint8Array>}
     */
    KeySessionRecord.prototype.getAssociatedKeyIds = function () {
        if (this._keyIds === null) {
            return [];
        }
        return this._keyIds;
    };
    /**
     * Check if that `KeySessionRecord` is compatible to the initialization data
     * given.
     *
     * If it returns `true`, it means that this `KeySessionRecord` is already
     * linked to that initialization data's key. As such, if that
     * `KeySessionRecord` is already associated to an active MediaKeySession for
     * example, the content linked to that initialization data should already be
     * handled.
     *
     * If it returns `false`, it means that this `KeySessionRecord` has no
     * relation with the given initialization data.
     *
     * @param {Object} initializationData
     * @returns {boolean}
     */
    KeySessionRecord.prototype.isCompatibleWith = function (initializationData) {
        var keyIds = initializationData.keyIds;
        if (keyIds !== undefined && keyIds.length > 0) {
            if (this._keyIds !== null && (0, key_id_comparison_1.areAllKeyIdsContainedIn)(keyIds, this._keyIds)) {
                return true;
            }
            if (this._initializationData.keyIds !== undefined) {
                return (0, key_id_comparison_1.areAllKeyIdsContainedIn)(keyIds, this._initializationData.keyIds);
            }
        }
        return this._checkInitializationDataCompatibility(initializationData);
    };
    KeySessionRecord.prototype._checkInitializationDataCompatibility = function (initializationData) {
        if (initializationData.keyIds !== undefined &&
            initializationData.keyIds.length > 0 &&
            this._initializationData.keyIds !== undefined) {
            return (0, key_id_comparison_1.areAllKeyIdsContainedIn)(initializationData.keyIds, this._initializationData.keyIds);
        }
        if (this._initializationData.type !== initializationData.type) {
            return false;
        }
        return this._initializationData.values.isCompatibleWith(initializationData.values);
    };
    return KeySessionRecord;
}());
exports.default = KeySessionRecord;
