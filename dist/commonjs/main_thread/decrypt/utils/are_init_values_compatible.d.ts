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
import SerializableBytes from "./serializable_bytes";
/**
 * Returns `true` if both values are compatible initialization data, which
 * means that one is completely contained in the other.
 *
 * Both values given should be sorted by systemId the same way.
 * @param {Array.<Object>} stored
 * @param {Array.<Object>} newElts
 * @returns {boolean}
 */
export default function areInitializationValuesCompatible(stored: Array<{
    systemId: string | undefined;
    hash: number;
    data: Uint8Array | SerializableBytes | string;
}>, newElts: Array<{
    systemId: string | undefined;
    hash: number;
    data: Uint8Array | SerializableBytes | string;
}>): boolean;
