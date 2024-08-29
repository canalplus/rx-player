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
import type { ITrackType } from "../../../public_types";
import arrayIncludes from "../../../utils/array_includes";
import type { IParsedManifest } from "../types";

/**
 * Ensure that no two periods, variants and tracks from the same period and
 * representations from the same adaptation, have the same ID.
 *
 * Log and mutate their ID if not until this is verified.
 *
 * @param {Object} manifest
 */
export default function checkManifestIDs(manifest: IParsedManifest): void {
  const periodIDS: string[] = [];
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
    const { tracksMetadata } = period;
    const trackIDs: string[] = [];
    (Object.keys(tracksMetadata) as ITrackType[]).forEach((type) => {
      const tracksForType = tracksMetadata[type];
      if (tracksForType === undefined) {
        return;
      }
      tracksForType.forEach((track) => {
        const trackID = track.id;
        if (arrayIncludes(trackIDs, trackID)) {
          log.warn("Two tracks with the same ID found. Updating.", trackID);
          const newID = trackID + "-dup";
          track.id = newID;
          checkManifestIDs(manifest);
          trackIDs.push(newID);
        } else {
          trackIDs.push(trackID);
        }
        const representationIDs: Array<number | string> = [];
        track.representations.forEach((representation) => {
          const representationID = representation.id;
          if (arrayIncludes(representationIDs, representationID)) {
            log.warn(
              "Two representations with the same ID found. Updating.",
              representationID,
            );
            const newID = `${representationID}-dup`;
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
