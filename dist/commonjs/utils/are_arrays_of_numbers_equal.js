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
/**
 * Check if two two arrays containing only numbers are equal.
 * @param {Array.<number>|TypedArray} arr1
 * @param {Array.<number>|TypedArray} arr2
 * @returns {Boolean}
 */
function areArraysOfNumbersEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    if (arr1 === arr2) {
        return true;
    }
    for (var i = arr1.length - 1; i >= 0; i--) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}
exports.default = areArraysOfNumbersEqual;
