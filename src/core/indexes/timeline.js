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

var _ = require("canal-js-utils/misc");

function getTimelineBound({ ts, d, r }) {
  if (d === -1)
    return ts;
  else
    return ts + (r+1) * d;
}

function Timeline(index) {
  this.index = index;
  this.timeline = index.timeline;
}

Timeline.getLiveEdge = function(videoIndex, manifest) {
  var calculatedLiveEdge = (getTimelineBound(_.last(videoIndex.timeline)) / videoIndex.timescale) - manifest.suggestedPresentationDelay;
  var minimumLiveEdge = (videoIndex.timeline[0].ts / videoIndex.timescale) + 1.0;

  return Math.max(minimumLiveEdge, calculatedLiveEdge);
};

Timeline.prototype.createSegment = function(time, range, duration) {
  return {
    id: time,
    media: this.index.media,
    time,
    number: undefined,
    range,
    duration,
  };
};

Timeline.prototype.calculateRepeat = function(seg, nextSeg) {
  var rep = seg.r || 0;

  // A negative value of the @r attribute of the S element indicates
  // that the duration indicated in @d attribute repeats until the
  // start of the next S element, the end of the Period or until the
  // next MPD update.
  if (rep < 0) {
    var repEnd = nextSeg
      ? nextSeg.t
      : Infinity;
    rep = Math.ceil((repEnd - seg.ts) / seg.d) - 1;
  }

  return rep;
};

Timeline.prototype.checkRange = function(up) {
  var last = _.last(this.timeline);
  if (!last)
    return true;

  if (last.d < 0)
    last = { ts: last.ts, d: 0, r: last.r };

  return (up <= getTimelineBound(last));
};

Timeline.prototype.getSegmentIndex = function(ts) {
  var timeline = this.timeline;
  var low = 0;
  var high = timeline.length;

  while (low < high) {
    var mid = (low + high) >>> 1;
    if (timeline[mid].ts < ts) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return (low > 0)
    ? low - 1
    : low;
};

Timeline.prototype.getSegmentNumber = function(ts, up, duration) {
  var diff = up - ts;
  if (diff > 0)
    return Math.floor(diff / duration);
  else
    return 0;
};

Timeline.prototype.getSegments = function(up, to) {
  var timeline = this.index.timeline;
  var segments = [];

  var timelineLength = timeline.length;
  var timelineIndex = this.getSegmentIndex(up) - 1;
  // TODO(pierre): use @maxSegmentDuration if possible
  var maxDuration = (timeline.length && timeline[0].d) || 0;

  loop:
  for(;;) {
    if (++timelineIndex >= timelineLength)
      break;

    var segmentRange = timeline[timelineIndex];
    var { d, ts, range } = segmentRange;
    maxDuration = Math.max(maxDuration, d);

    // live-added segments have @d attribute equals to -1
    if (d < 0) {
      if (ts + maxDuration < to) {
        segments.push(this.createSegment(ts, range, undefined));
      }
      break;
    }

    var repeat = this.calculateRepeat(segmentRange, timeline[timelineIndex + 1]);
    var segmentNumber = this.getSegmentNumber(ts, up, d);
    var segmentTime;
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
};

Timeline.prototype.addSegment = function(newSegment, currentSegment) {
  var timeline = this.timeline;
  var timelineLength = timeline.length;
  var last = timeline[timelineLength - 1];

  // in some circumstances, the new segment informations are only
  // duration informations that we can use de deduct the ts of the
  // next segment. this is the case where the new segment are
  // associated to a current segment and have the same ts
  var shouldDeductNextSegment = !!currentSegment && (newSegment.ts === currentSegment.ts);
  if (shouldDeductNextSegment) {
    var newSegmentTs = newSegment.ts + newSegment.d;
    var lastSegmentTs = (last.ts + last.d * last.r);
    var tsDiff = newSegmentTs - lastSegmentTs;

    if (tsDiff <= 0)
      return false;

    // try to use the compact notation with @r attribute on the last
    // to elements of the timeline if we find out they have the same
    // duration
    if (last.d === -1) {
      var prev = timeline[timelineLength - 2];
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
};

module.exports = Timeline;
