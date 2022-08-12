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

import { SUPPORTED_ADAPTATIONS_TYPE } from "../../../../manifest";
import {
  IParsedAdaptation,
  IParsedAdaptations,
} from "../../types";

/**
 * Attach trick mode tracks to adaptations by assigning to the trickModeTracks
 * property an array of trick mode track adaptations.
 * @param {Object} adaptations
 * @param {Array.<Object>} trickModeTracks
 * @returns {void}
 */
function attachTrickModeTrack(
  adaptations: IParsedAdaptations,
  trickModeTracks: Array<{ adaptation: IParsedAdaptation;
                           trickModeAttachedAdaptationIds: string[]; }>
): void {
  for (const track of trickModeTracks) {
    const { adaptation, trickModeAttachedAdaptationIds } = track;
    for (const trickModeAttachedAdaptationId of trickModeAttachedAdaptationIds) {
      for (const adaptationType of SUPPORTED_ADAPTATIONS_TYPE) {
        const adaptationsByType = adaptations[adaptationType];
        if (adaptationsByType !== undefined) {
          for (const adaptationByType of adaptationsByType) {
            if (adaptationByType.id === trickModeAttachedAdaptationId) {
              if (adaptationByType.trickModeTracks === undefined) {
                adaptationByType.trickModeTracks = [];
              }
              adaptationByType.trickModeTracks.push(adaptation);
            }
          }
        }
      }
    }
  }
}

export default attachTrickModeTrack;
