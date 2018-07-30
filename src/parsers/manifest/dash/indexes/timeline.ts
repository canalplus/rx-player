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
} from "../../../../manifest";
import { createIndexURL } from "../helpers";
import {
  getInitSegment,
  getSegmentsFromTimeline,
  getTimelineItemRangeEnd,
  IIndexSegment,
} from "./helpers";

export interface ITimelineIndex {
  duration? : number;
  indexRange?: [number, number];
  initialization? : { mediaURL: string; range?: [number, number] };
  mediaURL : string;
  presentationTimeOffset? : number;
  startNumber? : number;
  timeline : IIndexSegment[];
  timescale : number;
}

export interface ITimelineIndexIndexArgument {
  duration? : number;
  indexRange?: [number, number];
  initialization? : { media? : string; range?: [number, number] };
  media? : string;
  presentationTimeOffset? : number;
  startNumber? : number;
  timeline : IIndexSegment[];
  timescale : number;
}

export interface ITimelineIndexContextArgument {
  periodStart : number;
  representationURL : string;
  representationId? : string;
  representationBitrate? : number;
}

/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} ts
 * @returns {Number}
 */
function getSegmentIndex(
  index : ITimelineIndex,
  ts : number
) : number {
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
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} newSegment
 * @param {Object} currentSegmentInfos
 * @param {Number} manifestTimeOffset
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(
  index : ITimelineIndex,
  newSegment : { time : number; duration : number; timescale : number },
  currentSegmentInfos? : { time : number; duration? : number; timescale : number },
  manifestTimeOffset? : number // TODO simplify this mess
) : boolean {
  const { timeline, timescale } = index;
  const timelineLength = timeline.length;
  const lastItem = timeline[timelineLength - 1];

  const scaledNewSegment = newSegment.timescale === timescale ? {
    time: newSegment.time,
    duration: newSegment.duration,
  } : {
    time: (newSegment.time / newSegment.timescale) * timescale,
    duration: (newSegment.duration / newSegment.timescale) * timescale,
  };

  let scaledCurrentTime;

  if (currentSegmentInfos && currentSegmentInfos.timescale) {
    scaledCurrentTime = (
      currentSegmentInfos.timescale === timescale ?
        currentSegmentInfos.time :
        (currentSegmentInfos.time / currentSegmentInfos.timescale) * timescale
    ) + (manifestTimeOffset || 0);
  }

  // in some circumstances, the new segment informations are only
  // duration informations that we can use to deduct the ts of the
  // next segment. this is the case where the new segment are
  // associated to a current segment and have the same ts
  const shouldDeductNextSegment = scaledCurrentTime != null &&
    (scaledNewSegment.time === scaledCurrentTime);
  if (shouldDeductNextSegment) {
    const newSegmentTs = scaledNewSegment.time + scaledNewSegment.duration;
    const lastSegmentTs = (lastItem.ts + lastItem.d * lastItem.r);
    const tsDiff = newSegmentTs - lastSegmentTs;

    if (tsDiff <= 0) { // same segment / behind the lastItem
      return false;
    }

    // try to use the compact notation with @r attribute on the lastItem
    // to elements of the timeline if we find out they have the same
    // duration
    if (lastItem.d === -1) {
      const prev = timeline[timelineLength - 2];
      if (prev && prev.d === tsDiff) {
        prev.r++;
        timeline.pop();
      } else {
        lastItem.d = tsDiff;
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
  // the @r attribute of the lastItem element.
  else if (scaledNewSegment.time >= getTimelineItemRangeEnd(lastItem)) {
    if (lastItem.d === scaledNewSegment.duration) {
      lastItem.r++;
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

export default class TimelineRepresentationIndex implements IRepresentationIndex {
  protected _index : ITimelineIndex;
  protected _manifestTimeOffset : number;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(
    index : ITimelineIndexIndexArgument,
    context : ITimelineIndexContextArgument
  ) {
    const {
      representationURL,
      representationId,
      representationBitrate,
      periodStart,
    } = context;

    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset : 0;

    this._manifestTimeOffset =
      presentationTimeOffset - periodStart * index.timescale;

    this._index = {
      duration: index.duration,
      indexRange: index.indexRange,
      initialization: index.initialization && {
        mediaURL: createIndexURL(
          representationURL,
          index.initialization.media,
          representationId,
          representationBitrate
        ),
        range: index.initialization.range,
      },
      mediaURL: createIndexURL(
        representationURL,
        index.media,
        representationId,
        representationBitrate
      ),
      presentationTimeOffset,
      startNumber: index.startNumber,
      timeline: index.timeline,
      timescale: index.timescale,
    };
  }

  /**
   * Construct init Segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return getInitSegment(this._index);
  }

  /**
   * Asks for segments to download for a given time range.
   * @param {Number} from - Beginning of the time wanted, in seconds
   * @param {Number} duration - duration wanted, in seconds
   * @returns {Array.<Object>}
   */
  getSegments(from : number, duration : number) : ISegment[] {
    return getSegmentsFromTimeline(this._index, from, duration, this._manifestTimeOffset);
  }

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * @param {Number} _start
   * @param {Number} end
   * @returns {Boolean}
   */
  shouldRefresh(_start : number, end : number) : boolean {
    const { timeline, timescale } = this._index;
    const scaledTo = end * timescale + this._manifestTimeOffset;

    let lastItem = timeline[timeline.length - 1];
    if (!lastItem) {
      return false;
    }

    if (lastItem.d < 0) {
      lastItem = { ts: lastItem.ts, d: 0, r: lastItem.r };
    }

    return scaledTo > getTimelineItemRangeEnd(lastItem);
  }

  /**
   * Returns first position in index.
   * @returns {Number|undefined}
   */
  getFirstPosition() : number|undefined {
    const index = this._index;
    if (!index.timeline.length) {
      return undefined;
    }
    return (index.timeline[0].ts / index.timescale) - this._manifestTimeOffset;
  }

  /**
   * Returns lastItem position in index.
   * @returns {Number|undefined}
   */
  getLastPosition() : number|undefined {
    const index = this._index;
    if (!index.timeline.length) {
      return undefined;
    }
    const lastTimelineElement = index.timeline[index.timeline.length - 1];
    return (getTimelineItemRangeEnd(lastTimelineElement) / index.timescale) -
      this._manifestTimeOffset;
  }

  /**
   * Checks if the time given is in a discontinuity. That is:
   *   - We're on the upper bound of the current range (end of the range - time
   *     is inferior to the timescale)
   *   - The next range starts after the end of the current range.
   * @param {Number} _time
   * @returns {Number} - If a discontinuity is present, this is the Starting ts
   * for the next (discontinuited) range. If not this is equal to -1.
   */
  checkDiscontinuity(_time : number) : number {
    const { timeline, timescale } = this._index;
    const scaledTime = _time * timescale * this._manifestTimeOffset;

    if (scaledTime <= 0) {
      return -1;
    }

    const segmentIndex = getSegmentIndex(this._index, scaledTime);
    if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
      return -1;
    }

    const timelineItem = timeline[segmentIndex];
    if (timelineItem.d === -1) {
      return -1;
    }

    const nextRange = timeline[segmentIndex + 1];
    if (nextRange == null) {
      return -1;
    }

    const rangeUp = timelineItem.ts;
    const rangeTo = getTimelineItemRangeEnd(timelineItem);

    // when we are actually inside the found range and this range has
    // an explicit discontinuity with the next one
    if (rangeTo !== nextRange.ts &&
        scaledTime >= rangeUp &&
        scaledTime <= rangeTo &&
        (rangeTo - scaledTime) < timescale) {
      return (nextRange.ts / timescale) - this._manifestTimeOffset;
    }

    return -1;
  }

  /**
   * @param {Object} newIndex
   */
  _update(
    newIndex : TimelineRepresentationIndex /* TODO @ index refacto */
  ) : void {
    this._index = newIndex._index;
  }

  /**
   * We do not have to add new segments to SegmentList-based indexes.
   * @param {Array.<Object>} nextSegments
   * @param {Object|undefined} currentSegmentInfos
   * @returns {Array}
   */
  _addSegments(
    nextSegments : Array<{ duration : number; time : number; timescale : number }>,
    currentSegmentInfos? : {
      duration? : number;
      time : number;
      timescale : number;
    }
  ) : void {
    for (let i = 0; i < nextSegments.length; i++) {
      _addSegmentInfos(
        this._index, nextSegments[i], currentSegmentInfos, this._manifestTimeOffset);
    }
  }
}
