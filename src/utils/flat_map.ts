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
 * Map each element using a mapping function, then flat the result into
 * a new array.
 * @param {Array.<*>} originalArray
 * @param {Function} fn
 */
export default function flatMap<T, U>(
  originalArray : T[],
  fn: (arg: T) => U[]|U
) : U[] {
  /* eslint-disable @typescript-eslint/unbound-method */
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  if (typeof (Array.prototype as any).flatMap === "function") {
    return (originalArray as any).flatMap(fn);
  }
  /* eslint-enable @typescript-eslint/unbound-method */
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  /* eslint-enable @typescript-eslint/no-unsafe-return */
  /* eslint-enable @typescript-eslint/no-unsafe-call */

  return originalArray.reduce((acc : U[], arg : T) : U[] => {
    const r = fn(arg);
    if (Array.isArray(r)) {
      acc.push(...r);
      return acc;
    }
    acc.push(r);
    return acc;
  }, []);
}
