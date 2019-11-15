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

import {
  EMPTY,
  merge as observableMerge,
  Observable,
} from "rxjs";
import {
  map,
  take,
} from "rxjs/operators";
import arrayFindIndex from "../../../utils/array_find_index";
import { convertToRanges } from "../../../utils/ranges";
import request from "../../../utils/request";
import {
  IThumbnail,
  IThumbnailTrack,
} from "./thumbnail_track_utils";

/**
 * Load needed segment data.
 * @param {Object} thumbnails
 * @param {HTMLMediaElement} mediaElement
 * @returns {ArrayBuffer}
 */
export function getSegmentsData(
  thumbnails: IThumbnail[],
  mediaElement: HTMLMediaElement
): Observable<ArrayBuffer> {

  const thumbnailsToLoad = thumbnails.filter((t) => {
    const tRange = { start: t.start, end: t.start + t.duration };
    const mediaRanges = convertToRanges(mediaElement.buffered);
    return arrayFindIndex(mediaRanges, (mr) => {
      return tRange.start >= mr.start && tRange.end <= mr.end;
    }) === -1;
  });

  if (thumbnailsToLoad.length === 0) {
    return EMPTY;
  }

  const loadedData$ = thumbnailsToLoad.map(({ mediaURL }) => {
    return request({
      url: mediaURL,
      responseType: "arraybuffer",
    }).pipe(take(1));
  });

  return observableMerge(...loadedData$).pipe(
    map(({ value: { responseData } }) => {
      return responseData;
    })
  );
}

/**
 * Get init segment and append it to source buffer.
 * @param {Object} thumbnailTrack
 * @param {Object} sourceBuffer
 * @returns {Observable}
 */
export function getInitSegment(thumbnailTrack: IThumbnailTrack) {
  const { initURL } = thumbnailTrack;
  return request({
    url: initURL,
    responseType: "arraybuffer",
  });
}
