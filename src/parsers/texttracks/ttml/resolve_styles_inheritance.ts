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

import log from "../../../log";
import arrayFindIndex from "../../../utils/array_find_index";
import arrayIncludes from "../../../utils/array_includes";
import objectAssign from "../../../utils/object_assign";
import { IStyleObject } from "./get_styling";

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
export default function resolveStylesInheritance(
  styles : IStyleObject[]
) : void {
  // keep track of all the indexes parsed to avoid infinite loops
  const recursivelyBrowsedIndexes : number[] = [];
  function resolveStyleInheritance(styleElt : IStyleObject, index : number) {
    recursivelyBrowsedIndexes.push(index);
    for (let j = 0; j < styleElt.extendsStyles.length; j++) {
      const extendedStyleID = styleElt.extendsStyles[j];
      const extendedStyleIndex = arrayFindIndex(styles,
                                                (x) => x.id === extendedStyleID);
      if (extendedStyleIndex < 0) {
        log.warn("TTML Parser: unknown style inheritance: " + extendedStyleID);
      } else {
        const extendedStyle = styles[extendedStyleIndex];
        if (arrayIncludes(recursivelyBrowsedIndexes, extendedStyleIndex)) {
          log.warn("TTML Parser: infinite style inheritance loop avoided");
        } else {
          resolveStyleInheritance(extendedStyle, extendedStyleIndex);
        }
        styleElt.style = objectAssign({}, extendedStyle.style, styleElt.style);
      }
    }
    styleElt.extendsStyles.length = 0;
  }
  for (let i = 0; i < styles.length; i++) {
    resolveStyleInheritance(styles[i], i);
    recursivelyBrowsedIndexes.length = 0; // reset
  }
}
