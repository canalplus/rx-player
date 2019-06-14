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

import log from "../../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../../manifest";
import {
  createIndexURL,
  fromIndexTime,
  getIndexSegmentEnd,
  getInitSegment,
  getSegmentsFromTimeline,
  IIndexSegment,
  toIndexTime,
} from "./helpers";

// index property defined for a SegmentTimeline RepresentationIndex
export interface ITimelineIndex {
  duration? : number; // duration of each element in the timeline, in the
                      // timescale given (see timescale and timeline)
  indexRange?: [number, number]; // byte range for a possible index of segments
                                 // in the server
  indexTimeOffset : number; // Temporal offset, in the current timescale (see
                            // timescale), to add to the presentation time
                            // (time a segment has at decoding time) to
                            // obtain the corresponding media time (original
                            // time of the media segment in the index and on
                            // the media file).
                            // For example, to look for a segment beginning at
                            // a second `T` on a HTMLMediaElement, we
                            // actually will look for a segment in the index
                            // beginning at:
                            // ``` T * timescale + indexTimeOffset ```
  initialization? : { // informations on the initialization segment
    mediaURL: string; // URL to access the initialization segment
    range?: [number, number]; // possible byte range to request it
  };
  isDynamic : boolean; // Whether this index can change with time.
  mediaURL : string; // base URL to access any segment. Can contain token to
                     // replace to convert it to a real URL
  startNumber? : number; // number from which the first segments in this index
                         // starts with
  timeline : IIndexSegment[]; // Every segments defined in this index
  timelineEnd : number|undefined; // Absolute end of the timeline, in the
                                  // current timescale
  timescale : number; // timescale to convert a time given here into seconds.
                      // This is done by this simple operation:
                      // ``timeInSeconds = timeInIndex * timescale``
}

// `index` Argument for a SegmentTimeline RepresentationIndex
// Most of the properties here are already defined in ITimelineIndex.
export interface ITimelineIndexIndexArgument {
  duration? : number;
  indexRange?: [number, number];
  initialization? : { media? : string; range?: [number, number] };
  media? : string;
  startNumber? : number;
  timeline : Array<{
    start? : number;
    repeatCount? : number;
    duration? : number;
  }>;
  timescale : number;
  presentationTimeOffset? : number; // Offset present in the index to convert
                                    // from the mediaTime (time declared in the
                                    // media segments and in this index) to the
                                    // presentationTime (time wanted when
                                    // decoding the segment).
                                    // Basically by doing something along the
                                    // line of:
                                    // ```
                                    // presentationTimeInSeconds =
                                    //   mediaTimeInSeconds -
                                    //   presentationTimeOffsetInSeconds *
                                    //   periodStartInSeconds
                                    // ```
                                    // The time given here is in the current
                                    // timescale (see timescale)
}

// Aditional argument for a SegmentTimeline RepresentationIndex
export interface ITimelineIndexContextArgument {
  periodStart : number; // Start of the period concerned by this
                        // RepresentationIndex, in seconds
  periodEnd : number|undefined; // End of the period concerned by this
                                // RepresentationIndex, in seconds
  isDynamic : boolean; // Whether the corresponding Manifest is dynamic
  representationBaseURL : string; // Base URL for the Representation concerned
  representationId? : string; // ID of the Representation concerned
  representationBitrate? : number; // Bitrate of the Representation concerned
}

/**
 * Translate parsed `S` node into Segment compatible with this index:
 * Find out the start, repeatCount and duration of each of these.
 *
 * @param {Object} item - parsed `S` node
 * @param {Object|null} previousItem - the previously parsed Segment (related
 * to the `S` node coming just before). If `null`, we're talking about the first
 * segment.
 * @param {Object|null} nextItem - the `S` node coming next. If `null`, we're
 * talking about the last segment.
 * @param {number} timelineStart - Absolute start for the timeline. In the same
 * timescale than the given `S` nodes.
 * @returns {Object|null}
 */
function fromParsedSToIndexSegment(
  item : { start? : number; repeatCount? : number; duration? : number },
  previousItem : IIndexSegment|null,
  nextItem : { start? : number; repeatCount? : number; duration? : number }|null,
  timelineStart : number
) : IIndexSegment|null {
  let start = item.start;
  let duration = item.duration;
  const repeatCount = item.repeatCount;
  if (start == null) {
    if (previousItem == null) {
      start = timelineStart;
    } else if (previousItem.duration != null) {
      start = previousItem.start +
              (previousItem.duration * (previousItem.repeatCount + 1));
    }
  }
  if ((duration == null || isNaN(duration)) &&
      nextItem && nextItem.start != null && !isNaN(nextItem.start) &&
      start != null && !isNaN(start)
  ) {
    duration = nextItem.start - start;
  }
  if ((start != null && !isNaN(start)) &&
      (duration != null && !isNaN(duration)) &&
      (repeatCount == null || !isNaN(repeatCount))
  ) {
    return { start,
             duration,
             repeatCount: repeatCount || 0 };
  }
  log.warn("DASH: A \"S\" Element could not have been parsed.");
  return null;
}

/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} start
 * @returns {Number}
 */
function getSegmentIndex(
  index : ITimelineIndex,
  start : number
) : number {
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

  return (low > 0) ? low - 1 :
                     low;
}

/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} newSegment
 * @param {Object} currentSegmentInfos
 * @param {Number} indexTimeOffset
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(
  index : ITimelineIndex,
  newSegment : { time : number; duration : number; timescale : number },
  currentSegmentInfos? : { time : number; duration? : number; timescale : number },
  timelineEnd? : number
) : boolean {
  const { timeline, timescale } = index;
  const timelineLength = timeline.length;
  const lastItem = timeline[timelineLength - 1];

  const scaledNewSegment =
    newSegment.timescale === timescale ? { time: newSegment.time,
                                           duration: newSegment.duration } :
                                         { time: (newSegment.time /
                                                  newSegment.timescale) * timescale,
                                           duration: (newSegment.duration /
                                                      newSegment.timescale) *
                                                     timescale };

  let scaledCurrentTime;

  if (currentSegmentInfos && currentSegmentInfos.timescale) {
    scaledCurrentTime = (
      currentSegmentInfos.timescale === timescale ? currentSegmentInfos.time :
                                                    (currentSegmentInfos.time /
                                                     currentSegmentInfos.timescale)
                                                    * timescale
    ) + index.indexTimeOffset;
  }

  // in some circumstances, the new segment informations are only
  // duration informations that we can use to deduct the start of the
  // next segment. this is the case where the new segment are
  // associated to a current segment and have the same start
  const shouldDeductNextSegment = scaledCurrentTime != null &&
                                  (scaledNewSegment.time === scaledCurrentTime);
  if (shouldDeductNextSegment) {
    const newSegmentStart = scaledNewSegment.time + scaledNewSegment.duration;
    const lastSegmentStart = lastItem.start + lastItem.duration * lastItem.repeatCount;
    const startDiff = newSegmentStart - lastSegmentStart;

    if (startDiff <= 0) { // same segment / behind the lastItem
      return false;
    }

    // try to use the compact notation with @r attribute on the lastItem
    // to elements of the timeline if we find out they have the same
    // duration
    if (lastItem.duration === -1) {
      const prev = timeline[timelineLength - 2];
      if (prev && prev.duration === startDiff) {
        prev.repeatCount++;
        timeline.pop();
      } else {
        lastItem.duration = startDiff;
      }
    }

    index.timeline.push({ duration: -1,
                          start: newSegmentStart,
                          repeatCount: 0 });
    return true;
  }

  // if the given timing has a timestamp after the timeline end we
  // just need to push a new element in the timeline, or increase
  // the @r attribute of the lastItem element.
  else if (scaledNewSegment.time >= getIndexSegmentEnd(lastItem, null, timelineEnd)) {
    if (lastItem.duration === scaledNewSegment.duration) {
      lastItem.repeatCount++;
    } else {
      index.timeline.push({ duration: scaledNewSegment.duration,
                            start: scaledNewSegment.time,
                            repeatCount: 0 });
    }
    return true;
  }

  return false;
}

export default class TimelineRepresentationIndex implements IRepresentationIndex {
  protected _index : ITimelineIndex;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(
    index : ITimelineIndexIndexArgument,
    context : ITimelineIndexContextArgument
  ) {
    const { isDynamic,
            representationBaseURL,
            representationId,
            representationBitrate,
            periodStart,
            periodEnd } = context;
    const { timescale } = index;

    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset : 0;

    const scaledStart = periodStart * timescale;
    const indexTimeOffset = presentationTimeOffset - scaledStart;

    const initialTimeline = index.timeline;
    const timeline : IIndexSegment[] = [];
    for (let i = 0; i < initialTimeline.length; i++) {
      const item = initialTimeline[i];
      const nextItem = timeline[timeline.length - 1] || null;
      const prevItem = initialTimeline[i + 1] || null;
      const timelineElement = fromParsedSToIndexSegment(item,
                                                        nextItem,
                                                        prevItem,
                                                        scaledStart);
      if (timelineElement) {
        timeline.push(timelineElement);
      }
    }
    this._index = { duration: index.duration,
                    indexRange: index.indexRange,
                    indexTimeOffset,
                    initialization: index.initialization && {
                      mediaURL: createIndexURL(representationBaseURL,
                                               index.initialization.media,
                                               representationId,
                                               representationBitrate),
                      range: index.initialization.range,
                    },
                    isDynamic,
                    mediaURL: createIndexURL(representationBaseURL,
                                             index.media,
                                             representationId,
                                             representationBitrate),
                    startNumber: index.startNumber,
                    timeline,
                    timelineEnd: periodEnd == null ? undefined :
                                                     periodEnd * timescale,
                    timescale };
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
    return getSegmentsFromTimeline(this._index, from, duration);
  }

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * @param {Number} _start
   * @param {Number} end
   * @returns {Boolean}
   */
  shouldRefresh(_start : number, end : number) : boolean {
    if (!this._index.isDynamic || this._index.timeline.length === 0) {
      return false;
    }
    const { timeline } = this._index;

    let lastItem = timeline[timeline.length - 1];
    if (lastItem == null || lastItem.repeatCount < 0) {
      return false;
    }

    if (lastItem.duration < 0) {
      lastItem = { start: lastItem.start,
                   duration: 0,
                   repeatCount: lastItem.repeatCount };
    }

    const scaledStart = toIndexTime(this._index, _start);
    const indexEnd = getIndexSegmentEnd(lastItem, null, this._index.timelineEnd);
    if (scaledStart >= indexEnd) {
      return true;
    }

    const scaledTo = toIndexTime(this._index, end);

    // Wait for at least the last item's duration
    return (scaledTo - lastItem.duration) > indexEnd;
  }

  /**
   * Returns first position in index.
   * @returns {Number|undefined}
   */
  getFirstPosition() : number|undefined {
    const index = this._index;
    if (index.timeline.length === 0) {
      return undefined;
    }
    return fromIndexTime(index, index.timeline[0].start);
  }

  /**
   * Returns lastItem position in index.
   * @returns {Number|undefined}
   */
  getLastPosition() : number|undefined {
    const { timeline, timelineEnd } = this._index;
    if (timeline.length === 0) {
      return undefined;
    }
    const lastTimelineElement = timeline[timeline.length - 1];
    const lastTime = getIndexSegmentEnd(lastTimelineElement, null, timelineEnd);
    return fromIndexTime(this._index, lastTime);
  }

  /**
   * Checks if the time given is in a discontinuity. That is:
   *   - We're on the upper bound of the current range (end of the range - time
   *     is inferior to the timescale)
   *   - The next range starts after the end of the current range.
   * @param {Number} _time
   * @returns {Number} - If a discontinuity is present, this is the Starting
   * time for the next (discontinuited) range. If not this is equal to -1.
   */
  checkDiscontinuity(_time : number) : number {
    const { timeline, timescale, timelineEnd } = this._index;
    const scaledTime = toIndexTime(this._index, _time);

    if (scaledTime <= 0) {
      return -1;
    }

    const segmentIndex = getSegmentIndex(this._index, scaledTime);
    if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
      return -1;
    }

    const timelineItem = timeline[segmentIndex];
    if (timelineItem.duration === -1) {
      return -1;
    }

    const nextTimelineItem = timeline[segmentIndex + 1];
    if (nextTimelineItem == null) {
      return -1;
    }

    const rangeUp = timelineItem.start;
    const rangeTo = getIndexSegmentEnd(timelineItem, nextTimelineItem, timelineEnd);

    // when we are actually inside the found range and this range has
    // an explicit discontinuity with the next one
    if (rangeTo !== nextTimelineItem.start &&
        scaledTime >= rangeUp &&
        scaledTime <= rangeTo &&
        (rangeTo - scaledTime) < timescale)
    {
      return fromIndexTime(this._index, nextTimelineItem.start);
    }

    return -1;
  }

  /**
   * @param {Object} newIndex
   */
  _update(newIndex : TimelineRepresentationIndex) : void {
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
    currentSegmentInfos? : { duration? : number;
                             time : number;
                             timescale : number; }
  ) : void {
    for (let i = 0; i < nextSegments.length; i++) {
      _addSegmentInfos(this._index, nextSegments[i], currentSegmentInfos);
    }
  }
}
