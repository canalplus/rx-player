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

const { Segment } = require("../segment");

function getTimelineBound({ ts, d, r }) {
  if (d === -1) {
    return ts;
  } else {
    return ts + (r+1) * d;
  }
}

class Timeline {
  constructor(adaptation, representation, index) {
    this.adaptation = adaptation;
    this.representation = representation;
    this.index = index;
    this.timeline = index.timeline;
  }

  static getLiveEdge(videoIndex, manifest) {
    const lastTimelineElement = videoIndex.timeline[videoIndex.timeline.length - 1];
    const calculatedLiveEdge = (
      (getTimelineBound(lastTimelineElement) / videoIndex.timescale) - manifest.suggestedPresentationDelay
    );
    const minimumLiveEdge = (videoIndex.timeline[0].ts / videoIndex.timescale) + 1.0;

    return Math.max(minimumLiveEdge, calculatedLiveEdge);
  }

  createSegment(time, range, duration) {
    const { adaptation, representation } = this;
    const { media } = this.index;
    return Segment.create(
      adaptation,     /* adaptation */
      representation, /* representation */
      time,           /* id */
      media,          /* media */
      time,           /* time */
      duration,       /* duration */
      0,              /* number */
      range,          /* range */
      null,           /* indexRange */
      false           /* init */
    );
  }

  calculateRepeat(seg, nextSeg) {
    let rep = seg.r || 0;

    // A negative value of the @r attribute of the S element indicates
    // that the duration indicated in @d attribute repeats until the
    // start of the next S element, the end of the Period or until the
    // next MPD update.
    if (rep < 0) {
      const repEnd = nextSeg
        ? nextSeg.t
        : Infinity;
      rep = Math.ceil((repEnd - seg.ts) / seg.d) - 1;
    }

    return rep;
  }

  checkDiscontinuity(time) {
    if (time <= 0) {
      return -1;
    }

    const index = this.getSegmentIndex(time);
    if (index < 0 || index >= this.timeline.length - 1) {
      return -1;
    }

    const range = this.timeline[index];
    if (range.d === -1) {
      return -1;
    }

    const rangeUp = range.ts;
    const rangeTo = getTimelineBound(range);
    const nextRange = this.timeline[index + 1];

    const timescale = this.index.timescale || 1;
    // when we are actually inside the found range and this range has
    // an explicit discontinuity with the next one
    if (rangeTo !== nextRange.ts &&
        time >= rangeUp &&
        time <= rangeTo &&
        (rangeTo - time) < timescale) {
      return nextRange.ts;
    }

    return -1;
  }

  checkRange(up) {
    let last = this.timeline[this.timeline.length - 1];
    if (!last) {
      return true;
    }

    if (last.d < 0) {
      last = { ts: last.ts, d: 0, r: last.r };
    }

    return (up <= getTimelineBound(last));
  }

  getSegmentIndex(ts) {
    const timeline = this.timeline;
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

  getSegmentNumber(ts, up, duration) {
    const diff = up - ts;
    if (diff > 0) {
      return Math.floor(diff / duration);
    } else {
      return 0;
    }
  }

  getSegments(up, to) {
    const timeline = this.index.timeline;
    const segments = [];

    const timelineLength = timeline.length;
    let timelineIndex = this.getSegmentIndex(up) - 1;
    // TODO(pierre): use @maxSegmentDuration if possible
    let maxDuration = (timeline.length && timeline[0].d) || 0;

    loop:
    for(;;) {
      if (++timelineIndex >= timelineLength) {
        break;
      }

      const segmentRange = timeline[timelineIndex];
      const { d, ts, range } = segmentRange;
      maxDuration = Math.max(maxDuration, d);

      // live-added segments have @d attribute equals to -1
      if (d < 0) {
        if (ts + maxDuration < to) {
          segments.push(this.createSegment(ts, range, undefined));
        }
        break;
      }

      const repeat = this.calculateRepeat(segmentRange, timeline[timelineIndex + 1]);
      let segmentNumber = this.getSegmentNumber(ts, up, d);
      let segmentTime;
      while ((segmentTime = ts + segmentNumber * d) < to) {
        if (segmentNumber++ <= repeat) {
          segments.push(this.createSegment(segmentTime, range, d));
        } else {
          continue loop;
        }
      }

      break;
    }

    return segments;
  }

  addSegment(newSegment, currentSegment) {
    const timeline = this.timeline;
    const timelineLength = timeline.length;
    const last = timeline[timelineLength - 1];

    // in some circumstances, the new segment informations are only
    // duration informations that we can use de deduct the ts of the
    // next segment. this is the case where the new segment are
    // associated to a current segment and have the same ts
    const shouldDeductNextSegment = !!currentSegment && (newSegment.ts === currentSegment.ts);
    if (shouldDeductNextSegment) {
      const newSegmentTs = newSegment.ts + newSegment.d;
      const lastSegmentTs = (last.ts + last.d * last.r);
      const tsDiff = newSegmentTs - lastSegmentTs;

      if (tsDiff <= 0) {
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

      timeline.push({ d: -1, ts: newSegmentTs, r: 0 });
      return true;
    }

    // if the given timing has a timestamp after le timeline bound we
    // just need to push a new element in the timeline, or increase
    // the @r attribute of the last element.
    else if (newSegment.ts >= getTimelineBound(last)) {
      if (last.d === newSegment.d) {
        last.r++;
      } else {
        timeline.push({ d: newSegment.d, ts: newSegment.ts, r: 0 });
      }
      return true;
    }

    return false;
  }
}

module.exports = Timeline;
