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
 * Returns the first argument given different from undefined or null.
 * @param {...*} args
 * @returns {*}
 */
export default function takeFirstSet<T>(
  a : T,
  b? : undefined | null | T
) : T;
export default function takeFirstSet<T>(a : T | undefined | null, b : T) : T;
export default function takeFirstSet(
  a? : undefined|null,
  b? : undefined|null
) : undefined;
export default function takeFirstSet<T>(
  a : undefined|null|T,
  b : undefined|null|T,
  c : T
) : T;
export default function takeFirstSet<T>(...args : Array<T|null|undefined>) : T |
                                                                             undefined;
export default function takeFirstSet<T>(
  ...args : Array<T|null|undefined>
) : T | undefined {
  let i = 0;
  const len = args.length;
  while (i < len) {
    const arg = args[i];
    if (!isNullOrUndefined(arg)) {
      return arg;
    }
    i++;
  }
  return undefined;
}
