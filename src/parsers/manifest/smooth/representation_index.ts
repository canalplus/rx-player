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
  ICustomError,
  NetworkError,
} from "../../../errors";
import log from "../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../manifest";
import clearTimelineFromPosition from "../utils/clear_timeline_from_position";
import {
  checkDiscontinuity,
  getIndexSegmentEnd,
} from "../utils/index_helpers";
import isSegmentStillAvailable from "../utils/is_segment_still_available";
import updateSegmentTimeline from "../utils/update_segment_timeline";
import addSegmentInfos from "./utils/add_segment_infos";
import { replaceSegmentSmoothTokens } from "./utils/tokens";

export interface IIndexSegment { start : number;
                                 duration : number;
                                 repeatCount: number; }

interface ITimelineIndex { presentationTimeOffset? : number;
                           timescale : number;
                           media : string;
                           timeline : IIndexSegment[];
                           startNumber? : number;
                           isLive : boolean;
                           timeShiftBufferDepth? : number;
                           manifestReceivedTime? : number; }

/**
 * @param {Number} start
 * @param {Number} up
 * @param {Number} duration
 * @returns {Number}
 */
function getSegmentNumber(
  start : number,
  up : number,
  duration : number
) : number {
  const diff = up - start;
  return diff > 0 ? Math.floor(diff / duration) :
                    0;
}

/**
 * Convert second-based start time and duration to the timescale of the
 * manifest's index.
 * @param {Object} index
 * @param {Number} start
 * @param {Number} duration
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
function normalizeRange(
  index: { timescale?: number },
  start: number,
  duration: number
) : { up: number;
      to: number; }
{
  const timescale = index.timescale === undefined ||
                    index.timescale === 0 ? 1 :
                                            index.timescale;
  return { up: start * timescale,
           to: (start + duration) * timescale };
}

/**
 * Calculate the number of times a segment repeat based on the next segment.
 * @param {Object} segment
 * @param {Object} nextSegment
 * @returns {Number}
 */
function calculateRepeat(
  segment : IIndexSegment,
  nextSegment? : IIndexSegment
) : number {
  let repeatCount = segment.repeatCount;

  // A negative value of the @r attribute of the S element indicates
  // that the duration indicated in @d attribute repeats until the
  // start of the next S element, the end of the Period or until the
  // next MPD update.
  // TODO Also for SMOOTH????
  if (segment.duration != null && repeatCount < 0) {
    const repeatEnd = nextSegment !== undefined ? nextSegment.start :
                                                  Infinity;
    repeatCount = Math.ceil((repeatEnd - segment.start) / segment.duration) - 1;
  }

  return repeatCount;
}

export interface ISmoothRIOptions {
  aggressiveMode : boolean;
  isLive : boolean;
  segmentPrivateInfos : ISmoothInitSegmentPrivateInfos;
}

// Information allowing to generate an init segment
interface ISmoothInitSegmentPrivateInfos {
  bitsPerSample? : number;
  channels? : number;
  codecPrivateData? : string;
  packetSize? : number;
  samplingRate? : number;
  protection? : { keyId : Uint8Array };
}

/**
 * RepresentationIndex implementation for Smooth Manifests.
 *
 * Allows to interact with the index to create new Segments.
 *
 * @class SmoothRepresentationIndex
 */
export default class SmoothRepresentationIndex implements IRepresentationIndex {
  // Information needed to generate an initialization segment.
  // Taken from the Manifest.
  private _initSegmentInfos : { codecPrivateData? : string;
                                bitsPerSample? : number;
                                channels? : number;
                                packetSize? : number;
                                samplingRate? : number;
                                timescale : number;
                                protection? : { keyId : Uint8Array }; };

  // if true, this class will return segments even if we're not sure they had
  // time to be generated on the server side.
  private _isAggressiveMode : boolean;

  // (only calculated for live contents)
  // Calculates the difference, in timescale, between the current time (as
  // calculated via performance.now()) and the time of the last segment known
  // to have been generated on the server-side.
  // Useful to know if a segment present in the timeline has actually been
  // generated on the server-side
  private _scaledLiveGap? : number;

  // Defines the end of the latest available segment when this index was known to
  // be valid, in the index's timescale.
  private _initialScaledLastPosition? : number;

  // Defines the earliest time when this index was known to be valid (that is, when
  // all segments declared in it are available). This means either:
  //   - the manifest downloading time, if known
  //   - else, the time of creation of this RepresentationIndex, as the best guess
  private _indexValidityTime : number;

  private _isLive : boolean;

  private _index : ITimelineIndex;

  constructor(index : ITimelineIndex, options : ISmoothRIOptions) {
    const { aggressiveMode, isLive, segmentPrivateInfos } = options;
    const estimatedReceivedTime = index.manifestReceivedTime == null ?
      performance.now() :
      index.manifestReceivedTime;
    this._index = index;
    this._indexValidityTime = estimatedReceivedTime;

    this._initSegmentInfos = { bitsPerSample: segmentPrivateInfos.bitsPerSample,
                               channels: segmentPrivateInfos.channels,
                               codecPrivateData: segmentPrivateInfos.codecPrivateData,
                               packetSize: segmentPrivateInfos.packetSize,
                               samplingRate: segmentPrivateInfos.samplingRate,
                               timescale: index.timescale,
                               protection: segmentPrivateInfos.protection };

    this._isAggressiveMode = aggressiveMode;
    this._isLive = isLive;

    if (index.timeline.length !== 0) {
      const lastItem = index.timeline[index.timeline.length - 1];
      const scaledEnd = getIndexSegmentEnd(lastItem, null);
      this._initialScaledLastPosition = scaledEnd;

      if (index.isLive) {
        const scaledReceivedTime = (estimatedReceivedTime / 1000) * index.timescale;
        this._scaledLiveGap = scaledReceivedTime - scaledEnd;
      }
    }
  }

  /**
   * Construct init Segment compatible with a Smooth Manifest.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return { id: "init",
             isInit: true,
             privateInfos: { smoothInitSegment: this._initSegmentInfos },
             mediaURLs: null,
             time: 0,
             end: 0,
             duration: 0,
             timescale: 1 };
  }

  /**
   * Generate a list of Segments for a particular period of time.
   *
   * @param {Number} _up
   * @param {Number} _to
   * @returns {Array.<Object>}
   */
  getSegments(_up : number, _to : number) : ISegment[] {
    this._refreshTimeline();
    const { up, to } = normalizeRange(this._index, _up, _to);
    const { timeline, timescale, media } = this._index;
    const isAggressive = this._isAggressiveMode;

    let currentNumber : number|undefined;
    const segments : ISegment[] = [];

    const timelineLength = timeline.length;

    const maxPosition = this._scaledLiveGap == null ?
      undefined :
      ((performance.now() / 1000) * timescale) - this._scaledLiveGap;

    for (let i = 0; i < timelineLength; i++) {
      const segmentRange = timeline[i];
      const { duration, start } = segmentRange;
      const repeat = calculateRepeat(segmentRange, timeline[i + 1]);
      let segmentNumberInCurrentRange = getSegmentNumber(start, up, duration);
      let segmentTime = start + segmentNumberInCurrentRange * duration;
      const timeToAddToCheckMaxPosition = isAggressive ? 0 :
                                                         duration;
      while (segmentTime < to &&
             segmentNumberInCurrentRange <= repeat &&
             (maxPosition == null ||
             (segmentTime + timeToAddToCheckMaxPosition) <= maxPosition))
      {
        const time = segmentTime;
        const number = currentNumber != null ?
          currentNumber + segmentNumberInCurrentRange :
          undefined;
        const segment = { id: String(segmentTime),
                          isInit: false,
                          time: time / timescale,
                          end: (time + duration) / timescale,
                          duration: duration / timescale,
                          timescale: 1 as const,
                          number,
                          mediaURLs: [replaceSegmentSmoothTokens(media, time)],
                          privateInfos: { smoothMediaSegment: { time,
                                                                duration } } };
        segments.push(segment);

        // update segment number and segment time for the next segment
        segmentNumberInCurrentRange++;
        segmentTime = start + segmentNumberInCurrentRange * duration;
      }

      if (segmentTime >= to) {
        // we reached ``to``, we're done
        return segments;
      }

      if (currentNumber != null) {
        currentNumber += repeat + 1;
      }
    }

    return segments;
  }

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * (If we should re-fetch the manifest)
   * @param {Number} up
   * @param {Number} to
   * @returns {Boolean}
   */
  shouldRefresh(up : number, to : number) : boolean {
    this._refreshTimeline();
    if (!this._index.isLive) {
      return false;
    }
    const { timeline, timescale } = this._index;

    const lastSegmentInCurrentTimeline = timeline[timeline.length - 1];
    if (lastSegmentInCurrentTimeline === undefined) {
      return false;
    }

    const repeat = lastSegmentInCurrentTimeline.repeatCount;
    const endOfLastSegmentInCurrentTimeline =
      lastSegmentInCurrentTimeline.start + (repeat + 1) *
        lastSegmentInCurrentTimeline.duration;

    if (to * timescale < endOfLastSegmentInCurrentTimeline) {
      return false;
    }

    if (up * timescale >= endOfLastSegmentInCurrentTimeline) {
      return true;
    }

    // ----

    const startOfLastSegmentInCurrentTimeline =
      lastSegmentInCurrentTimeline.start + repeat *
        lastSegmentInCurrentTimeline.duration;

    return (up * timescale) > startOfLastSegmentInCurrentTimeline;
  }

  /**
   * Returns first position available in the index.
   *
   * @param {Object} index
   * @returns {Number|null}
   */
  getFirstPosition() : number|null {
    this._refreshTimeline();
    const index = this._index;
    if (index.timeline.length === 0) {
      return null;
    }
    return index.timeline[0].start / index.timescale;
  }

  /**
   * Returns last position available in the index.
   * @param {Object} index
   * @returns {Number}
   */
  getLastPosition() : number|undefined {
    this._refreshTimeline();
    const index = this._index;

    if (this._scaledLiveGap == null) {
      const lastTimelineElement = index.timeline[index.timeline.length - 1];
      return getIndexSegmentEnd(lastTimelineElement, null) / index.timescale;
    }

    for (let i = index.timeline.length - 1; i >= 0; i--) {
      const timelineElt = index.timeline[i];
      const timescaledNow = (performance.now() / 1000) * index.timescale;
      const { start, duration, repeatCount } = timelineElt;
      for (let j = repeatCount; j >= 0; j--) {
        const end = start + (duration * (j + 1));
        const positionToReach = this._isAggressiveMode ? end - duration :
                                                         end;
        if (positionToReach <= timescaledNow - this._scaledLiveGap) {
          return end / index.timescale;
        }
      }
    }
    return undefined;
  }

  /**
   * @param {number} timeSec
   * @returns {number|null}
   */
  checkDiscontinuity(timeSec : number) : number | null {
    this._refreshTimeline();
    return checkDiscontinuity(this._index, timeSec, undefined);
  }

  /**
   * @returns {boolean}
   */
  areSegmentsChronologicallyGenerated() : true {
    return true;
  }

  isSegmentStillAvailable(segment : ISegment) : boolean | undefined {
    if (segment.isInit) {
      return true;
    }
    this._refreshTimeline();
    const { timeline, timescale } = this._index;
    return isSegmentStillAvailable(segment, timeline, timescale, 0);
  }

  /**
   * @param {Error} error
   * @returns {Boolean}
   */
  canBeOutOfSyncError(error : ICustomError) : boolean {
    if (!this._isLive) {
      return false;
    }
    return error instanceof NetworkError &&
           (error.isHttpError(404) || error.isHttpError(412));
  }

  /**
   * Replace this RepresentationIndex by a newly downloaded one.
   * Check if the old index had more information about new segments and re-add
   * them if that's the case.
   * @param {Object} newIndex
   */
  _replace(newIndex : SmoothRepresentationIndex) : void {
    const oldTimeline = this._index.timeline;
    const newTimeline = newIndex._index.timeline;
    const oldTimescale = this._index.timescale;
    const newTimescale = newIndex._index.timescale;

    this._index = newIndex._index;
    this._initialScaledLastPosition = newIndex._initialScaledLastPosition;
    this._indexValidityTime = newIndex._indexValidityTime;
    this._scaledLiveGap = newIndex._scaledLiveGap;

    if (oldTimeline.length === 0 ||
        newTimeline.length === 0 ||
        oldTimescale !== newTimescale)
    {
      return; // don't take risk, if something is off, take the new one
    }

    const lastOldTimelineElement = oldTimeline[oldTimeline.length - 1];
    const lastNewTimelineElement = newTimeline[newTimeline.length - 1];
    const newEnd = getIndexSegmentEnd(lastNewTimelineElement, null);
    if (getIndexSegmentEnd(lastOldTimelineElement, null) <= newEnd) {
      return;
    }

    for (let i = 0; i < oldTimeline.length; i++) {
      const oldTimelineRange = oldTimeline[i];
      const oldEnd = getIndexSegmentEnd(oldTimelineRange, null);
      if (oldEnd === newEnd) { // just add the supplementary segments
        this._index.timeline = this._index.timeline.concat(oldTimeline.slice(i + 1));
        return;
      }

      if (oldEnd > newEnd) { // adjust repeatCount + add supplementary segments
        if (oldTimelineRange.duration !== lastNewTimelineElement.duration) {
          return;
        }

        const rangeDuration = newEnd - oldTimelineRange.start;
        if (rangeDuration === 0) {
          log.warn("Smooth Parser: a discontinuity detected in the previous manifest" +
            " has been resolved.");
          this._index.timeline = this._index.timeline.concat(oldTimeline.slice(i));
          return;
        }
        if (rangeDuration < 0 || rangeDuration % oldTimelineRange.duration !== 0) {
          return;
        }

        const repeatWithOld = (rangeDuration / oldTimelineRange.duration) - 1;
        const relativeRepeat = oldTimelineRange.repeatCount - repeatWithOld;
        if (relativeRepeat < 0) {
          return;
        }
        lastNewTimelineElement.repeatCount += relativeRepeat;
        const supplementarySegments = oldTimeline.slice(i + 1);
        this._index.timeline = this._index.timeline.concat(supplementarySegments);
        return;
      }
    }
  }

  _update(newIndex : SmoothRepresentationIndex) : void {
    updateSegmentTimeline(this._index.timeline, newIndex._index.timeline);
    this._initialScaledLastPosition = newIndex._initialScaledLastPosition;
    this._indexValidityTime = newIndex._indexValidityTime;
    this._scaledLiveGap = newIndex._scaledLiveGap;
  }

  /**
   * @returns {Boolean}
   */
  isFinished() : boolean {
    return !this._isLive;
  }

  /**
   * @returns {Boolean}
   */
  isInitialized() : true {
    return true;
  }

  _addSegments(
    nextSegments : Array<{ duration : number;
                           time : number;
                           timescale : number; }>,
    currentSegment : { duration : number;
                       time : number; }
  ) : void {
    this._refreshTimeline();
    for (let i = 0; i < nextSegments.length; i++) {
      addSegmentInfos(this._index, nextSegments[i], currentSegment);
    }
  }

  /**
   * Clean-up timeline to remove segment information which should not be
   * available due to the timeshift window
   */
  private _refreshTimeline() : void {
    // clean segments before time shift buffer depth
    if (this._initialScaledLastPosition == null) {
      return;
    }
    const index = this._index;
    const { timeShiftBufferDepth } = index;
    const timeSinceLastRealUpdate = (performance.now() -
                                     this._indexValidityTime) / 1000;
    const lastPositionEstimate = timeSinceLastRealUpdate +
                                 this._initialScaledLastPosition / index.timescale;

    if (timeShiftBufferDepth != null) {
      const minimumPosition = (lastPositionEstimate - timeShiftBufferDepth) *
                              index.timescale;
      clearTimelineFromPosition(index.timeline, minimumPosition);
    }
  }
}
