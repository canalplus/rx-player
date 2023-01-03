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
import arrayFindIndex from "../utils/array_find_index";
import Adaptation from "./adaptation";
import Period from "./period";
import Representation from "./representation";
import { MANIFEST_UPDATE_TYPE } from "./types";

/**
 * Update oldPeriod attributes with the one from newPeriod (e.g. when updating
 * the Manifest).
 * @param {Object} oldPeriod
 * @param {Object} newPeriod
 * @param {number} updateType
 * @returns {Object}
 */
export default function updatePeriodInPlace(
  oldPeriod : Period,
  newPeriod : Period,
  updateType : MANIFEST_UPDATE_TYPE
) : IUpdatedPeriodResult {
  const res : IUpdatedPeriodResult = {
    updatedAdaptations: [],
    removedAdaptations: [],
    addedAdaptations: [],
  };
  oldPeriod.start = newPeriod.start;
  oldPeriod.end = newPeriod.end;
  oldPeriod.duration = newPeriod.duration;
  oldPeriod.streamEvents = newPeriod.streamEvents;

  const oldAdaptations = oldPeriod.getAdaptations();
  const newAdaptations = newPeriod.getAdaptations();

  for (let j = 0; j < oldAdaptations.length; j++) {
    const oldAdaptation = oldAdaptations[j];
    const newAdaptationIdx = arrayFindIndex(newAdaptations,
                                            a => a.id === oldAdaptation.id);

    if (newAdaptationIdx === -1) {
      log.warn("Manifest: Adaptation \"" +
               oldAdaptations[j].id +
               "\" not found when merging.");
      const [removed] = oldAdaptations.splice(j, 1);
      j--;
      res.removedAdaptations.push(removed);
    } else {
      const [newAdaptation] = newAdaptations.splice(newAdaptationIdx, 1);
      const updatedRepresentations : Representation[] = [];
      const addedRepresentations : Representation[] = [];
      const removedRepresentations : Representation[] = [];
      res.updatedAdaptations.push({ adaptation: oldAdaptation,
                                    updatedRepresentations,
                                    addedRepresentations,
                                    removedRepresentations });

      const oldRepresentations = oldAdaptation.representations;
      const newRepresentations = newAdaptation.representations.slice();

      for (let k = 0; k < oldRepresentations.length; k++) {
        const oldRepresentation = oldRepresentations[k];
        const newRepresentationIdx = arrayFindIndex(newRepresentations, representation =>
          representation.id === oldRepresentation.id);

        if (newRepresentationIdx === -1) {
          log.warn(`Manifest: Representation "${oldRepresentations[k].id}" ` +
                   "not found when merging.");
          const [removed] = oldRepresentations.splice(k, 1);
          k--;
          removedRepresentations.push(removed);
        } else {
          const [newRepresentation] = newRepresentations.splice(newRepresentationIdx, 1);
          updatedRepresentations.push(oldRepresentation);
          oldRepresentation.cdnMetadata = newRepresentation.cdnMetadata;
          if (updateType === MANIFEST_UPDATE_TYPE.Full) {
            oldRepresentation.index._replace(newRepresentation.index);
          } else {
            oldRepresentation.index._update(newRepresentation.index);
          }
        }
      }

      if (newRepresentations.length > 0) {
        log.warn(`Manifest: ${newRepresentations.length} new Representations ` +
                 "found when merging.");
        oldAdaptation.representations.push(...newRepresentations);
        addedRepresentations.push(...newRepresentations);
      }
    }
  }
  if (newAdaptations.length > 0) {
    log.warn(`Manifest: ${newAdaptations.length} new Adaptations ` +
             "found when merging.");
    for (const adap of newAdaptations) {
      const prevAdaps = oldPeriod.adaptations[adap.type];
      if (prevAdaps === undefined) {
        oldPeriod.adaptations[adap.type] = [adap];
      } else {
        prevAdaps.push(adap);
      }
      res.addedAdaptations.push(adap);
    }
  }
  return res;
}

/**
 * Object describing the updates performed by `updatePeriodInPlace` on a single
 * Period.
 */
export interface IUpdatedPeriodResult {
  // XXX TODO doc
  /** `true` if at least one Adaptation has been updated. */
  updatedAdaptations : Array<{
    adaptation: Adaptation;
    /** `true` if at least one Representation has been updated. */
    updatedRepresentations : Representation[];
    /** `true` if at least one Representation has been removed. */
    removedRepresentations : Representation[];
    /** `true` if at least one Representation has been added. */
    addedRepresentations : Representation[];
  }>;
  /** `true` if at least one Adaptation has been removed. */
  removedAdaptations : Adaptation[];
  /** `true` if at least one Adaptation has been added. */
  addedAdaptations : Adaptation[];
}
