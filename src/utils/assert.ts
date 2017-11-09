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

import AssertionError from "../errors/AssertionError";

// TODO better syntax
interface IAssertFunctions {
  (a : any, message? : string) : void;
  equal : (a : any, b : any, message? : string) => void;
  iface : (o : any, name : string, iface : any) => void;
}

/**
 * @param {*} value
 * @param {string} message
 * @throws AssertionError - Throws if the value given is falsy
 */
const assert = <IAssertFunctions> function(value : any, message? : string) {
  if (!value) {
    throw new AssertionError(message || "invalid assertion");
  }
};

// TODO Rename assertEqual
assert.equal = function(a : any, b : any, message? : string) {
  return assert(a === b, message);
};

// TODO Rename assertInterface
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
      /* tslint:disable:max-line-length */
      assert.equal(typeof o[k], iface[k], `${name} should have property ${k} as a ${iface[k]}`);
      /* tslint:enable:max-line-length */
    }
  }
};

export default assert;
