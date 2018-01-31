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
  IRepresentationIndex,
  ISegment,
} from "../../../manifest";
// import { IHSSManifestSegment } from "../types";

export interface IIndexSegment {
  ts : number; // start timestamp
  d? : number; // duration
  r : number; // repeat counter
}

interface ITimelineIndex {
  presentationTimeOffset? : number;
  timescale : number;
  media : string;
  timeline : IIndexSegment[];
  startNumber? : number;
}

/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} newSegment
 * @param {Number} newSegment.timescale
 * @param {Number} newSegment.time
 * @param {Number} newSegment.duration
 * @param {Object} currentSegment
 * @param {Number} currentSegment.timescale
 * @param {Number} currentSegment.time
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
  // duration informations that we can use to deduct the ts of the
  // next segment. this is the case where the new segment are
  // associated to a current segment and have the same ts
  const shouldDeductNextSegment = scaledCurrentTime != null &&
    (scaledNewSegment.time === scaledCurrentTime);
  if (shouldDeductNextSegment) {
    const newSegmentTs = scaledNewSegment.time + scaledNewSegment.duration;
    const lastSegmentTs = (last.ts + (last.d || 0) * last.r);
    const tsDiff = newSegmentTs - lastSegmentTs;

    if (tsDiff <= 0) { // same segment / behind the last
      return false;
    }

    // try to use the compact notation with @r attribute on the last
    // to elements of the timeline if we find out they have the same
    // duration
    if (last.d === -1) {
      const prev = timeline[timelineLength - 2];
      if (prev && prev.d === tsDiff) {
        prev.r++;
        timeline.pop();
      } else {
        last.d = tsDiff;
      }
    }

    index.timeline.push({
      d: -1,
      ts: newSegmentTs,
      r: 0,
    });
    return true;
  }

  // if the given timing has a timestamp after the timeline end we
  // just need to push a new element in the timeline, or increase
  // the @r attribute of the last element.
  else if (scaledNewSegment.time >= getTimelineRangeEnd(last)) {
    if (last.d === scaledNewSegment.duration) {
      last.r++;
    } else {
      index.timeline.push({
        d: scaledNewSegment.duration,
        ts: scaledNewSegment.time,
        r: 0,
      });
    }
    return true;
  }

  return false;
}

/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} ts
 * @returns {Number}
 */
function getSegmentIndex(index : any, ts : number) : number {
  const { timeline } = index;

  let low = 0;
  let high = timeline.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (timeline[mid].ts < ts) {
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
 * @param {Number} ts
 * @param {Number} up
 * @param {Number} duration
 * @returns {Number}
 */
function getSegmentNumber(
  ts : number,
  up : number,
  duration? : number
) : number {
  if (!duration) {
    return 0;
  }
  const diff = up - ts;
  if (diff > 0) {
    return Math.floor(diff / duration);
  } else {
    return 0;
  }
}

/**
 * Get end of the given index range, timescaled.
 * @param {Object} range
 * @param {Number} range.ts - the range's start time
 * @param {Number} range.d - the range's duration
 * @param {Number} range.r - the range's count. 0 for a single element, 1 for
 * 2 elements etc.
 * @returns {Number} - absolute end time of the range
 */
function getTimelineRangeEnd({ ts, d, r }: {
  ts : number;
  d? : number;
  r : number;
}): number {
  return (d == null || d === -1) ? ts : ts + (r + 1) * d;
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
 * @param {Number} ts
 * @param {Number} duration
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
function normalizeRange(
  index: { presentationTimeOffset?: number; timescale?: number }, // TODO
  ts: number,
  duration: number
): {
  up: number;
  to: number;
} {
  const pto = index.presentationTimeOffset || 0;
  const timescale = index.timescale || 1;

  return {
    up: (ts) * timescale - pto,
    to: (ts + duration) * timescale - pto,
  };
}

/**
 * Calculate the number of times a segment repeat based on the next segment.
 * @param {Object} segment
 * @param {Number} segment.ts - beginning timescaled timestamp
 * @param {Number} segment.d - timescaled duration of the segment
 * @param {Object} nextSegment
 * @param {Number} nextSegment.ts
 * @returns {Number}
 */
function calculateRepeat(
  segment : IIndexSegment,
  nextSegment : IIndexSegment
) : number {
  let repeatCount = segment.r || 0;

  // A negative value of the @r attribute of the S element indicates
  // that the duration indicated in @d attribute repeats until the
  // start of the next S element, the end of the Period or until the
  // next MPD update.
  // TODO Also for SMOOTH????
  if (segment.d != null && repeatCount < 0) {
    const repeatEnd = nextSegment ? nextSegment.ts : Infinity;
    repeatCount = Math.ceil((repeatEnd - segment.ts) / segment.d) - 1;
  }

  return repeatCount;
}

interface ISmoothInitSegmentPrivateInfos {
  codecPrivateData : string;
  bitsPerSample? : number;
  channels? : number;
  packetSize? : number;
  samplingRate? : number;
  protection? : {
    keyId : string;
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

    private _codecPrivateData : string;
    private _bitsPerSample? : number;
    private _channels? : number;
    private _packetSize? : number;
    private _samplingRate? : number;
    private _protection? : {
      keyId : string;
      keySystems: Array<{
        systemId : string;
        privateData : Uint8Array;
      }>;
    };

    private _index : any;
    // private _index : {
    //   timeline : IHSSManifestSegment[];
    //   timescale : number;
    // }; // TODO

    constructor(index : any, infos : ISmoothInitSegmentPrivateInfos) { // TODO
      this._index = index;
      this._bitsPerSample = infos.bitsPerSample;
      this._channels = infos.channels;
      this._codecPrivateData = infos.codecPrivateData;
      this._packetSize = infos.packetSize;
      this._samplingRate = infos.samplingRate;
      this._protection = infos.protection;
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
          type: "smooth-init",
          bitsPerSample: this._bitsPerSample,
          channels: this._channels,
          codecPrivateData: this._codecPrivateData,
          packetSize: this._packetSize,
          samplingRate: this._samplingRate,
          protection: this._protection,
        },
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
      const { timeline, timescale } = index;

      let currentNumber : number|undefined;
      const segments : ISegment[] = [];

      const timelineLength = timeline.length;

      // TODO(pierre): use @maxSegmentDuration if possible
      let maxEncounteredDuration = (timeline.length && timeline[0].d) || 0;

      for (let i = 0; i < timelineLength; i++) {
        const segmentRange = timeline[i];
        const { d, ts } = segmentRange;

        maxEncounteredDuration = Math.max(maxEncounteredDuration, d || 0);

        // live-added segments have @d attribute equals to -1
        if (d != null && d < 0) {
          // TODO what? May be to play it safe and avoid adding segments which are
          // not completely generated
          if (ts + maxEncounteredDuration < to) {
            const segment = {
              id: "" + ts,
              time: ts,
              isInit: false,
              timescale,
              number: currentNumber != null ? currentNumber : undefined,
            };
            segments.push(segment);
          }
          return segments;
        }

        const repeat = calculateRepeat(segmentRange, timeline[i + 1]);
        let segmentNumberInCurrentRange = getSegmentNumber(ts, up, d);
        let segmentTime = ts + segmentNumberInCurrentRange * (d == null ? 0 : d);
        while (segmentTime < to && segmentNumberInCurrentRange <= repeat) {
          const segment = {
            id: "" + segmentTime,
            time: segmentTime,
            isInit: false,
            duration: d,
            timescale,
            number: currentNumber != null ?
              currentNumber + segmentNumberInCurrentRange : undefined,
          };
          segments.push(segment);

          // update segment number and segment time for the next segment
          segmentNumberInCurrentRange++;
          segmentTime = ts + segmentNumberInCurrentRange * d;
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
     * @param {Array.<Object>} parsedSegments
     * @param {Number} from
     * @param {Number} to
     * @returns {Boolean}
     */
    shouldRefresh(parsedSegments : ISegment[], up : number, to : number) : boolean {
      const {
        timeline,
        timescale,
      } = this._index;

      const lastSegmentInTimeline = timeline[timeline.length - 1];
      if (!lastSegmentInTimeline) {
        return false;
      }

      const repeat = lastSegmentInTimeline.r || 0;
      const endOfLastSegment =
        lastSegmentInTimeline.ts + repeat * lastSegmentInTimeline.d;

      if (to * timescale < endOfLastSegment) {
        return false;
      }

      if (up * timescale >= endOfLastSegment) {
        return true;
      }

      const lastParsedSegment = parsedSegments[parsedSegments.length - 1];
      if (!lastParsedSegment) {
        return false;
      }

      const startOfLastSegment =
        lastSegmentInTimeline.ts + repeat * lastSegmentInTimeline.d;
      if (startOfLastSegment > lastParsedSegment.time) {
        return false;
      }

      return true;
    }

    /**
     * Returns first position in the index.
     *
     * @param {Object} index
     * @returns {Number}
     */
    getFirstPosition() : number|undefined {
      const index = this._index;
      if (!index.timeline.length) {
        return undefined;
      }
      return index.timeline[0].ts / index.timescale;
    }

    /**
     * Returns last position in the index.
     * @param {Object} index
     * @returns {Number}
     */
    getLastPosition() : number|undefined {
      const index = this._index;
      if (!index.timeline.length) {
        return undefined;
      }
      const lastTimelineElement = index.timeline[index.timeline.length - 1];
      return (getTimelineRangeEnd(lastTimelineElement) / index.timescale);
    }

    /**
     * Checks if the time given is in a discontinuity. That is:
     *   - We're on the upper bound of the current range (end of the range - time
     *     is inferior to the timescale)
     *   - The next range starts after the end of the current range.
     *
     * @param {Number} _time
     * @returns {Number} - If a discontinuity is present, this is the Starting ts
     * for the next (discontinuited) range. If not this is equal to -1.
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
      if (range.d === -1) {
        return -1;
      }

      const rangeUp = range.ts;
      const rangeTo = getTimelineRangeEnd(range);
      const nextRange = timeline[segmentIndex + 1];

      // when we are actually inside the found range and this range has
      // an explicit discontinuity with the next one
      if (rangeTo !== nextRange.ts &&
          time >= rangeUp &&
          time <= rangeTo &&
          (rangeTo - time) < timescale) {
        return nextRange.ts / timescale;
      }

      return -1;
    }

    _update(newIndex : SmoothRepresentationIndex) : void {
      this._index = newIndex._index;
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
    }
}
