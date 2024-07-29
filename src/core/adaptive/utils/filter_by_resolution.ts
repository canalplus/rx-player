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

import arrayFind from "../../../utils/array_find";
import type { IRepresentationListItem } from "../adaptive_representation_selector";

/**
 * Filter representations based on their resolution.
 *   - the highest resolution considered will be the one linked to the first
 *     representation which has a superior resolution or equal to the one
 *     given.
 * @param {Array.<Object>} representationList - The representations array
 * @param {Object} resolution
 * @returns {Array.<Object>}
 */
export default function filterByResolution(
  representationList: IRepresentationListItem[],
  resolution: IResolutionInfo,
): IRepresentationListItem[] {
  if (resolution.width === undefined || resolution.height === undefined) {
    return representationList;
  }
  const width = resolution.width * resolution.pixelRatio;
  const height = resolution.height * resolution.pixelRatio;
  const sortedRepsByWidth = representationList
    .slice() // clone
    .sort((a, b) => (a.representation.width ?? 0) - (b.representation.width ?? 0));

  const itemWithMaxWidth = arrayFind(
    sortedRepsByWidth,
    (item) =>
      typeof item.representation.width === "number" &&
      item.representation.width >= width &&
      typeof item.representation.height === "number" &&
      item.representation.height >= height,
  );

  if (itemWithMaxWidth === undefined) {
    return representationList;
  }

  const maxWidth =
    typeof itemWithMaxWidth.representation.width === "number"
      ? itemWithMaxWidth.representation.width
      : 0;
  return representationList.filter((item) =>
    typeof item.representation.width === "number"
      ? item.representation.width <= maxWidth
      : true,
  );
}

export interface IResolutionInfo {
  height: number | undefined;
  width: number | undefined;
  pixelRatio: number;
}
