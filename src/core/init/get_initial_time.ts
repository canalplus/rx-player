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
import isNullOrUndefined from "../../utils/is_null_or_undefined";

/**
 * All possible initial time options that can be set.
 *
 * Written this way (with many type possibilities) on purpose to avoid issues
 * if the application using the RxPlayer gives undocumented values such as
 * `null`.
 *
 * TODO we shouldn't be that robust, at least not outside the API code, because
 * if we begin to be that liberal here, where should we end?
 * We may instead either want to progressively remove tolerance on the wrong
 * type being given or be better to enforce type-compliancy in the API code.
 */
export interface IInitialTimeOptions {
  /** If set, we should begin at this position, in seconds. */
  position? : number | null | undefined;
  /** If set, we should begin at this unix timestamp, in seconds. */
  wallClockTime? : number | null | undefined;
  /**
   * If set, we should begin at this position relative to the content's start,
   * in seconds.
   */
  fromFirstPosition? : number | null | undefined;
  /**
   * If set, we should begin at this position relative to the content's end,
   * in seconds.
   */
  fromLastPosition? : number | null | undefined;
  /** If set, we should begin at this position relative to the whole duration of
   * the content, in percentage.
   */
  percentage? : number | null | undefined;
}

/**
 * Returns the calculated initial time for the content described by the given
 * Manifest:
 *   1. if a start time is defined by user, calculate starting time from the
 *      manifest information
 *   2. else if the media is live, use the live edge and suggested delays from
 *      it
 *   3. else returns the minimum time announced in the manifest
 * @param {Manifest} manifest
 * @param {boolean} lowLatencyMode
 * @param {Object} startAt
 * @returns {Number}
 */
export default function getInitialTime(
  manifest : Manifest,
  lowLatencyMode : boolean,
  startAt? : IInitialTimeOptions
) : number {
  if (startAt != null) {
    const min = manifest.getMinimumSafePosition();
    let max;
    if (manifest.isLive) {
      max = manifest.getLivePosition();
    }
    if (max === undefined) {
      max = manifest.getMaximumSafePosition();
    }
    if (!isNullOrUndefined(startAt.position)) {
      log.debug("Init: using startAt.minimumPosition");
      return Math.max(Math.min(startAt.position, max), min);
    }
    else if (!isNullOrUndefined(startAt.wallClockTime)) {
      log.debug("Init: using startAt.wallClockTime");
      const ast = manifest.availabilityStartTime === undefined ?
        0 :
        manifest.availabilityStartTime;
      const position = startAt.wallClockTime - ast;
      return Math.max(Math.min(position, max), min);
    }
    else if (!isNullOrUndefined(startAt.fromFirstPosition)) {
      log.debug("Init: using startAt.fromFirstPosition");
      const { fromFirstPosition } = startAt;
      return fromFirstPosition <= 0 ? min :
                                      Math.min(max, min + fromFirstPosition);
    }
    else if (!isNullOrUndefined(startAt.fromLastPosition)) {
      log.debug("Init: using startAt.fromLastPosition");
      const { fromLastPosition } = startAt;
      return fromLastPosition >= 0 ? max :
                                     Math.max(min, max + fromLastPosition);
    } else if (!isNullOrUndefined(startAt.percentage)) {
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

  const minimumPosition = manifest.getMinimumSafePosition();
  if (manifest.isLive) {
    const { suggestedPresentationDelay,
            clockOffset } = manifest;
    const maximumPosition = manifest.getMaximumSafePosition();
    let liveTime : number;
    const { DEFAULT_LIVE_GAP } = config.getCurrent();

    if (clockOffset === undefined) {
      log.info("Init: no clock offset found for a live content, " +
               "starting close to maximum available position");
      liveTime = maximumPosition;
    } else {
      log.info("Init: clock offset found for a live content, " +
               "checking if we can start close to it");
      const ast = manifest.availabilityStartTime === undefined ?
        0 :
        manifest.availabilityStartTime;
      const clockRelativeLiveTime = (performance.now() + clockOffset) / 1000 - ast;
      liveTime = Math.min(maximumPosition,
                          clockRelativeLiveTime);
    }
    const diffFromLiveTime =
      suggestedPresentationDelay !== undefined ? suggestedPresentationDelay :
      lowLatencyMode                           ? DEFAULT_LIVE_GAP.LOW_LATENCY :
                                                 DEFAULT_LIVE_GAP.DEFAULT;
    log.debug(`Init: ${liveTime} defined as the live time, applying a live gap` +
              ` of ${diffFromLiveTime}`);
    return Math.max(liveTime - diffFromLiveTime, minimumPosition);
  }

  log.info("Init: starting at the minimum available position:", minimumPosition);
  return minimumPosition;
}
