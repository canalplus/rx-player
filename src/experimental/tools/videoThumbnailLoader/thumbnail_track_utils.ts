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

import { Representation } from "../../../manifest";

export interface IThumbnail {
  start: number;
  duration: number;
  mediaURL: string;
}

export interface IThumbnailTrack {
  getThumbnails: () => IThumbnail[];
  initURL: string;
  codec: string;
}

/**
 * Turn the trick mode track into a more adapted thumbnail track.
 * @param {Object} trickModeTrack
 * @returns {Object}
 */
export function getThumbnailTrack(trickModeTrack: Representation): IThumbnailTrack {
  function getThumbnails() {
    const trackIndex = trickModeTrack.index;
    const indexStart = trackIndex.getFirstPosition();
    const indexEnd = trackIndex.getLastPosition();
    if (indexStart == null || indexEnd == null) {
      return [];
    }
    const segments = trackIndex.getSegments(indexStart, indexEnd - indexStart);
    return segments
      .filter((s) => s.duration != null && s.mediaURL != null)
      .map((s) => {
        return {
          duration: (s.duration || 0) / s.timescale,
          start: s.time / s.timescale,
          mediaURL: s.mediaURL || "",
        };
      });
  }

  const initSegment =
    trickModeTrack.index.getInitSegment();
  return {
    getThumbnails,
    codec: trickModeTrack.getMimeTypeString(),
    initURL: initSegment ? (initSegment.mediaURL || "") : "",
  };
}

/**
 * Get wanted thumbnails.
 * @param {Object} thumbnailTrack
 * @param {number} time
 * @param {TimeRanges} buffered
 * @returns {Array.<Object>}
 */
export function getWantedThumbnails(thumbnailTrack: IThumbnailTrack,
                                    time: number,
                                    buffered: TimeRanges): IThumbnail[]|null {
  const thumbnails = thumbnailTrack.getThumbnails()
    .filter((t) => {
      const tRange = { start: t.start, end: t.start + t.duration };
      const timeIsInSegment = time >= tRange.start && time < tRange.end;
      return timeIsInSegment;
    });
  if (thumbnails.length === 0) {
    return null;
  }
  return thumbnails.filter((t) => {
    const tRange = { start: t.start, end: t.start + t.duration };
    let hasBuffered = false;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= tRange.start &&
        buffered.end(i) >= tRange.end) {
        hasBuffered = true;
      }
    }
    return !hasBuffered;
  });
}
