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
import type { IPeriodMetadata } from "../../manifest";
import type { IPeriod } from "../../public_types";
import type Period from "./period";
import type { IUpdatedPeriodResult } from "./update_period_in_place";
/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 * @returns {Object}
 */
export declare function replacePeriods(oldPeriods: Period[], newPeriods: Period[]): IPeriodsUpdateResult;
/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 * @returns {Object}
 */
export declare function updatePeriods(oldPeriods: Period[], newPeriods: Period[]): IPeriodsUpdateResult;
export type IUpdatePeriodInformation = Pick<IPeriodMetadata, "id" | "start" | "end" | "duration" | "streamEvents">;
/** Object describing a Manifest update at the Periods level. */
export interface IPeriodsUpdateResult {
    /** Information on Periods that have been updated. */
    updatedPeriods: Array<{
        /** The concerned Period's information. */
        period: IUpdatePeriodInformation;
        /** The updates performed. */
        result: IUpdatedPeriodResult;
    }>;
    /** Periods that have been added. */
    addedPeriods: IPeriodMetadata[];
    /** Periods that have been removed. */
    removedPeriods: IPeriod[];
}
