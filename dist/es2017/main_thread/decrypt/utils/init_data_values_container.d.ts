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
import type { IInitDataValue } from "../types";
/**
 * Wrap initialization data values and reformat it so it becomes easier to check
 * compatibility with other `InitDataValuesContainer`.
 * @class InitDataValuesContainer
 */
export default class InitDataValuesContainer {
    private readonly _innerValues;
    private _lazyFormattedValues;
    /**
     * Construct a new `InitDataValuesContainer`.
     * Note that the data is not formatted right away.
     * It is only really formatted lazily the first time we need it.
     *
     * @param {Array.<Object>} initDataValues
     */
    constructor(initDataValues: IInitDataValue[]);
    /**
     * Construct data that should be given to the `generateRequest` EME API.
     * @returns {Uint8Array}
     */
    constructRequestData(): Uint8Array;
    /**
     * Returns `true` if the given `InitDataValuesContainer` seems to be
     * "compatible" with the one stored in this instance.
     * Returns `false` if not.
     *
     * By "compatible" we mean that it will generate the same key request.
     * @param {InitDataValuesContainer | Object} initDataValues
     * @returns {boolean}
     */
    isCompatibleWith(initDataValues: InitDataValuesContainer | IFormattedInitDataValue[]): boolean;
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
    getFormattedValues(): IFormattedInitDataValue[];
}
/**
 * Formatted initialization data value, so it is faster to compare to others.
 */
export interface IFormattedInitDataValue {
    systemId: string | undefined;
    hash: number;
    data: Uint8Array;
}
//# sourceMappingURL=init_data_values_container.d.ts.map