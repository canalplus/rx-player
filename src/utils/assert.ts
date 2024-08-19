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

import isNullOrUndefined from "./is_null_or_undefined";

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
 * Throw an AssertionError if the given assertion is false.
 * @param {boolean} assertion
 * @param {string} [message] - Optional message property for the AssertionError.
 * @throws AssertionError - Throws if the assertion given is false
 */
export default function assert(assertion: boolean, message?: string): asserts assertion {
  if (
    (__ENVIRONMENT__.DEV as number) === (__ENVIRONMENT__.CURRENT_ENV as number) &&
    !assertion
  ) {
    throw new AssertionError(message === undefined ? "invalid assertion" : message);
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
  name: string = "object",
): void {
  assert(!isNullOrUndefined(o), `${name} should be an object`);
  for (const k in iface) {
    if (iface.hasOwnProperty(k)) {
      assert(
        typeof o[k] === iface[k],
        `${name} should have property ${k} as a ${iface[k]}`,
      );
    }
  }
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
