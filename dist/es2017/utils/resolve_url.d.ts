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
 * In a given URL, find the index at which the filename begins.
 * That is, this function finds the index of the last `/` character and returns
 * the index after it, returning the length of the whole URL if no `/` was found
 * after the scheme (i.e. in `http://`, the slashes are not considered).
 * @param {string} url
 * @returns {number}
 */
declare function getFilenameIndexInUrl(url: string): number;
/**
 * Resolves multiple URL segments using the RFC 3986 URL resolution algorithm.
 *
 * This function takes a variable number of URL segments and resolves them
 * sequentially according to the RFC 3986 URL resolution algorithm.
 * First argument is the base URL.
 * Empty string arguments are ignored.
 *
 * @param {...(string|undefined)} args - The URL segments to resolve.
 * @returns {string} The resolved URL as a string.
 */
export declare function resolveURL(...args: Array<string | undefined>): string;
export { getFilenameIndexInUrl };
export default resolveURL;
//# sourceMappingURL=resolve_url.d.ts.map