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

import { concat } from "../../../utils/byte_parsing";
import hashBuffer from "../../../utils/hash_buffer";
import type { IInitDataValue } from "../types";
import areInitializationValuesCompatible from "./are_init_values_compatible";

/**
 * Wrap initialization data values and reformat it so it becomes easier to check
 * compatibility with other `InitDataValuesContainer`.
 * @class InitDataValuesContainer
 */
export default class InitDataValuesContainer {
  private readonly _innerValues: IInitDataValue[];
  private _lazyFormattedValues: IFormattedInitDataValue[] | null;

  /**
   * Construct a new `InitDataValuesContainer`.
   * Note that the data is not formatted right away.
   * It is only really formatted lazily the first time we need it.
   *
   * @param {Array.<Object>} initDataValues
   */
  constructor(initDataValues: IInitDataValue[]) {
    this._innerValues = initDataValues;
    this._lazyFormattedValues = null;
  }

  /**
   * Construct data that should be given to the `generateRequest` EME API.
   * @returns {Uint8Array}
   */
  public constructRequestData(): Uint8Array {
    // `generateKeyRequest` awaits a single Uint8Array containing all
    // initialization data.
    return concat(...this._innerValues.map((i) => i.data));
  }

  /**
   * Returns `true` if the given `InitDataValuesContainer` seems to be
   * "compatible" with the one stored in this instance.
   * Returns `false` if not.
   *
   * By "compatible" we mean that it will generate the same key request.
   * @param {InitDataValuesContainer | Object} initDataValues
   * @returns {boolean}
   */
  public isCompatibleWith(
    initDataValues: InitDataValuesContainer | IFormattedInitDataValue[],
  ): boolean {
    const formatted =
      initDataValues instanceof InitDataValuesContainer
        ? initDataValues.getFormattedValues()
        : initDataValues;
    return areInitializationValuesCompatible(this.getFormattedValues(), formatted);
  }

  /**
   * Return the stored initialization data values, with added niceties:
   *   - they are sorted always the same way for similar
   *     `InitDataValuesContainer`
   *   - each value is associated to its hash, which is always done with  the
   *     same hashing function than for all other InitDataValuesContainer).
   *
   * The main point being to be able to compare much faster multiple
   * `InitDataValuesContainer`, though that data can also be used in any
   * other way.
   * @returns {Array.<Object>}
   */
  public getFormattedValues(): IFormattedInitDataValue[] {
    if (this._lazyFormattedValues === null) {
      this._lazyFormattedValues = formatInitDataValues(this._innerValues);
    }
    return this._lazyFormattedValues;
  }
}

/**
 * Format given initializationData's values so they are faster to compare:
 *   - sort them by systemId
 *   - add hash for each initialization data encountered.
 * @param {Array.<Object>} initialValues
 * @returns {Array.<Object>}
 */
function formatInitDataValues(
  initialValues: IInitDataValue[],
): IFormattedInitDataValue[] {
  return initialValues
    .slice()
    .sort((a, b) => {
      if (a.systemId === b.systemId) {
        return 0;
      }
      if (a.systemId === undefined) {
        return 1;
      }
      if (b.systemId === undefined) {
        return -1;
      }
      if (a.systemId < b.systemId) {
        return -1;
      }
      return 1;
    })
    .map(({ systemId, data }) => ({ systemId, data, hash: hashBuffer(data) }));
}

/**
 * Formatted initialization data value, so it is faster to compare to others.
 */
export interface IFormattedInitDataValue {
  systemId: string | undefined;
  hash: number;
  data: Uint8Array;
}
