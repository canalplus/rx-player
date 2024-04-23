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
/** Data recuperated from parsing the payload of an `encrypted` event. */
export interface IEncryptedEventData {
    /**
     * Initialization data type.
     * String describing the format of the initialization data sent through this
     * event.
     * https://www.w3.org/TR/eme-initdata-registry/
     *
     * `undefined` if not known.
     */
    type: string | undefined;
    /** Every initialization data for that type. */
    values: Array<{
        /**
         * Hex encoded system id, which identifies the key system.
         * https://dashif.org/identifiers/content_protection/
         *
         * If `undefined`, we don't know the system id for that initialization data.
         * In that case, the initialization data might even be a concatenation of
         * the initialization data from multiple system ids.
         */
        systemId: string | undefined;
        /**
         * The initialization data itself for that type and systemId.
         * For example, with ISOBMFF "cenc" initialization data, this will be the
         * whole PSSH box.
         */
        data: Uint8Array;
    }>;
}
/**
 * Take out the two things we need on an encryptedEvent:
 *   - the initialization Data
 *   - the initialization Data type
 *
 * @param {MediaEncryptedEvent} encryptedEvent - Payload received with an
 * "encrypted" event.
 * @returns {Object} - Initialization data and Initialization data type.
 * @throws {EncryptedMediaError} - Throws if no initialization data is
 * encountered in the given event.
 */
export default function getInitData(encryptedEvent: MediaEncryptedEvent): IEncryptedEventData | null;
