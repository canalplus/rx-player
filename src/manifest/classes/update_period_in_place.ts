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

import log from "../../log";
import type { IRepresentationMetadata, ITrackMetadata } from "../../manifest";
import type { ITrackType } from "../../public_types";
import arrayFindIndex from "../../utils/array_find_index";
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
export default function updatePeriodInPlace(
  oldPeriod: Period,
  newPeriod: Period,
  updateType: MANIFEST_UPDATE_TYPE,
): IUpdatedPeriodResult {
  const res: IUpdatedPeriodResult = {
    updatedTracks: [],
    removedTracks: [],
    addedTracks: [],
  };
  oldPeriod.start = newPeriod.start;
  oldPeriod.end = newPeriod.end;
  oldPeriod.duration = newPeriod.duration;
  oldPeriod.streamEvents = newPeriod.streamEvents;

  const oldTracks = oldPeriod.getTracks();
  const newTracks = newPeriod.getTracks();

  for (let j = 0; j < oldTracks.length; j++) {
    const oldTrack = oldTracks[j];
    const newTrackIdx = arrayFindIndex(
      newTracks,
      (a) => a.id === oldTrack.id,
    );

    if (newTrackIdx === -1) {
      log.warn(
        'Manifest: Track "' + oldTracks[j].id + '" not found when merging.',
      );
      const [removed] = oldTracks.splice(j, 1);
      j--;
      res.removedTracks.push({
        id: removed.id,
        trackType: removed.type,
      });
    } else {
      const [newTrack] = newTracks.splice(newTrackIdx, 1);
      const updatedRepresentations: IRepresentationMetadata[] = [];
      const addedRepresentations: IRepresentationMetadata[] = [];
      const removedRepresentations: string[] = [];
      res.updatedTracks.push({
        Track: oldTrack.id,
        trackType: oldTrack.type,
        updatedRepresentations,
        addedRepresentations,
        removedRepresentations,
      });

      const oldRepresentations = oldTrack.representations;
      const newRepresentations = newTrack.representations.slice();

      for (let k = 0; k < oldRepresentations.length; k++) {
        const oldRepresentation = oldRepresentations[k];
        const newRepresentationIdx = arrayFindIndex(
          newRepresentations,
          (representation) => representation.id === oldRepresentation.id,
        );

        if (newRepresentationIdx === -1) {
          log.warn(
            `Manifest: Representation "${oldRepresentations[k].id}" ` +
              "not found when merging.",
          );
          const [removed] = oldRepresentations.splice(k, 1);
          k--;
          removedRepresentations.push(removed.id);
        } else {
          const [newRepresentation] = newRepresentations.splice(newRepresentationIdx, 1);
          updatedRepresentations.push(oldRepresentation.getMetadataSnapshot());
          oldRepresentation.cdnMetadata = newRepresentation.cdnMetadata;
          if (updateType === MANIFEST_UPDATE_TYPE.Full) {
            oldRepresentation.index._replace(newRepresentation.index);
          } else {
            oldRepresentation.index._update(newRepresentation.index);
          }
        }
      }

      if (newRepresentations.length > 0) {
        log.warn(
          `Manifest: ${newRepresentations.length} new Representations ` +
            "found when merging.",
        );
        oldTrack.representations.push(...newRepresentations);
        addedRepresentations.push(
          ...newRepresentations.map((r) => r.getMetadataSnapshot()),
        );
      }
    }
  }
  if (newTracks.length > 0) {
    log.warn(
      `Manifest: ${newTracks.length} new Tracks ` + "found when merging.",
    );
    for (const trak of newTracks) {
      const prevAdaps = oldPeriod.Tracks[trak.trackType];
      if (prevAdaps === undefined) {
        oldPeriod.tracksMetadata[trak.trackType] = [trak];
      } else {
        prevAdaps.push(trak);
      }
      res.addedTracks.push(trak.getMetadataSnapshot());
    }
  }
  return res;
}

/**
 * Object describing the updates performed by `updatePeriodInPlace` on a single
 * Period.
 */
export interface IUpdatedPeriodResult {
  /** Information on tracks that have been updated. */
  updatedTracks: Array<{
    trackType: ITrackType;
    /** The concerned tracks. */
    track: string;
    /** Representations that have been updated. */
    updatedRepresentations: IRepresentationMetadata[];
    /** Representations that have been removed from the track. */
    removedRepresentations: string[];
    /** Representations that have been added to the track. */
    addedRepresentations: IRepresentationMetadata[];
  }>;
  /** Tracks that have been removed from the Period. */
  removedTracks: Array<{
    id: string;
    trackType: ITrackType;
  }>;
  /** Tracks that have been added to the Period. */
  addedTracks: ITrackMetadata[];
}
