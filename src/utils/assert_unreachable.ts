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
export default function assertUnreachable(_: never): never {
  throw new AssertionError("Unreachable path taken");
}
