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
/** Wrap byte-based data and allow serialization of it into base64. */
export default class SerializableBytes {
    /**
     * The data itself. Named `initData` for legacy reasons (cannot be changed
     * because it has an impact on saved persistent session information.
     */
    initData: Uint8Array;
    /**
     * Create a new `SerializableBytes`, wrapping the initialization data
     * given and allowing serialization into base64.
     * @param {Uint8Array} initData
     */
    constructor(initData: Uint8Array);
    /**
     * Convert it to base64.
     * `toJSON` is specially interpreted by JavaScript engines to be able to rely
     * on it when calling `JSON.stringify` on it or any of its parent objects:
     * https://tc39.es/ecma262/#sec-serializejsonproperty
     * @returns {string}
     */
    toJSON(): string;
    /**
     * Decode a base64 sequence representing an initialization data back to an
     * Uint8Array.
     * @param {string}
     * @returns {Uint8Array}
     */
    static decode(base64: string): Uint8Array;
}
//# sourceMappingURL=serializable_bytes.d.ts.map