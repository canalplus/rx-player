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
  map,
  pairwise,
  startWith,
} from "rxjs/operators";

import {  getVideoPlaybackQuality } from "../../compat";
import { Representation } from "../../manifest";
import MapMemory from "../../utils/map_memory";
import EWMA from "../abr/ewma";
import SegmentBookkeeper from "./segment_bookkeeper";

interface IBufferedRepresentation {
  bufferedStart: number;
  bufferedEnd: number;
  representationId: number|string;
}

interface IEWMAS {
  addSample: (weight: number, ratio: number) => void;
  getEstimates: () => {
    fast: number;
    slow: number;
  };
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
  videoElement: HTMLVideoElement,
  representations: Representation[]
): Observable<ISmoothnessInfos> {
  let totalDecodedFrames = 0;
  let totalDroppedFrames = 0;

  const ratiosEwmaMap = new MapMemory<string|number, IEWMAS>(() => {
    const fastEWMA = new EWMA(10);
    const slowEWMA = new EWMA(60);
    function addSample(weight: number, ratio: number) {
      fastEWMA.addSample(weight, ratio);
      slowEWMA.addSample(weight, ratio);
    }
    function getEstimates() {
      return {
        fast: fastEWMA.getEstimate(),
        slow: slowEWMA.getEstimate(),
      };
    }

    return {
      addSample,
      getEstimates,
    };
  });

  return interval(1000).pipe(
    map(() => videoElement.currentTime),
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

      const playedRepresentation = bufferedRepresentations.length === 1 ?
        bufferedRepresentations[0] :
        undefined;

      return representations.reduce((acc: ISmoothnessInfos, { id }) => {
        const ratiosEWMA = ratiosEwmaMap.get(id);
        const ratio = deltaDroppedFrames / deltaDecodedFrames;
        if (
          playedRepresentation &&
          playedRepresentation.representationId === id &&
          !isNaN(ratio)
        ) {
          ratiosEWMA.addSample(1, ratio);
        } else {
          ratiosEWMA.addSample(1, 0);
        }

        const isAlreadySmooth = acc[id] === true;
        const { fast, slow } = ratiosEWMA.getEstimates();
        const isSmooth = isAlreadySmooth ?
          (fast < 0.1 || slow < 0.1) :
          (fast < 0.1 && slow < 0.1);

        acc[id] = isSmooth;
        return acc;
      }, {});
    }),
    startWith({})
  );
}
