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
 * WITHOUT WARRANTIE OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import isNullOrUndefined from "../utils/is_null_or_undefined";
import features from "./features_object";
import { IFeature } from "./types";

/**
 * @param {Array.<Object>} featureFuncList
 */
export default function addFeatures(featureFuncList : IFeature[]) : void {
  for (let i = 0; i < featureFuncList.length; i++) {
    const addFeature = featureFuncList[i];
    if (typeof addFeature === "function") {
      addFeature(features);
    } else if (!isNullOrUndefined(addFeature) &&
               typeof addFeature._addFeature === "function")
    {
      addFeature._addFeature(features);
    } else {
      throw new Error("Unrecognized feature");
    }
  }
}
