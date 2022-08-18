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
 * Very simple implementation of Object.assign.
 * Should be sufficient for all use-cases here.
 *
 * Does not support symbols, but this should not be a problem as browsers
 * supporting symbols generally support Object.asign;
 *
 * @param {Object} target
 * @param {Array.<Object>} ...sources
 * @returns {Object}
 */
function objectAssign<T, U>(target : T, source : U) : T & U;
function objectAssign<T, U, V>(target : T, source1 : U, source2 : V) : T & U & V;
function objectAssign<T, U, V, W>(
  target : T,
  source1 : U,
  source2 : V,
  source3 : W) : T & U & V & W;
function objectAssign<T, U>(target : T, ...sources : U[]) : T & U {
  if (target === null || target === undefined) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  // eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment
  const to = Object(target);
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        to[key] = source[key];
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      }
    }
  }
  return to as T & U;
}

// eslint-disable-next-line @typescript-eslint/unbound-method, no-restricted-properties
export default typeof Object.assign === "function" ?
  // eslint-disable-next-line no-restricted-properties
  Object.assign :
  // eslint-disable-next-line  @typescript-eslint/unbound-method
  objectAssign;
