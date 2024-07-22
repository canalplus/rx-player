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
import type { IAdaptationMetadata, IRepresentationMetadata } from "../../manifest";
import type { ITrackType } from "../../public_types";
import type Period from "./period";
import { MANIFEST_UPDATE_TYPE } from "./types";
/**
 * Update oldPeriod attributes with the one from newPeriod (e.g. when updating
 * the Manifest).
 * @param {Object} oldPeriod
 * @param {Object} newPeriod
 * @param {number} updateType
 * @returns {Object}
 */
export default function updatePeriodInPlace(oldPeriod: Period, newPeriod: Period, updateType: MANIFEST_UPDATE_TYPE): IUpdatedPeriodResult;
/**
 * Object describing the updates performed by `updatePeriodInPlace` on a single
 * Period.
 */
export interface IUpdatedPeriodResult {
    /** Information on Adaptations that have been updated. */
    updatedAdaptations: Array<{
        trackType: ITrackType;
        /** The concerned Adaptation. */
        adaptation: string;
        /** Representations that have been updated. */
        updatedRepresentations: IRepresentationMetadata[];
        /** Representations that have been removed from the Adaptation. */
        removedRepresentations: string[];
        /** Representations that have been added to the Adaptation. */
        addedRepresentations: IRepresentationMetadata[];
    }>;
    /** Adaptation that have been removed from the Period. */
    removedAdaptations: Array<{
        id: string;
        trackType: ITrackType;
    }>;
    /** Adaptation that have been added to the Period. */
    addedAdaptations: IAdaptationMetadata[];
}
//# sourceMappingURL=update_period_in_place.d.ts.map