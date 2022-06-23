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

import { IProcessedProtectionData } from "../types";
import {
  areKeyIdsEqual,
  areAllKeyIdsContainedIn,
} from "./key_id_comparison";

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
  private readonly _initializationData : IProcessedProtectionData;
  private _keyIds : Uint8Array[] | null;

  /**
   * Create a new `KeySessionRecord`, linked to its corresponding initialization
   * data,
   * @param {Object} initializationData
   */
  constructor(initializationData : IProcessedProtectionData) {
    this._initializationData = initializationData;
    this._keyIds = null;
  }

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
  public associateKeyIds(
    keyIds : Uint8Array[] | IterableIterator<Uint8Array>
  ) : void {
    if (this._keyIds === null) {
      this._keyIds = [];
    }
    const keyIdsArr = Array.from(keyIds);
    for (const keyId of keyIdsArr) {
      if (!this.isAssociatedWithKeyId(keyId)) {
        this._keyIds.push(keyId);
      }
    }
  }

  /**
   * @param {Uint8Array} keyId
   * @returns {boolean}
   */
  public isAssociatedWithKeyId(keyId : Uint8Array) : boolean {
    if (this._keyIds === null) {
      return false;
    }
    for (const storedKeyId of this._keyIds) {
      if (areKeyIdsEqual(storedKeyId, keyId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @returns {Array.<Uint8Array>}
   */
  public getAssociatedKeyIds() : Uint8Array[] {
    if (this._keyIds === null) {
      return [];
    }
    return this._keyIds;
  }

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
  public isCompatibleWith(
    initializationData : IProcessedProtectionData
  ) : boolean {
    const { keyIds } = initializationData;
    if (keyIds !== undefined && keyIds.length > 0) {
      if (this._keyIds !== null && areAllKeyIdsContainedIn(keyIds, this._keyIds)) {
        return true;
      }
      if (this._initializationData.keyIds !== undefined) {
        return areAllKeyIdsContainedIn(keyIds, this._initializationData.keyIds);
      }
    }
    return this._checkInitializationDataCompatibility(initializationData);
  }

  private _checkInitializationDataCompatibility(
    initializationData : IProcessedProtectionData
  ) : boolean {
    if (initializationData.keyIds !== undefined &&
        initializationData.keyIds.length > 0 &&
        this._initializationData.keyIds !== undefined)
    {
      return areAllKeyIdsContainedIn(initializationData.keyIds,
                                     this._initializationData.keyIds);
    }

    if (this._initializationData.type !== initializationData.type) {
      return false;
    }

    return this._initializationData.values
      .isCompatibleWith(initializationData.values);
  }
}
