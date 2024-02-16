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
 * Internal error used to better handle errors happening when a custom
 * `segmentLoader` or `manifestLoader` has been used.
 *
 * It is not part of the API, as such it is only a temporary error which is
 * later converted to another Error instance (e.g. NETWORK_ERROR).
 * @class CustomLoaderError
 * @extends Error
 */
export default class CustomLoaderError extends Error {
    readonly name: "CustomLoaderError";
    readonly message: string;
    readonly canRetry: boolean;
    readonly xhr: XMLHttpRequest | undefined;
    /**
     * @param {string} message
     * @param {boolean} canRetry
     * @param {XMLHttpRequest} xhr
     */
    constructor(message: string, canRetry: boolean, xhr: XMLHttpRequest | undefined);
}
