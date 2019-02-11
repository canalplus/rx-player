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

import log from "../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../manifest";
import { replaceSegmentSmoothTokens } from "./utils/tokens";

export interface IIndexSegment {
  start : number;
  duration : number;
  repeatCount: number;
}

interface ITimelineIndex {
  presentationTimeOffset? : number;
  timescale : number;
  media : string;
  timeline : IIndexSegment[];
  startNumber? : number;
  isLive : boolean;
  timeShiftBufferDepth? : number;
  manifestReceivedTime? : number;
}

/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} newSegment
 * @param {Object} currentSegment
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(
  index : ITimelineIndex,
  newSegment : {
    time : number;
    duration : number;
    timescale : number;
  },
  currentSegment : {
    time : number;
    duration? : number;
    timescale? : number;
  }
) : boolean {
  const { timeline, timescale } = index;
  const timelineLength = timeline.length;
  const last = timeline[timelineLength - 1];

  const scaledNewSegment = newSegment.timescale === timescale ? {
    time: newSegment.time,
    duration: newSegment.duration,
  } : {
    time: (newSegment.time / newSegment.timescale) * timescale,
    duration: (newSegment.duration / newSegment.timescale) * timescale,
  };

  let scaledCurrentTime;

  if (currentSegment && currentSegment.timescale) {
    scaledCurrentTime = currentSegment.timescale === timescale ?
      currentSegment.time :
      (currentSegment.time / currentSegment.timescale) * timescale;
  }

  // in some circumstances, the new segment informations are only
  // duration informations that we can use to deduct the start of the
  // next segment. this is the case where the new segment are
  // associated to a current segment and have the same start
  const shouldDeductNextSegment = scaledCurrentTime != null &&
    (scaledNewSegment.time === scaledCurrentTime);
  if (shouldDeductNextSegment) {
    const newSegmentStart = scaledNewSegment.time + scaledNewSegment.duration;
    const lastSegmentStart = (last.start + (last.duration || 0) * last.repeatCount);
    const startDiff = newSegmentStart - lastSegmentStart;

    if (startDiff <= 0) { // same segment / behind the last
      return false;
    }

    // try to use the compact notation with @r attribute on the last
    // to elements of the timeline if we find out they have the same
    // duration
    if (last.duration === -1) {
      const prev = timeline[timelineLength - 2];
      if (prev && prev.duration === startDiff) {
        prev.repeatCount++;
        timeline.pop();
      } else {
        last.duration = startDiff;
      }
    }

    index.timeline.push({
      duration: -1,
      start: newSegmentStart,
      repeatCount: 0,
    });
    return true;
  }

  // if the given timing has a timestamp after the timeline end we
  // just need to push a new element in the timeline, or increase
  // the @r attribute of the last element.
  else if (scaledNewSegment.time >= getTimelineRangeEnd(last)) {
    if (last.duration === scaledNewSegment.duration) {
      last.repeatCount++;
    } else {
      index.timeline.push({
        duration: scaledNewSegment.duration,
        start: scaledNewSegment.time,
        repeatCount: 0,
      });
    }
    return true;
  }

  return false;
}

/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} start
 * @returns {Number}
 */
function getSegmentIndex(index : ITimelineIndex, start : number) : number {
  const { timeline } = index;

  let low = 0;
  let high = timeline.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (timeline[mid].start < start) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return (low > 0)
    ? low - 1
    : low;
}

/**
 * @param {Number} start
 * @param {Number} up
 * @param {Number} duration
 * @returns {Number}
 */
function getSegmentNumber(
  start : number,
  up : number,
  duration? : number
) : number {
  if (!duration) {
    return 0;
  }
  const diff = up - start;
  if (diff > 0) {
    return Math.floor(diff / duration);
  } else {
    return 0;
  }
}

/**
 * Get end of the given index range, timescaled.
 * @param {Object} range
 * @returns {Number} - absolute end time of the range
 */
function getTimelineRangeEnd({ start, duration, repeatCount }: {
  start : number;
  duration? : number;
  repeatCount : number;
}) : number {
  return (duration == null || duration === -1) ?
    start : start + (repeatCount + 1) * duration;
}

// interface ISmoothIndex {
//   presentationTimeOffset? : number;
//   timescale : number;
//   media? : string;
//   timeline : IIndexSegment[];
//   startNumber? : number;
// }

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
) : {
  up: number;
  to: number;
} {
  const timescale = index.timescale || 1;

  return {
    up: start * timescale,
    to: (start + duration) * timescale,
  };
}

/**
 * Calculate the number of times a segment repeat based on the next segment.
 * @param {Object} segment
 * @param {Object} nextSegment
 * @returns {Number}
 */
function calculateRepeat(
  segment : IIndexSegment,
  nextSegment : IIndexSegment
) : number {
  let repeatCount = segment.repeatCount || 0;

  // A negative value of the @r attribute of the S element indicates
  // that the duration indicated in @d attribute repeats until the
  // start of the next S element, the end of the Period or until the
  // next MPD update.
  // TODO Also for SMOOTH????
  if (segment.duration != null && repeatCount < 0) {
    const repeatEnd = nextSegment ? nextSegment.start : Infinity;
    repeatCount = Math.ceil((repeatEnd - segment.start) / segment.duration) - 1;
  }

  return repeatCount;
}

export interface ISmoothRIOptions {
  segmentPrivateInfos : ISmoothInitSegmentPrivateInfos;
  aggressiveMode : boolean;
}

interface ISmoothInitSegmentPrivateInfos {
  bitsPerSample? : number;
  channels? : number;
  codecPrivateData? : string;
  packetSize? : number;
  samplingRate? : number;
  protection? : {
    keyId : Uint8Array;
    keySystems: Array<{
      systemId : string;
      privateData : Uint8Array;
    }>;
  };
}

/**
 * RepresentationIndex implementation for Smooth Manifests.
 *
 * Allows to interact with the index to create new Segments.
 *
 * @class SmoothRepresentationIndex
 */
export default class SmoothRepresentationIndex
  implements IRepresentationIndex {

    // Informations needed to generate an initialization segment.
    // Taken from the Manifest.
    private _initSegmentInfos : {
      codecPrivateData? : string;
      bitsPerSample? : number;
      channels? : number;
      packetSize? : number;
      samplingRate? : number;
      protection? : {
        keyId : Uint8Array;
        keySystems: Array<{
          systemId : string;
          privateData : Uint8Array;
        }>;
      };
    };

    // if true, this class will return segments even if we're not sure they had
    // time to be generated on the server side.
    private _isAggressiveMode? : boolean;

    // (only calculated for live contents)
    // Calculates the difference, in timescale, between the current time (as
    // calculated via performance.now()) and the time of the last segment known
    // to have been generated on the server-side.
    // Useful to know if a segment present in the timeline has actually been
    // generated on the server-side
    private _scaledLiveGap? : number;

    // Defines the end of the latest available segment when this index was known to
    // be valid.
    private _initialLastPosition? : number;

    // Defines the earliest time when this index was known to be valid (that is, when
    // all segments declared in it are available). This means either:
    //   - the manifest downloading time, if known
    //   - else, the time of creation of this RepresentationIndex, as the best guess
    private _indexValidityTime : number;

    private _index : ITimelineIndex;

    constructor(index : ITimelineIndex, options : ISmoothRIOptions) {
      const { aggressiveMode, segmentPrivateInfos } = options;
      const estimatedReceivedTime = index.manifestReceivedTime == null ?
        performance.now() : index.manifestReceivedTime;
      this._index = index;
      this._indexValidityTime = estimatedReceivedTime;

      this._initSegmentInfos = {
        bitsPerSample: segmentPrivateInfos.bitsPerSample,
        channels: segmentPrivateInfos.channels,
        codecPrivateData: segmentPrivateInfos.codecPrivateData,
        packetSize: segmentPrivateInfos.packetSize,
        samplingRate: segmentPrivateInfos.samplingRate,
        protection: segmentPrivateInfos.protection,
      };

      this._isAggressiveMode = aggressiveMode;

      if (index.timeline.length) {
        const lastItem = index.timeline[index.timeline.length - 1];
        const scaledEnd = getTimelineRangeEnd(lastItem);
        this._initialLastPosition = scaledEnd / index.timescale;

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
      const index = this._index;

      return {
        id: "init",
        isInit: true,
        time: 0,
        timescale: index.timescale,
        privateInfos: {
          smoothInit: this._initSegmentInfos,
        },
        mediaURL: null,
      };
    }

    /**
     * Generate a list of Segments for a particular period of time.
     *
     * @param {Number} _up
     * @param {Number} _to
     * @returns {Array.<Object>}
     */
    getSegments(_up : number, _to : number) : ISegment[] {
      const index = this._index;
      const { up, to } = normalizeRange(index, _up, _to);
      const { timeline, timescale, media } = index;

      let currentNumber : number|undefined;
      const segments : ISegment[] = [];

      const timelineLength = timeline.length;

      // TODO(pierre): use @maxSegmentDuration if possible
      let maxEncounteredDuration = (timeline.length && timeline[0].duration) || 0;

      const maxPosition = this._isAggressiveMode || this._scaledLiveGap == null ?
        undefined : ((performance.now() / 1000) * timescale) - this._scaledLiveGap;

      for (let i = 0; i < timelineLength; i++) {
        const segmentRange = timeline[i];
        const { duration, start } = segmentRange;

        maxEncounteredDuration = Math.max(maxEncounteredDuration, duration || 0);

        // live-added segments have @d attribute equals to -1
        if (duration != null && duration < 0) {
          const approximateEnd = start + maxEncounteredDuration;
          if (
            approximateEnd < to &&
            (maxPosition == null || approximateEnd <= maxPosition)
          ) {
            const time = start;
            const segment = {
              id: "" + time,
              time,
              isInit: false,
              timescale,
              number: currentNumber != null ? currentNumber : undefined,
              mediaURL: replaceSegmentSmoothTokens(media, time),
            };
            segments.push(segment);
          }
          return segments;
        }

        const repeat = calculateRepeat(segmentRange, timeline[i + 1]);
        let segmentNumberInCurrentRange = getSegmentNumber(start, up, duration);
        let segmentTime = start + segmentNumberInCurrentRange *
          (duration == null ? 0 : duration);
        while (
          segmentTime < to &&
          segmentNumberInCurrentRange <= repeat &&
          (maxPosition == null || (segmentTime + duration) <= maxPosition)
        ) {
          const time = segmentTime;
          const number = currentNumber != null ?
            currentNumber + segmentNumberInCurrentRange : undefined;
          const segment = {
            id: "" + segmentTime,
            time,
            isInit: false,
            duration,
            timescale,
            number,
            mediaURL: replaceSegmentSmoothTokens(media, time),
          };
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
     * @param {Number} from
     * @param {Number} to
     * @returns {Boolean}
     */
    shouldRefresh(up : number, to : number) : boolean {
      if (!this._index.isLive) {
        return false;
      }
      const { timeline, timescale } = this._index;

      const lastSegmentInCurrentTimeline = timeline[timeline.length - 1];
      if (!lastSegmentInCurrentTimeline) {
        return false;
      }

      const repeat = lastSegmentInCurrentTimeline.repeatCount || 0;
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
     * @returns {Number}
     */
    getFirstPosition() : number|undefined {
      const index = this._index;
      if (!index.timeline.length) {
        return undefined;
      }
      return index.timeline[0].start / index.timescale;
    }

    /**
     * Returns last position available in the index.
     * @param {Object} index
     * @returns {Number}
     */
    getLastPosition() : number|undefined {
      const index = this._index;
      for (let i = index.timeline.length - 1; i >= 0; i--) {
        const lastTimelineElement = index.timeline[i];
        if (this._isAggressiveMode || this._scaledLiveGap == null) {
          return getTimelineRangeEnd(lastTimelineElement) / index.timescale;
        }
        const timescaledNow = (performance.now() / 1000) * index.timescale;
        const { start, duration, repeatCount } = lastTimelineElement;
        for (let j = repeatCount; j >= 0; j--) {
          const end = start + (duration * (j + 1));
          if (end <= timescaledNow - this._scaledLiveGap) {
            return end / index.timescale;
          }
        }
      }
      return undefined;
    }

    /**
     * Checks if the time given is in a discontinuity. That is:
     *   - We're on the upper bound of the current range (end of the range - time
     *     is inferior to the timescale)
     *   - The next range starts after the end of the current range.
     *
     * @param {Number} _time
     * @returns {Number} - If a discontinuity is present, this is the Starting
     * time for the next (discontinuited) range. If not this is equal to -1.
     */
    checkDiscontinuity(_time : number) : number {
      const index = this._index;
      const { timeline, timescale = 1 } = index;
      const time = _time * timescale;

      if (time <= 0) {
        return -1;
      }

      const segmentIndex = getSegmentIndex(index, time);
      if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
        return -1;
      }

      const range = timeline[segmentIndex];
      if (range.duration === -1) {
        return -1;
      }

      const rangeUp = range.start;
      const rangeTo = getTimelineRangeEnd(range);
      const nextRange = timeline[segmentIndex + 1];

      // when we are actually inside the found range and this range has
      // an explicit discontinuity with the next one
      if (rangeTo !== nextRange.start &&
          time >= rangeUp &&
          time <= rangeTo &&
          (rangeTo - time) < timescale) {
        return nextRange.start / timescale;
      }

      return -1;
    }

    /**
     * Update this RepresentationIndex by a newly downloaded one.
     * Check if the old index had more informations about new segments and
     * re-add them if that's the case.
     * @param {Object} newIndex
     */
    _update(newIndex : SmoothRepresentationIndex) : void {
      const oldTimeline = this._index.timeline;
      const newTimeline = newIndex._index.timeline;
      const oldTimescale = this._index.timescale;
      const newTimescale = newIndex._index.timescale;

      this._index = newIndex._index;
      this._initialLastPosition = newIndex._initialLastPosition;
      this._indexValidityTime = newIndex._indexValidityTime;
      this._scaledLiveGap = newIndex._scaledLiveGap;

      if (!oldTimeline.length || !newTimeline.length || oldTimescale !== newTimescale) {
        return; // don't take risk, if something is off, take the new one
      }

      const lastOldTimelineElement = oldTimeline[oldTimeline.length - 1];
      const lastNewTimelineElement = newTimeline[newTimeline.length - 1];
      const newEnd = getTimelineRangeEnd(lastNewTimelineElement);
      if (getTimelineRangeEnd(lastOldTimelineElement) <= newEnd) {
        return;
      }

      for (let i = 0; i < oldTimeline.length; i++) {
        const oldTimelineRange = oldTimeline[i];
        const oldEnd = getTimelineRangeEnd(oldTimelineRange);
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

    _addSegments(
      nextSegments : Array<{
        duration : number;
        time : number;
        timescale : number;
      }>,
      currentSegment : { duration : number; time : number; timescale : number}
    ) : void {
      for (let i = 0; i < nextSegments.length; i++) {
        _addSegmentInfos(this._index, nextSegments[i], currentSegment);
      }

      // clean segments before time shift buffer depth
      if (this._initialLastPosition != null) {
        const { timeShiftBufferDepth } = this._index;
        const lastPositionEstimate =
          (performance.now() - this._indexValidityTime) / 1000 +
          this._initialLastPosition;

        if (timeShiftBufferDepth != null) {
          const threshold =
            (lastPositionEstimate - timeShiftBufferDepth) * this._index.timescale;
          for (let i = 0; i < this._index.timeline.length; i++) {
            const segment = this._index.timeline[i];
            if (segment.start + segment.duration >= threshold) {
              this._index.timeline =
                this._index.timeline.slice(i, this._index.timeline.length);
              break;
            }
          }
        }
      }
    }
  }
