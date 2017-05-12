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

class Template {
  constructor(adaptation, representation, index) {
    this.adaptation = adaptation;
    this.representation = representation;
    this.index = index;
  }

  static getLiveEdge(videoIndex, manifest) {
    return (Date.now() / 1000 - manifest.availabilityStartTime) - manifest.suggestedPresentationDelay;
  }

  checkDiscontinuity() {
    return -1;
  }

  checkRange() {
    return true;
  }

  createSegment(ts) {
    const {
      adaptation,
      representation,
    } = this;

    const {
      startNumber,
      duration,
    } = this.index;

    const number = Math.floor(ts / duration) + (startNumber == null ? 1 : startNumber);
    const time = number * duration;

    return Segment.create(
      adaptation,          /* adaptation */
      representation,      /* representation */
      number,              /* id */
      this.index.media,    /* media */
      time,                /* time */
      this.index.duration, /* duration */
      number,              /* number */
      null,                /* range */
      null,                /* indexRange */
      false                /* init */
    );
  }

  getSegments(up, to) {
    const { duration } = this.index;

    const segments = [];
    for (let time = up; time <= to; time += duration) {
      segments.push(this.createSegment(time));
    }

    return segments;
  }

  addSegment() {
    return false;
  }
}

module.exports = Template;
