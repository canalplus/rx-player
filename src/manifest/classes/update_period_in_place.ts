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
import type { IAdaptationMetadata, IRepresentationMetadata } from "../../manifest";
import type { ITrackType } from "../../public_types";
import arrayFindIndex from "../../utils/array_find_index";
import type { IThumbnailTrackMetadata } from "../types";
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
    updatedAdaptations: [],
    removedAdaptations: [],
    addedAdaptations: [],
    updatedThumbnailTracks: [],
    removedThumbnailTracks: [],
    addedThumbnailTracks: [],
  };
  oldPeriod.start = newPeriod.start;
  oldPeriod.end = newPeriod.end;
  oldPeriod.duration = newPeriod.duration;
  oldPeriod.streamEvents = newPeriod.streamEvents;

  const oldThumbnailTracks = oldPeriod.thumbnailTracks;
  const newThumbnailTracks = newPeriod.thumbnailTracks;
  for (let j = 0; j < oldThumbnailTracks.length; j++) {
    const oldThumbnailTrack = oldThumbnailTracks[j];
    const newThumbnailTrackIdx = arrayFindIndex(
      newThumbnailTracks,
      (a) => a.id === oldThumbnailTrack.id,
    );

    if (newThumbnailTrackIdx === -1) {
      log.warn(
        'Manifest: ThumbnailTrack "' +
          oldThumbnailTracks[j].id +
          '" not found when merging.',
      );
      const [removed] = oldThumbnailTracks.splice(j, 1);
      j--;
      res.removedThumbnailTracks.push({
        id: removed.id,
      });
    } else {
      const [newThumbnailTrack] = newThumbnailTracks.splice(newThumbnailTrackIdx, 1);
      oldThumbnailTrack.mimeType = newThumbnailTrack.mimeType;
      oldThumbnailTrack.height = newThumbnailTrack.height;
      oldThumbnailTrack.width = newThumbnailTrack.width;
      oldThumbnailTrack.horizontalTiles = newThumbnailTrack.horizontalTiles;
      oldThumbnailTrack.verticalTiles = newThumbnailTrack.verticalTiles;
      oldThumbnailTrack.cdnMetadata = newThumbnailTrack.cdnMetadata;
      if (updateType === MANIFEST_UPDATE_TYPE.Full) {
        oldThumbnailTrack.index._replace(newThumbnailTrack.index);
      } else {
        oldThumbnailTrack.index._update(newThumbnailTrack.index);
      }
      res.updatedThumbnailTracks.push({
        id: oldThumbnailTrack.id,
        mimeType: oldThumbnailTrack.mimeType,
        height: oldThumbnailTrack.height,
        width: oldThumbnailTrack.width,
        horizontalTiles: oldThumbnailTrack.horizontalTiles,
        verticalTiles: oldThumbnailTrack.verticalTiles,
      });
    }
  }

  if (newThumbnailTracks.length > 0) {
    log.warn(
      `Manifest: ${newThumbnailTracks.length} new Thumbnail tracks ` +
        "found when merging.",
    );
    res.addedThumbnailTracks.push(
      ...newThumbnailTracks.map((t) => ({
        id: t.id,
        mimeType: t.mimeType,
        height: t.height,
        width: t.width,
        horizontalTiles: t.horizontalTiles,
        verticalTiles: t.verticalTiles,
      })),
    );
    oldPeriod.thumbnailTracks.push(...newThumbnailTracks);
  }

  const oldAdaptations = oldPeriod.getAdaptations();
  const newAdaptations = newPeriod.getAdaptations();

  for (let j = 0; j < oldAdaptations.length; j++) {
    const oldAdaptation = oldAdaptations[j];
    const newAdaptationIdx = arrayFindIndex(
      newAdaptations,
      (a) => a.id === oldAdaptation.id,
    );

    if (newAdaptationIdx === -1) {
      log.warn(
        'Manifest: Adaptation "' + oldAdaptations[j].id + '" not found when merging.',
      );
      const [removed] = oldAdaptations.splice(j, 1);
      j--;
      res.removedAdaptations.push({
        id: removed.id,
        trackType: removed.type,
      });
    } else {
      const [newAdaptation] = newAdaptations.splice(newAdaptationIdx, 1);
      const updatedRepresentations: IRepresentationMetadata[] = [];
      const addedRepresentations: IRepresentationMetadata[] = [];
      const removedRepresentations: string[] = [];
      res.updatedAdaptations.push({
        adaptation: oldAdaptation.id,
        trackType: oldAdaptation.type,
        updatedRepresentations,
        addedRepresentations,
        removedRepresentations,
      });

      const oldRepresentations = oldAdaptation.representations;
      const newRepresentations = newAdaptation.representations.slice();

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
        oldAdaptation.representations.push(...newRepresentations);
        addedRepresentations.push(
          ...newRepresentations.map((r) => r.getMetadataSnapshot()),
        );
      }
    }
  }
  if (newAdaptations.length > 0) {
    log.warn(
      `Manifest: ${newAdaptations.length} new Adaptations ` + "found when merging.",
    );
    for (const adap of newAdaptations) {
      const prevAdaps = oldPeriod.adaptations[adap.type];
      if (prevAdaps === undefined) {
        oldPeriod.adaptations[adap.type] = [adap];
      } else {
        prevAdaps.push(adap);
      }
      res.addedAdaptations.push(adap.getMetadataSnapshot());
    }
  }
  return res;
}

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

  /** Information on Thumbnail Tracks that have been updated. */
  updatedThumbnailTracks: IThumbnailTrackMetadata[];
  /** Thumbnail tracks that have been removed from the Period. */
  removedThumbnailTracks: Array<{
    id: string;
  }>;
  /** Thumbnail tracks that have been added to the Period. */
  addedThumbnailTracks: IThumbnailTrackMetadata[];
}
