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
import { isFirefox } from "./browser_detection";

/**
 * Return true if given cue is active.
 * @param {TextTrack} track
 * @param {TextTrackCue} cue
 * @returns {boolean}
 */
function isActiveCue(track: TextTrack, cue: TextTrackCue): boolean {
  const { activeCues } = track;
  if (activeCues === null) {
    return false;
  }
  for (let i = 0; i < activeCues.length; i++) {
    if (activeCues[i] === cue) {
      return true;
    }
  }
  return false;
}

/**
 * Remove cue from text track.
 * @param {TextTrack} track
 * @param {TextTrackCue} cue
 */
export default function removeCue(track: TextTrack, cue: TextTrackCue): void {
  // On Firefox, cue doesn't dissapear when it is removed from track. Track
  // should be hidden, and shown again after removing cue, in order to
  // definitely clean the cue.
  if (isFirefox && isActiveCue(track, cue)) {
    const trackMode = track.mode;
    track.mode = "hidden";
    try {
      track.removeCue(cue);
    } catch (err) {
      log.warn("Compat: Could not remove cue from text track.");
    }
    track.mode = trackMode;
    return;
  }
  try {
    track.removeCue(cue);
  } catch (err) {
    log.warn("Compat: Could not remove cue from text track.");
  }
}
