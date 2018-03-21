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

import { Observable } from "rxjs/Observable";
import config from "../../config";
import fromBitrateCeil from "../abr/fromBitrateCeil";

import { Representation } from "../../manifest";
import { IStreamClockTick } from "./clock";
import SegmentBookkeeper from "./segment_bookkeeper";

import { getVideoPlaybackQuality } from "../../compat";
import { IBufferClockTick } from "../buffer";

const { ABR_MAX_FRAMEDROP_RATIO } = config;

/**
 * Handle quality metrics with video playback quality APIs.
 * Manage decoding limits from metrics.
 */
export default class FrameDropManager {

    private _droppedFrameRatio$: Observable<number>;
    private _clock$: Observable<IStreamClockTick|IBufferClockTick>;
    private _videoElement: HTMLMediaElement;

      constructor(
        videoElement: HTMLMediaElement,
        clock$ : Observable<IStreamClockTick|IBufferClockTick>,
        endOfPlay : Observable<Event>
      ){
        this._clock$ = clock$;
        this._videoElement = videoElement;

        /**
         * Measure two video playback qualities far from a significant interval
         * (equivalent to a second) then return the ratio of dropped frames on
         * total playback frames.
         */
        this._droppedFrameRatio$ =
          this._clock$
            .map(() => getVideoPlaybackQuality(this._videoElement))
            .exhaustMap((oldPlaybackQuality) => {
              return this._clock$
                .map(() => getVideoPlaybackQuality(this._videoElement))
                .distinctUntilChanged()
                .filter((newPlaybackQuality) => {
                  const totalPlaybackTime = this.getTotalPlaybackTime();
                  const fps = newPlaybackQuality.totalVideoFrames / totalPlaybackTime;
                  return ((
                    newPlaybackQuality.totalVideoFrames -
                    oldPlaybackQuality.totalVideoFrames
                  ) >= fps && fps !== 0);
                })
                .map((newPlaybackQuality) => {
                  const currentTotalFrames =
                    newPlaybackQuality.totalVideoFrames -
                    oldPlaybackQuality.totalVideoFrames;
                  const currentDroppedFrames =
                    newPlaybackQuality.droppedVideoFrames -
                    oldPlaybackQuality.droppedVideoFrames;
                  return currentDroppedFrames / currentTotalFrames;
                })
                .take(1);
            })
          .startWith(0)
          .takeUntil(endOfPlay);
      }

      /**
       * From dropped frame ratio, get current maximum bitrate
       * that browser is able to decode correclty.
       *
       * @param {SegmentBookkeeper} segmentBookkeeper
       * @param {Array.<Object>} representations
       */
      getMaximumDecodableBitrate$(
        segmentBookkeeper: SegmentBookkeeper,
        representations: Representation[]
      ): Observable<number> {
        // Return last bitrate before current playing representation
        const maximumDecodableBitrate$ = this._droppedFrameRatio$
          .distinctUntilChanged()
          .withLatestFrom(this._clock$)
          .filter(([ratio, clock]) =>
            ratio > ABR_MAX_FRAMEDROP_RATIO &&
            segmentBookkeeper &&
            segmentBookkeeper.getBitrate(clock.currentTime) != null
          )
         .map(([_, clock]) => this.getLastBitrateBeforeCeiledRepresentation(
               representations,
               segmentBookkeeper.getBitrate(clock.currentTime) || Infinity
          ));

        // Triggers reset timers at each new maximum decodable bitrate
        return maximumDecodableBitrate$.
          exhaustMap((firstBitrate) => {
            return Observable.of(firstBitrate)
                .merge(maximumDecodableBitrate$)
                .scan((x,y) => {
                  return Math.min(x, y);
                }, firstBitrate)
                .scan((x,y) => {
                  return {
                    bitrate: y,
                    lastRatio: x.ratio,
                    ratio: x.lastRatio + x.ratio,
                  };
                // Fibonacci backoff
                }, { bitrate: 0, lastRatio: 0, ratio: 1 })
                .switchMap(({ bitrate, ratio }) => {
                  return Observable.of(bitrate)
                    .concat(Observable.timer(ratio * 5 * 1000).mapTo(Infinity));
                });
          });
      }

      /**
       * Get first bitrate from representation under the one ceiled by the bitrate if one.
       * Returns first representation if none.
       * @param {Array.<Object>} representations
       * @param {Array.<Object>} ceilingBitrate
       */
      private getLastBitrateBeforeCeiledRepresentation = (
        representations: Representation[],
        ceilingBitrate: number
      ): number => {
        const representation = fromBitrateCeil(representations, ceilingBitrate);
        const index = representations.indexOf(representation);

        return (index <= 0) ?
          representations[0].bitrate :
          representations[index - 1].bitrate;
      }

      /**
       * From total played ranges, get total played time (in seconds).
       * @param {HTMLMediaElement} video
       */
      private getTotalPlaybackTime = () => {
        const playedRangesLength = this._videoElement.played.length;
        let totalPlaybackTime = 0;

        for(let i = 0; i < playedRangesLength; i++){
          const timeOnRange =
            this._videoElement.played.end(i) -
            this._videoElement.played.start(i);
          totalPlaybackTime += timeOnRange;
        }
        return totalPlaybackTime;
      }
    }
