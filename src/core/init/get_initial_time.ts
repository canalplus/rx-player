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

import config from "../../config";
import log from "../../log";
import Manifest from "../../manifest";

const { DEFAULT_LIVE_GAP } = config;

export interface IInitialTimeOptions { position? : number;
                                       wallClockTime? : number;
                                       fromFirstPosition? : number;
                                       fromLastPosition? : number;
                                       percentage? : number; }

/**
 * Returns the calculated initial time for the content described by the given
 * Manifest:
 *   1. if a start time is defined by user, calculate starting time from the
 *      manifest information
 *   2. else if the media is live, use the live edge and suggested delays from
 *      it
 *   3. else returns the minimum time announced in the manifest
 * @param {Manifest} manifest
 * @param {Object} startAt
 * @returns {Number}
 */
export default function getInitialTime(
  manifest : Manifest,
  lowLatencyMode : boolean,
  startAt? : IInitialTimeOptions
) : number {
  log.debug("Init: calculating initial time");
  if (startAt) {
    const min = manifest.getMinimumPosition();
    const max = manifest.getMaximumPosition();
    if (startAt.position != null) {
      log.debug("Init: using startAt.minimumPosition");
      return Math.max(Math.min(startAt.position, max), min);
    }
    else if (startAt.wallClockTime != null) {
      log.debug("Init: using startAt.wallClockTime");
      const position = startAt.wallClockTime - (manifest.availabilityStartTime || 0);
      return Math.max(Math.min(position, max), min);
    }
    else if (startAt.fromFirstPosition != null) {
      log.debug("Init: using startAt.fromFirstPosition");
      const { fromFirstPosition } = startAt;
      return fromFirstPosition <= 0 ? min :
                                      Math.min(max, min + fromFirstPosition);
    }
    else if (startAt.fromLastPosition != null) {
      log.debug("Init: using startAt.fromLastPosition");
      const { fromLastPosition } = startAt;
      return fromLastPosition >= 0 ? max :
                                     Math.max(min, max + fromLastPosition);
    } else if (startAt.percentage != null) {
      log.debug("Init: using startAt.percentage");
      const { percentage } = startAt;
      if (percentage > 100) {
        return max;
      } else if (percentage < 0) {
        return min;
      }
      const ratio = +percentage / 100;
      const extent = max - min;
      return min + extent * ratio;
    }
  }

  const minimumPosition = manifest.getMinimumPosition();
  if (manifest.isLive) {
    const sgp = manifest.suggestedPresentationDelay;
    const clockOffset = manifest.getClockOffset();
    const maximumPosition = manifest.getMaximumPosition();
    let liveTime : number;
    if (clockOffset == null) {
      log.info("Init: no clock offset found for a live content, " +
               "starting close to maximum available position");
      liveTime = maximumPosition;
    } else {
      log.info("Init: clock offset found for a live content, " +
               "checking if we can start close to it");
      const ast = manifest.availabilityStartTime || 0;
      const clockRelativeLiveTime = (performance.now() + clockOffset) / 1000 - ast;
      liveTime = Math.min(maximumPosition,
                          clockRelativeLiveTime);
    }
    log.debug(`Init: ${liveTime} defined as the live time, applying a live gap` +
              ` of ${sgp}`);
    if (sgp != null) {
      return Math.max(liveTime - sgp, minimumPosition);
    }
    const defaultStartingPos = liveTime - (lowLatencyMode ? DEFAULT_LIVE_GAP.LOW_LATENCY :
                                                            DEFAULT_LIVE_GAP.DEFAULT);
    return Math.max(defaultStartingPos, minimumPosition);
  }

  log.info("Init: starting at the minimum available position:", minimumPosition);
  return minimumPosition;
}
