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

class List {
  constructor(adaptation, representation, index) {
    this.adaptation = adaptation;
    this.representation = representation;
    this.index = index;
  }

  static getLiveEdge() {
    throw new Error("not implemented");
  }

  checkDiscontinuity() {
    return -1;
  }

  checkRange(up) {
    const { duration, list } = this.index;
    const i = Math.floor(up / duration);
    return (i >= 0 && i < list.length);
  }

  createSegment(segmentIndex, time) {
    const {
      adaptation,
      representation,
    } = this;

    const {
      duration,
      list,
    } = this.index;

    const segment = list[segmentIndex];

    return Segment.create(
      adaptation,     /* adaptation */
      representation, /* representation */
      segmentIndex,   /* id */
      segment.media,  /* media */
      time,           /* time */
      duration,       /* duration */
      0,              /* number */
      segment.range,  /* range */
      null,           /* indexRange */
      false           /* init */
    );
  }

  getSegments(up, to) {
    // TODO(pierre): use startNumber
    const { duration, list } = this.index;
    const length = Math.min(list.length - 1, Math.floor(to / duration));
    const segments = [];
    let i = Math.floor(up / duration);
    while (i <= length) {
      segments.push(this.createSegment(i, i * duration));
      i++;
    }
    return segments;
  }

  addSegment() {
    return false;
  }
}

module.exports = List;
