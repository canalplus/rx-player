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
var log_1 = require("../../../log");
var array_find_index_1 = require("../../../utils/array_find_index");
var array_includes_1 = require("../../../utils/array_includes");
var object_assign_1 = require("../../../utils/object_assign");
/**
 * Transform all styles inheriting from other styles to the same styles but with
 * the inheritance removed (by resolving those inheritance here).
 *
 * Note that the original style object is directly mutated with every
 * inheritance they had resolved and removed.
 *
 * To make a pseudo-code analogy this would be equivalent to transform those
 * two classes:
 * ```
 * class A {
 *   methodA() {}
 * }
 *
 * class B extends A {
 *   method B() {}
 * }
 * ```
 * into the same two classes without inheritance:
 * ```
 * class A {
 *   methodA() {}
 * }
 * class B {
 *   methodA() {} // inherited from class A
 *   methodB() {}
 * }
 * ```
 *
 * Doing this here allows to simplify further treatment of those styles.
 * @param {Array.<Object>} styles
 */
function resolveStylesInheritance(styles) {
    // keep track of all the indexes parsed to avoid infinite loops
    var recursivelyBrowsedIndexes = [];
    function resolveStyleInheritance(styleElt, index) {
        recursivelyBrowsedIndexes.push(index);
        var _loop_1 = function (j) {
            var extendedStyleID = styleElt.extendsStyles[j];
            var extendedStyleIndex = (0, array_find_index_1.default)(styles, function (x) { return x.id === extendedStyleID; });
            if (extendedStyleIndex < 0) {
                log_1.default.warn("TTML Parser: unknown style inheritance: " + extendedStyleID);
            }
            else {
                var extendedStyle = styles[extendedStyleIndex];
                if ((0, array_includes_1.default)(recursivelyBrowsedIndexes, extendedStyleIndex)) {
                    log_1.default.warn("TTML Parser: infinite style inheritance loop avoided");
                }
                else {
                    resolveStyleInheritance(extendedStyle, extendedStyleIndex);
                }
                styleElt.style = (0, object_assign_1.default)({}, extendedStyle.style, styleElt.style);
            }
        };
        for (var j = 0; j < styleElt.extendsStyles.length; j++) {
            _loop_1(j);
        }
        styleElt.extendsStyles.length = 0;
    }
    for (var i = 0; i < styles.length; i++) {
        resolveStyleInheritance(styles[i], i);
        recursivelyBrowsedIndexes.length = 0; // reset
    }
}
exports.default = resolveStylesInheritance;
