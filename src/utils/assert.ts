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

// ## START CODE BLOCK: DEBUG-BUILD-ONLY
import isNullOrUndefined from "./is_null_or_undefined";
// ## END CODE BLOCK: DEBUG-BUILD-ONLY

/**
 * Error due to an abnormal assertion fails.
 *
 * This should be an internal error which is later transformed into a documented
 * (as part of the API) Error instance before being emitted to the application.
 * @class AssertionError
 * @extends Error
 */
export class AssertionError extends Error {
  public readonly name: "AssertionError";

  /**
   * @param {string} message
   */
  constructor(message: string) {
    super(message);
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, AssertionError.prototype);

    this.name = "AssertionError";
  }
}

/**
 * Throw an `AssertionError` immediately with the given message only when we're
 * in a debug build. Else, do nothing.
 * @param {string} _message - The message that would be thrown.
 */
export function failInDebugMode(_message: string): void {
  // ## START CODE BLOCK: DEBUG-BUILD-ONLY
  throw new AssertionError(_message);
  // ## END CODE BLOCK: DEBUG-BUILD-ONLY
}

/**
 * Throw an AssertionError if the given assertion is false.
 * @param {boolean} _assertion
 * @param {string} [_message] - Optional message property for the AssertionError.
 * @throws AssertionError - Throws if the assertion given is false
 */
export default function assert(
  _assertion: boolean,
  _message?: string,
): asserts _assertion {
  // ## START CODE BLOCK: DEBUG-BUILD-ONLY
  if (!_assertion) {
    throw new AssertionError(_message === undefined ? "invalid assertion" : _message);
  }
  // ## END CODE BLOCK: DEBUG-BUILD-ONLY
}

type IObjectInterface<T> = Partial<Record<keyof T, string>>;

/**
 * Throws if the given Object does not respect the interface.
 * @param {Object} _o
 * @param {Object} _iface - Contains the checked keynames of _o and link them
 * to their types (obtained through the typeof operator).
 * @param {string} [_name="object"] - name of the _interface_
 * @throws AssertionError - The argument _o given is not an object
 * @throws AssertionError - The _interface_ is not respected.
 */
export function assertInterface<T>(
  _o: T,
  _iface: IObjectInterface<T>,
  _name: string = "object",
): void {
  // ## START CODE BLOCK: DEBUG-BUILD-ONLY
  assert(!isNullOrUndefined(_o), `${_name} should be an object`);
  for (const k in _iface) {
    if (Object.prototype.hasOwnProperty.call(_iface, k)) {
      assert(
        typeof _o[k] === _iface[k],
        `${_name} should have property ${k} as a ${_iface[k]}`,
      );
    }
  }
  // ## END CODE BLOCK: DEBUG-BUILD-ONLY
}

/**
 * TypeScript hack to make sure a code path is never taken.
 *
 * This can for example be used to ensure that a switch statement handle all
 * possible cases by adding a default clause calling assertUnreachable with
 * an argument (it doesn't matter which one).
 *
 * @example
 * function parseBinary(str : "0" | "1") : number {
 *   switch (str) {
 *     case "0:
 *       return 0;
 *     case "1":
 *       return 1;
 *     default:
 *       // branch never taken. If it can be, TypeScript will yell at us because
 *       // its argument (here, `str`) is not of the right type.
 *       assertUnreachable(str);
 *   }
 * }
 * @param {*} _
 * @throws AssertionError - Throw an AssertionError when called. If we're
 * sufficiently strict with how we use TypeScript, this should never happen.
 */
export function assertUnreachable(_: never): never {
  throw new AssertionError("Unreachable path taken");
}
