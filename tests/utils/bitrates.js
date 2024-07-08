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
 * @param {RxPlayer} rxPlayer
 * @param {string|undefined} [switchingMode]
 * @returns {Function}
 */
export function lockHighestBitrates(rxPlayer, switchingMode) {
  rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
    for (const period of periods) {
      lockHighestBitrateForPeriod(period);
    }
  });

  rxPlayer.getAvailablePeriods().map(lockHighestBitrateForPeriod);

  function lockHighestBitrateForPeriod(period) {
    const videoTrack = rxPlayer.getAvailableVideoTracks(period.id)[0];
    if (videoTrack !== undefined && videoTrack !== null) {
      const highestVideoBitrate = getHighestBitrate(videoTrack);
      const lockedVideoReps = videoTrack.representations
        .filter((r) => r.bitrate === highestVideoBitrate)
        .map((r) => r.id);
      rxPlayer.lockVideoRepresentations({
        periodId: period.id,
        representations: lockedVideoReps,
        switchingMode,
      });
    }

    const audioTrack = rxPlayer.getAvailableAudioTracks(period.id)[0];
    if (audioTrack !== undefined && audioTrack !== null) {
      const highestAudioBitrate = getHighestBitrate(audioTrack);
      const lockedAudioReps = audioTrack.representations
        .filter((r) => r.bitrate === highestAudioBitrate)
        .map((r) => r.id);
      rxPlayer.lockAudioRepresentations({
        periodId: period.id,
        representations: lockedAudioReps,
        switchingMode,
      });
    }
  }
}

/**
 * @param {RxPlayer} rxPlayer
 * @param {string|undefined} [switchingMode]
 * @returns {Function}
 */
export function lockLowestBitrates(rxPlayer, switchingMode) {
  rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
    for (const period of periods) {
      lockLowestBitrateForPeriod(period);
    }
  });

  rxPlayer.getAvailablePeriods().map(lockLowestBitrateForPeriod);

  function lockLowestBitrateForPeriod(period) {
    const videoTrack = rxPlayer.getAvailableVideoTracks(period.id)[0];
    if (videoTrack !== undefined && videoTrack !== null) {
      const lowestVideoBitrate = getLowestBitrate(videoTrack);
      const lockedVideoReps = videoTrack.representations
        .filter((r) => r.bitrate === lowestVideoBitrate)
        .map((r) => r.id);
      rxPlayer.lockVideoRepresentations({
        periodId: period.id,
        representations: lockedVideoReps,
        switchingMode,
      });
    }

    const audioTrack = rxPlayer.getAvailableAudioTracks(period.id)[0];
    if (audioTrack !== undefined && audioTrack !== null) {
      const lowestAudioBitrate = getLowestBitrate(audioTrack);
      const lockedAudioReps = audioTrack.representations
        .filter((r) => r.bitrate === lowestAudioBitrate)
        .map((r) => r.id);
      rxPlayer.lockAudioRepresentations({
        periodId: period.id,
        representations: lockedAudioReps,
        switchingMode,
      });
    }
  }
}

/**
 * @param {Object} track
 * @returns {number|undefined}
 */
function getHighestBitrate(track) {
  return track.representations.reduce((acc, representation) => {
    if (acc === undefined) {
      return representation.bitrate;
    }
    return acc < representation.bitrate ? representation.bitrate : acc;
  }, undefined);
}

/**
 * @param {Object} track
 * @returns {number|undefined}
 */
function getLowestBitrate(track) {
  return track.representations.reduce((acc, representation) => {
    if (acc === undefined) {
      return representation.bitrate;
    }
    return acc > representation.bitrate ? representation.bitrate : acc;
  }, undefined);
}
