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

import log from "../log";
import arrayFind from "../utils/array_find";
import {
  LoadedPeriod,
  PartialPeriod,
} from "./period";
import { MANIFEST_UPDATE_TYPE } from "./types";

/**
 * Update oldPeriod attributes with the one from newPeriod (e.g. when updating
 * the Manifest).
 * @param {Object} oldPeriod
 * @param {Object} newPeriod
 */
export default function updatePeriodInPlace(oldPeriod : LoadedPeriod,
                                            newPeriod : LoadedPeriod,
                                            updateType : MANIFEST_UPDATE_TYPE) : void;
export default function updatePeriodInPlace(oldPeriod : PartialPeriod,
                                            newPeriod : PartialPeriod,
                                            updateType : MANIFEST_UPDATE_TYPE) : void;
export default function updatePeriodInPlace(
  oldPeriod : PartialPeriod | LoadedPeriod,
  newPeriod : PartialPeriod | LoadedPeriod,
  updateType : MANIFEST_UPDATE_TYPE
) : void {
  oldPeriod.start = newPeriod.start;
  oldPeriod.end = newPeriod.end;
  oldPeriod.duration = newPeriod.duration;

  if (!oldPeriod.isLoaded) {
    if (newPeriod.isLoaded) { // Shouldn't happen
      log.error("Manifest: Shouldn't be trying to update in place " +
                "a PartialPeriod with a LoadedPeriod");
    }
    return;
  } else if (!newPeriod.isLoaded) { // Shouldn't happen
    log.error("Manifest: Shouldn't be trying to update in place " +
              "a LoadedPeriod with a PartialPeriod");
    return;
  }

  const oldAdaptations = oldPeriod.getAdaptations();
  const newAdaptations = newPeriod.getAdaptations();

  for (let j = 0; j < oldAdaptations.length; j++) {
    const oldAdaptation = oldAdaptations[j];
    const newAdaptation = arrayFind(newAdaptations,
                                    a => a.id === oldAdaptation.id);
    if (newAdaptation === undefined) {
      log.warn("Manifest: Adaptation \"" +
               oldAdaptations[j].id +
               "\" not found when merging.");
    } else {
      const oldRepresentations = oldAdaptations[j].representations;
      const newRepresentations = newAdaptation.representations;

      for (let k = 0; k < oldRepresentations.length; k++) {
        const oldRepresentation = oldRepresentations[k];
        const newRepresentation =
          arrayFind(newRepresentations,
                    representation => representation.id === oldRepresentation.id);

        if (newRepresentation === undefined) {
          log.warn(`Manifest: Representation "${oldRepresentations[k].id}" ` +
                   "not found when merging.");
        } else {
          if (updateType === MANIFEST_UPDATE_TYPE.Full) {
            oldRepresentation.index._replace(newRepresentation.index);
          } else {
            oldRepresentation.index._update(newRepresentation.index);
          }
        }
      }
    }
  }
}
