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
/**
 * Reduce implementation for the children of the given element.
 * @param {Element} root
 * @param {Function} fn
 * @param {*} init
 * @returns {*}
 */
export default function reduceChildren(root, fn, init) {
    let node = root.firstElementChild;
    let accumulator = init;
    while (node !== null) {
        accumulator = fn(accumulator, node.nodeName, node);
        node = node.nextElementSibling;
    }
    return accumulator;
}
