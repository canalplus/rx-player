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

// TODO This file should probably be moved somewhere in the net folder
// TODO Should also probably a class implementing an interface e.g.
// IIndexManager (with the index in state?)

import { Segment } from "../../manifest";
import {
  getInitSegment,
  getTimelineRangeEnd,
  IIndexSegment,
  scale,
  setTimescale,
} from "./helpers";
import TimelineIndex from "./timeline";

interface ISmoothIndex {
  presentationTimeOffset? : number;
  timescale : number;
  media: string;
  timeline : IIndexSegment[];
}

export default {
  getSegments: TimelineIndex.getSegments, // TODO Re-implement?
  getInitSegment,
  checkDiscontinuity: TimelineIndex.checkDiscontinuity, // TODO Re-implement?
  _addSegmentInfos: TimelineIndex._addSegmentInfos,
  setTimescale,
  scale,

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * (If we should re-fetch the manifest)
   * @param {Object} index
   * @param {Number} time
   * @param {Number} from
   * @param {Number} to
   * @returns {Boolean}
   */
  shouldRefresh(
    index : ISmoothIndex,
    parsedSegments : Segment[],
    up : number,
    to : number
  ) : boolean {
    const {
      timeline,
      timescale,
    } = index;

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
  },

  /**
   * Returns first position in index.
   * @param {Object} index
   * @returns {Number}
   */
  getFirstPosition(index : ISmoothIndex) : number|undefined {
    if (!index.timeline.length) {
      return undefined;
    }
    return index.timeline[0].ts / index.timescale;
  },

  /**
   * Returns last position in index.
   * @param {Object} index
   * @returns {Number}
   */
  getLastPosition(index : ISmoothIndex) : number|undefined {
    if (!index.timeline.length) {
      return undefined;
    }
    const lastTimelineElement = index.timeline[index.timeline.length - 1];
    return (getTimelineRangeEnd(lastTimelineElement) / index.timescale);
  },
};
