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
import type { IProcessedProtectionData } from "../types";
/**
 * Class storing key-related information linked to a created `MediaKeySession`.
 *
 * This class allows to regroup one or multiple key ids and can be linked to a
 * single MediaKeySession so you can know which key that MediaKeySession
 * handles.
 *
 * The main use case behind the complexities of this `KeySessionRecord` is to
 * better handle the `singleLicensePer` RxPlayer option, which allows the
 * recuperation of a license containing multiple keys, even if only one of
 * those keys was asked for (which in turn allows to reduce the number of
 * requests and to improve performance).
 * Here, the `KeySessionRecord` will regroup all those key's id and can be
 * linked to the corresponding MediaKeySession.
 * That way, you can later check if another encrypted content is compatible with
 * that session through the `KeySessionRecord`'s `isCompatibleWith` method.
 *
 * @example
 * ```js
 * const record = new KeySessionRecord(initData);
 *
 * // Create a MediaKeySession linked to that initialization data and fetch the
 * // license
 * // ...
 *
 * // Once the license has been loaded to the MediaKeySession linked to that
 - // initialization data, associate the license's key Ids with the latter.
 * record.associateKeyIds(someKeyIds);
 *
 * // Function called when new initialization data is encountered
 * function onNewInitializationData(newInitializationData) {
 *   if (record.isCompatibleWith(newInitializationData)) {
 *     console.log("This initialization data should already be handled, ignored.");
 *   } else {
 *     console.log("This initialization data is not handled yet.";
 *   }
 * }
 * ```
 * @class KeySessionRecord
 */
export default class KeySessionRecord {
    private readonly _initializationData;
    private _keyIds;
    /**
     * Create a new `KeySessionRecord`, linked to its corresponding initialization
     * data,
     * @param {Object} initializationData
     */
    constructor(initializationData: IProcessedProtectionData);
    /**
     * Associate supplementary key ids to this `KeySessionRecord` so it becomes
     * "compatible" to them.
     *
     * After this call, new initialization data linked to subsets of those key
     * ids will be considered compatible  to this `KeySessionRecord` (calls to
     * `isCompatibleWith` with the corresponding initialization data will return
     * `true`).
     * @param {Array.<Uint8Array>} keyIds
     */
    associateKeyIds(keyIds: Uint8Array[] | IterableIterator<Uint8Array>): void;
    /**
     * @param {Uint8Array} keyId
     * @returns {boolean}
     */
    isAssociatedWithKeyId(keyId: Uint8Array): boolean;
    /**
     * @returns {Array.<Uint8Array>}
     */
    getAssociatedKeyIds(): Uint8Array[];
    /**
     * Check if that `KeySessionRecord` is compatible to the initialization data
     * given.
     *
     * If it returns `true`, it means that this `KeySessionRecord` is already
     * linked to that initialization data's key. As such, if that
     * `KeySessionRecord` is already associated to an active MediaKeySession for
     * example, the content linked to that initialization data should already be
     * handled.
     *
     * If it returns `false`, it means that this `KeySessionRecord` has no
     * relation with the given initialization data.
     *
     * @param {Object} initializationData
     * @returns {boolean}
     */
    isCompatibleWith(initializationData: IProcessedProtectionData): boolean;
    private _checkInitializationDataCompatibility;
}
//# sourceMappingURL=key_session_record.d.ts.map