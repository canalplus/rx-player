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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var byte_parsing_1 = require("../../../utils/byte_parsing");
var hash_buffer_1 = require("../../../utils/hash_buffer");
var are_init_values_compatible_1 = require("./are_init_values_compatible");
/**
 * Wrap initialization data values and reformat it so it becomes easier to check
 * compatibility with other `InitDataValuesContainer`.
 * @class InitDataValuesContainer
 */
var InitDataValuesContainer = /** @class */ (function () {
    /**
     * Construct a new `InitDataValuesContainer`.
     * Note that the data is not formatted right away.
     * It is only really formatted lazily the first time we need it.
     *
     * @param {Array.<Object>} initDataValues
     */
    function InitDataValuesContainer(initDataValues) {
        this._innerValues = initDataValues;
        this._lazyFormattedValues = null;
    }
    /**
     * Construct data that should be given to the `generateRequest` EME API.
     * @returns {Uint8Array}
     */
    InitDataValuesContainer.prototype.constructRequestData = function () {
        // `generateKeyRequest` awaits a single Uint8Array containing all
        // initialization data.
        return byte_parsing_1.concat.apply(void 0, __spreadArray([], __read(this._innerValues.map(function (i) { return i.data; })), false));
    };
    /**
     * Returns `true` if the given `InitDataValuesContainer` seems to be
     * "compatible" with the one stored in this instance.
     * Returns `false` if not.
     *
     * By "compatible" we mean that it will generate the same key request.
     * @param {InitDataValuesContainer | Object} initDataValues
     * @returns {boolean}
     */
    InitDataValuesContainer.prototype.isCompatibleWith = function (initDataValues) {
        var formatted = initDataValues instanceof InitDataValuesContainer
            ? initDataValues.getFormattedValues()
            : initDataValues;
        return (0, are_init_values_compatible_1.default)(this.getFormattedValues(), formatted);
    };
    /**
     * Return the stored initialization data values, with added niceties:
     *   - they are sorted always the same way for similar
     *     `InitDataValuesContainer`
     *   - each value is associated to its hash, which is always done with  the
     *     same hashing function than for all other InitDataValuesContainer).
     *
     * The main point being to be able to compare much faster multiple
     * `InitDataValuesContainer`, though that data can also be used in any
     * other way.
     * @returns {Array.<Object>}
     */
    InitDataValuesContainer.prototype.getFormattedValues = function () {
        if (this._lazyFormattedValues === null) {
            this._lazyFormattedValues = formatInitDataValues(this._innerValues);
        }
        return this._lazyFormattedValues;
    };
    return InitDataValuesContainer;
}());
exports.default = InitDataValuesContainer;
/**
 * Format given initializationData's values so they are faster to compare:
 *   - sort them by systemId
 *   - add hash for each initialization data encountered.
 * @param {Array.<Object>} initialValues
 * @returns {Array.<Object>}
 */
function formatInitDataValues(initialValues) {
    return initialValues
        .slice()
        .sort(function (a, b) {
        if (a.systemId === b.systemId) {
            return 0;
        }
        if (a.systemId === undefined) {
            return 1;
        }
        if (b.systemId === undefined) {
            return -1;
        }
        if (a.systemId < b.systemId) {
            return -1;
        }
        return 1;
    })
        .map(function (_a) {
        var systemId = _a.systemId, data = _a.data;
        return ({ systemId: systemId, data: data, hash: (0, hash_buffer_1.default)(data) });
    });
}
