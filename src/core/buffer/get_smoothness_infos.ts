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
 * This file allows to create AdaptationBuffers.
 *
 * An AdaptationBuffer downloads and push segment for a single Adaptation.
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrate the various RepresentationBuffer, which will
 * download and push segments for a single Representation.
 */

import {
  interval,
  Observable,
} from "rxjs";
import {
  filter,
  map,
  mapTo,
  pairwise,
  startWith,
} from "rxjs/operators";

import {  getVideoPlaybackQuality } from "../../compat";
import MapMemory from "../../utils/map_memory";
import EWMA from "../abr/ewma";
import SegmentBookkeeper from "./segment_bookkeeper";

interface IBufferedRepresentation {
  bufferedStart: number;
  bufferedEnd: number;
  representationId: number|string;
}

export type ISmoothnessInfos = Partial<Record<string|number, boolean>>;

/**
 * Get buffered representations between given start and end.
 * @param {Object} segmentBookkeeper
 * @param {Object} range
 */
function getBufferedRepresentations(
  segmentBookkeeper: SegmentBookkeeper,
  range: { start: number; end: number }
): IBufferedRepresentation[] {
  const { start, end } = range;
  const bufferedSegments = segmentBookkeeper.getBufferedSegments({
    start,
    end,
  });

  return bufferedSegments.reduce((acc: IBufferedRepresentation[], value) => {
    const lastElement = acc[acc.length - 1];
    if (value.bufferedStart != null && value.bufferedEnd != null) {
      if (
        lastElement &&
        value.infos.representation.id === lastElement.representationId
      ) {
        lastElement.bufferedEnd = value.bufferedEnd;
      } else {
        acc.push({
          bufferedStart: value.bufferedStart,
          bufferedEnd: value.bufferedEnd,
          representationId: value.infos.representation.id,
        });
      }
    }
    return acc;
  }, []);
}

/**
 * From a given segment bookkeeper, monitor frames infos
 * during playback, and returns smoothness for each played stream.
 *
 * Playback informations are decomposed through samples:
 * At each clock tick ( ~ every second ), if only one representation has been
 * played since last clock tick :
 * - Get dropped frames and decoded frames on that period.
 * - Calculate dropped/decoded ratio, and make an average of ratios.
 * It is useless to make this operation if more than one representation has been played,
 * as we can't associate frames to a specific stream.
 * Multi-representation samples represents 5% of all recorded samples.
 *
 * Playback condition may evolve through time depending on CPU / GPU
 * loads and device energy conditions. For ratios averages, we use EWMAs as we suppose
 * last ratios to be more representative of playback state. The half-life of the EWMA
 * is 10. This duration should be not too short, to avoid emphasize one-time bad ratios,
 * and not too long, to avoid take into account too old ratios in the EWMA calculations.
 *
 * Playback is considerer as currently smooth if ratios average is under 0.1.
 * @param {Observable} clock$
 * @param {Object} segmentBookkeeper
 * @param {HTMLVideoElement} videoElement
 * @returns {Observable}
 */
export default function getSmoothnessInfos(
  segmentBookkeeper: SegmentBookkeeper,
  videoElement: HTMLVideoElement
): Observable<ISmoothnessInfos> {
  let totalDecodedFrames = 0;
  let totalDroppedFrames = 0;

  const ids: Array<number|string> = [];

  const ratiosEWMA = new MapMemory<string|number, EWMA>(() => {
    return new EWMA(10);
  });

  return interval(1000).pipe(
    mapTo(videoElement.currentTime),
    pairwise(),
    map(([oldCurrentTime, currentTime]) => {
      const sampleDuration = currentTime - oldCurrentTime;

      const {
        totalVideoFrames,
        droppedVideoFrames,
      } = getVideoPlaybackQuality(videoElement);

      const bufferedRepresentations = getBufferedRepresentations(segmentBookkeeper, {
        start: currentTime - sampleDuration,
        end: currentTime,
      });

      const deltaDecodedFrames = totalVideoFrames - totalDecodedFrames;
      const deltaDroppedFrames = droppedVideoFrames - totalDroppedFrames;
      totalDecodedFrames = totalVideoFrames;
      totalDroppedFrames = droppedVideoFrames;

      if (bufferedRepresentations.length === 1) {
        const { representationId } = bufferedRepresentations[0];
        const ratioEWMA = ratiosEWMA.get(representationId);
        const ratio = deltaDroppedFrames / deltaDecodedFrames;
        if (!isNaN(ratio)) {
          ratioEWMA.addSample(1, ratio);
          if (!(ids.find((id) => id === representationId))) {
            ids.push(representationId);
          }
        }
      }
      return bufferedRepresentations.length === 1;
    }),
    filter((hasBeenUpdated) => !!hasBeenUpdated),
    map(() => {
      const smoothnessInfos: ISmoothnessInfos = {};
      ids.forEach((id) => {
        const ratioEWMA = ratiosEWMA.get(id);
        const isSmooth = ratioEWMA.getEstimate() < 0.1;
        smoothnessInfos[id] = isSmooth;
      });
      return smoothnessInfos;
    }),
    startWith({})
  );
}
