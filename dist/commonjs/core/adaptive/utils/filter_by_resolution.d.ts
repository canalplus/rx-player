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
import type { IRepresentation } from "../../../manifest";
/**
 * Filter representations based on their resolution.
 *   - the highest resolution considered will be the one linked to the first
 *     representation which has a superior resolution or equal to the one
 *     given.
 * @param {Array.<Object>} representations - The representations array
 * @param {Object} resolution
 * @returns {Array.<Object>}
 */
export default function filterByResolution(representations: IRepresentation[], resolution: IResolutionInfo): IRepresentation[];
export interface IResolutionInfo {
    height: number | undefined;
    width: number | undefined;
    pixelRatio: number;
}
//# sourceMappingURL=filter_by_resolution.d.ts.map