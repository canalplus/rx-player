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

import type { ITNode } from "../../../../utils/xml-parser";

/**
 * Reduce implementation for the children of the given element.
 * @param {Element} root
 * @param {Function} fn
 * @param {*} init
 * @returns {*}
 */
export default function reduceChildren<T>(
  root: ITNode,
  fn: (accu: T, nodeName: string, nodeElt: ITNode) => T,
  init: T,
): T {
  let accumulator = init;
  for (const elt of root.children) {
    if (typeof elt !== "string") {
      accumulator = fn(accumulator, elt.tagName, root);
    }
  }
  return accumulator;
}
