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

/**
 * Return true if given cue is active.
 * @param {TextTrackCueList} activeCues
 * @param {TextTrackCue} cue
 * @returns {boolean}
 */
export default function isActiveCue(
  activeCues: TextTrackCueList,
  cue: TextTrackCue
): boolean {
  let isActive = false;
  for (let i = 0; i < activeCues.length; i++) {
    const activeCue = activeCues[i];
    isActive = isActive || (
      activeCue.startTime === cue.startTime &&
      activeCue.endTime === cue.endTime &&
      activeCue.id === cue.id &&
      activeCue.text === cue.text
    );
  }
  return isActive;
}
