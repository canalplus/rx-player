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
  Observable,
  of as observableOf
} from "rxjs";
import {
  map,
  startWith,
  tap,
} from "rxjs/operators";
import log from "../../../log";
import {
  Adaptation,
  Period,
  Representation,
} from "../../../manifest";
import MapMemory from "../../../utils/map_memory";
import EWMA from "../../abr/ewma";
import SegmentBookkeeper from "../../buffer/segment_bookkeeper";
import getFrameLossFromLastPosition from "./frame_loss";
import getBufferedStreams from "./get_buffered_streams";
import getStreamId from "./get_stream_id";

interface IQualityMeans {
  addSample: (weight: number, ratio: number) => void;
  getMeans: () => {
    fast: number;
    slow: number;
  };
}

export interface IPlaybackQualityManager {
  getQualities$: (
    content: { period: Period; adaptation: Adaptation },
    segmentBookkeeper: SegmentBookkeeper,
    clock$ : Observable<{ currentTime: number }>
  ) => Observable<IPlaybackQualities|null>;
}

export type IPlaybackQualities = Partial<Record<string|number, number>>;

/**
 * From a media element, monitor playback informations and evaluate playback quality
 * for each played stream. For each stream, quality goes from 0 to 1.
 *
 * For video playback :
 * Playback informations are decomposed through samples:
 * At each clock tick, if only one representation [1] has been
 * played since last clock tick :
 * - Get dropped frames and decoded frames on that period.
 * - Calculate quality from dropped/decoded ratio.
 *
 * Playback condition may evolve through time depending on CPU / GPU
 * loads and device energy conditions.
 * We calculate two quality means:
 * - The "fast" relies on few lasts samples.
 * - The "slow" relies on samples from a larger period.
 *
 * A poor quality stream may become qualitative again. As a trick, when a stream is
 * not played, we still add virtual playback samples where there are no dropped
 * frames.
 *
 * [1] It is useless to make this operation if more than one representation has been
 * played, as we can't associate frames to a specific stream.
 * Multi-representation samples represents 5% of all recorded samples.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function PlaybackQualityManager(
  mediaElement: HTMLMediaElement
): IPlaybackQualityManager {
  const playbackQualitiesMemory: IPlaybackQualities = {};

  const qualityMeansForStream = new MapMemory<string|number, IQualityMeans>(() => {
    const fastEWMA = new EWMA(10);
    const slowEWMA = new EWMA(120);

    return {
      addSample: (weight: number, ratio: number) => {
        fastEWMA.addSample(weight, ratio);
        slowEWMA.addSample(weight, ratio);
      },
      getMeans: () => {
        return {
          fast: fastEWMA.getEstimate(),
          slow: slowEWMA.getEstimate(),
        };
      },
    };
  });

  return {
    getQualities$: (
      stream: { period: Period; adaptation: Adaptation },
      segmentBookkeeper: SegmentBookkeeper,
      clock$ : Observable<{ currentTime: number }>
    ): Observable<IPlaybackQualities|null> => {
      if (!(mediaElement instanceof HTMLVideoElement)) {
        log.warn("The mediaElement quality can't be estimated: not a videoElement.");
        return observableOf(null);
      }
      const lastPlaybackInfos: {
        lastTotalDecodedFrames: number;
        lastTotalDroppedFrames: number;
        lastCurrentTime: null|number;
      } = {
        lastTotalDecodedFrames: 0,
        lastTotalDroppedFrames: 0,
        lastCurrentTime: null,
      };
      const { period, adaptation } = stream;

      return clock$.pipe(
        map(({ currentTime }) => {
          const { lastCurrentTime } = lastPlaybackInfos;
          lastPlaybackInfos.lastCurrentTime = currentTime;

          const streamQuality =
            (1 - getFrameLossFromLastPosition(mediaElement, lastPlaybackInfos));

          const bufferedStreams = getBufferedStreams(segmentBookkeeper, {
              start: lastCurrentTime || currentTime,
              end: currentTime,
            });

          const playedStream = bufferedStreams.length === 0 ?
            bufferedStreams[0] :
            undefined;

          /* get estimated qualities for each playable representation */
          return adaptation.representations.reduce<IPlaybackQualities>((
            representationPlaybackQualities: IPlaybackQualities,
            representation: Representation
          ) => {
            /* 1 - get quality means for a specific stream, and update them */
            const streamId = getStreamId(period, adaptation, representation);
            const qualityEwmas = qualityMeansForStream.get(streamId);

            const meanWeight = currentTime - (lastCurrentTime || currentTime);

            if (
              playedStream &&
              playedStream.streamId === streamId &&
              !isNaN(streamQuality)
            ) {
              qualityEwmas.addSample(meanWeight, streamQuality);
            } else {
              qualityEwmas.addSample(meanWeight, 1);
            }

            /* 2 - from means, assign a new quality to playbackQualitiesMemory */
            const { fast, slow } = qualityEwmas.getMeans();
            playbackQualitiesMemory[streamId] = Math.min(fast, slow);

            representationPlaybackQualities[representation.id] =
              playbackQualitiesMemory[streamId];

            return representationPlaybackQualities;
          }, {});
        }),
        startWith({}),
        tap((playbackQualities) => {
          log.debug("abr: playback qualities", playbackQualities);
        })
      );
    },
  };
}
