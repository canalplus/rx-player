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

import { AssertionError } from "../errors";
import isNullOrUndefined from "./is_null_or_undefined";

/**
 * Throw an AssertionError if the given assertion is false.
 * @param {boolean} assertion
 * @param {string} [message] - Optional message property for the AssertionError.
 * @throws AssertionError - Throws if the assertion given is false
 */
export default function assert(
  assertion : boolean,
  message? : string
) : asserts assertion {
  if (!assertion) {
    throw new AssertionError(message === undefined ? "invalid assertion" :
                                                     message);
  }
}

type IObjectInterface<T> = Partial<Record<keyof T, string>>;

/**
 * Throws if the given Object does not respect the interface.
 * @param {Object} o
 * @param {Object} iface - Contains the checked keynames of o and link them
 * to their types (obtained through the typeof operator).
 * @param {string} [name="object"] - name of the _interface_
 * @throws AssertionError - The argument o given is not an object
 * @throws AssertionError - The _interface_ is not respected.
 */
export function assertInterface<T>(
  o: T,
  iface: IObjectInterface<T>,
  name: string = "object"
) : void {
  assert(!isNullOrUndefined(o), `${name} should be an object`);
  for (const k in iface) {
    if (iface.hasOwnProperty(k)) {
      /* eslint-disable max-len  */
      /* eslint-disable @typescript-eslint/restrict-template-expressions */
      assert(typeof o[k] === iface[k], `${name} should have property ${k} as a ${iface[k]}`);
      /* eslint-enable max-len */
      /* eslint-enable @typescript-eslint/restrict-template-expressions */
    }
  }
}
