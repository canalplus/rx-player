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

import { SUPPORTED_TRACK_TYPE } from "../../../../manifest";
import type { IParsedTrack } from "../../types";

/**
 * Attach trick mode tracks to regular tracks by assigning to the trickModeTracks
 * property an array of trick mode tracks.
 * @param {Object} allTracks
 * @param {Array.<Object>} trickModeTracks
 * @returns {void}
 */
function attachTrickModeTrack(
  allTracks: Record<"audio" | "video" | "text", IParsedTrack[]>,
  trickModeTracks: Array<{
    track: IParsedTrack;
    trickModeAttachedTrackIds: string[];
  }>,
): void {
  for (const tmTrack of trickModeTracks) {
    const { track, trickModeAttachedTrackIds } = tmTrack;
    for (const trickModeAttachedTrackId of trickModeAttachedTrackIds) {
      for (const trackType of SUPPORTED_TRACK_TYPE) {
        const tracksByType = allTracks[trackType];
        if (tracksByType !== undefined) {
          for (const trackByType of tracksByType) {
            if (trackByType.id === trickModeAttachedTrackId) {
              if (trackByType.trickModeTracks === undefined) {
                trackByType.trickModeTracks = [];
              }
              trackByType.trickModeTracks.push(track);
            }
          }
        }
      }
    }
  }
}

export default attachTrickModeTrack;
