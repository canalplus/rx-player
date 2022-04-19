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
  of as observableOf,
} from "rxjs";
import {
  distinctUntilChanged,
  filter,
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
import { SegmentBuffer } from "../../segment_buffers";
import getFrameLossFromLastPosition from "./frame_loss";
import getBufferedStreams from "./get_buffered_streams";
import getStreamId from "./get_stream_id";
import VideoQualityEstimator from "./video_quality_estimator";

export interface IPlaybackQualityManager {
  getQualities$: (
    content: { period: Period; adaptation: Adaptation },
    segmentBuffer: SegmentBuffer,
    clock$ : Observable<{ currentTime: number }>
  ) => Observable<IPlaybackQualities|null>;
}

export type IPlaybackQualities = Partial<Record<string|number, number>>;

/**
 * From a media element, monitor playback informations and evaluate playback quality
 * for each played stream. For each stream, quality goes from 0 to 1.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function PlaybackQualityManager(
  mediaElement: HTMLMediaElement
): IPlaybackQualityManager {
  const playbackQualitiesMemory: IPlaybackQualities = {};

  const videoQualitiesEstimations =
    new MapMemory<string|number, VideoQualityEstimator>(() => {
      return new VideoQualityEstimator();
    });

  return {
    getQualities$: (
      stream: { period: Period; adaptation: Adaptation },
      segmentBuffer: SegmentBuffer,
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
        map(({ currentTime }) => {
          const { lastCurrentTime } = lastPlaybackInfos;
          lastPlaybackInfos.lastCurrentTime = currentTime;
          if (lastCurrentTime === null) {
            return null;
          }
          const sampleDuration = currentTime - lastCurrentTime;
          const frameLoss = getFrameLossFromLastPosition(mediaElement, lastPlaybackInfos);
          log.debug("ABR - current frame loss", frameLoss);

          if (frameLoss == null) {
            return null;
          }

          const localStreamQuality = frameLoss != null ? (1 - frameLoss) : null;
          const bufferedStreams = getBufferedStreams(segmentBuffer, {
            start: lastCurrentTime || currentTime,
            end: currentTime,
          });
          const playedStream = bufferedStreams.length === 1 ?
            bufferedStreams[0] :
            undefined;

          /* get estimated qualities for each playable representation */
          return adaptation.representations.reduce<IPlaybackQualities>((
            representationPlaybackQualities: IPlaybackQualities,
            representation: Representation
          ) => {
            /* 1 - get quality means for a specific stream, and update them */
            const currentStreamId = getStreamId(period, adaptation, representation);
            const videoQualityEstimator =
              videoQualitiesEstimations.get(currentStreamId);

            if (
              playedStream &&
              playedStream.streamId === currentStreamId &&
              localStreamQuality != null
            ) {
              videoQualityEstimator.addSample(sampleDuration, localStreamQuality);

              const videoQuality = videoQualityEstimator.getEstimate();
              playbackQualitiesMemory[currentStreamId] = videoQuality;
            } else if (// Current stream shouldn't be played anymore.
              !bufferedStreams.some(({ streamId }) => streamId === currentStreamId)
            ) {
              videoQualityEstimator.reset();
              playbackQualitiesMemory[currentStreamId] = undefined;
            }

            representationPlaybackQualities[representation.id] =
              playbackQualitiesMemory[currentStreamId];
            return representationPlaybackQualities;
          }, {});
        }),
        filter((evt): evt is IPlaybackQualities => evt != null),
        distinctUntilChanged((a, b) => {
          if (a.length !== b.length) {
            return false;
          }
          const oldKeys = Object.keys(a);
          return oldKeys.reduce((acc, key) => {
            return acc && (a[key] === b[key]);
          }, true);
        }),
        startWith(null),
        tap((playbackQualities) => {
          log.debug("ABR - playback qualities", playbackQualities);
        })
      );
    },
  };
}
