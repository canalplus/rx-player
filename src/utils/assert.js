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

function AssertionError(message) {
  this.name = "AssertionError";
  this.message = message;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, AssertionError);
  }
}
AssertionError.prototype = new Error();

/**
 * @param {*} value
 * @param {string} message
 * @throws AssertionError - Throws if the value given is falsy
 */
function assert(value, message) {
  if (!value) {
    throw new AssertionError(message);
  }
}

assert.equal = function(a, b, message) {
  return assert(a === b, message);
};

/**
 * @param {Object} o
 * @param {string} name - name of the _interface_
 * @param {Object} iface - Contains the checked keynames of O and link them
 * to their types (obtained through the typeof operator).
 * @throws AssertionError - The argument o given is not an object
 * @throws AssertionError - The _interface_ is not respected.
 */
assert.iface = function(o, name, iface) {
  assert(o, `${name} should be an object`);
  for (const k in iface) {
    if (iface.hasOwnProperty(k)) {
      assert.equal(typeof o[k], iface[k], `${name} should have property ${k} as a ${iface[k]}`);
    }
  }
};

export default assert;
