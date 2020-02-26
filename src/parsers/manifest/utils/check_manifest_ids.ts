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

import log from "../../../log";
import arrayIncludes from "../../../utils/array_includes";
import {
  IParsedAdaptationType,
  IParsedManifest,
} from "../types";

/**
 * Ensure that no two periods, adaptations from the same period and
 * representations from the same adaptation, have the same ID.
 *
 * Log and mutate their ID if not until this is verified.
 *
 * @param {Object} manifest
 */
export default function checkManifestIDs(
  manifest : IParsedManifest
) : void {
  const periodIDS : string[] = [];
  manifest.periods.forEach((period) => {
    const periodID = period.id;
    if (arrayIncludes(periodIDS, periodID)) {
      log.warn("Two periods with the same ID found. Updating.");
      const newID = periodID + "-dup";
      period.id = newID;
      checkManifestIDs(manifest);
      periodIDS.push(newID);
    } else {
      periodIDS.push(periodID);
    }
    const { adaptations } = period;
    const adaptationIDs : string[] = [];
    (Object.keys(adaptations) as IParsedAdaptationType[]).forEach((type) => {
      const adaptationsForType = adaptations[type];
      if (adaptationsForType === undefined) {
        return;
      }
      adaptationsForType.forEach(adaptation => {
        const adaptationID = adaptation.id;
        if (arrayIncludes(adaptationIDs, adaptationID)) {
          log.warn("Two adaptations with the same ID found. Updating.",
            adaptationID);
          const newID =  adaptationID + "-dup";
          adaptation.id = newID;
          checkManifestIDs(manifest);
          adaptationIDs.push(newID);
        } else {
          adaptationIDs.push(adaptationID);
        }
        const representationIDs : string[] = [];
        adaptation.representations.forEach(representation => {
          const representationID = representation.id;
          if (arrayIncludes(representationIDs, representationID)) {
            log.warn("Two representations with the same ID found. Updating.",
              representationID);
            const newID =  representationID + "-dup";
            representation.id = newID;
            checkManifestIDs(manifest);
            representationIDs.push(newID);
          } else {
            representationIDs.push(representationID);
          }
        });
      });
    });
  });
}
