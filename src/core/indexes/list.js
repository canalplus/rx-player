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

function List(index) {
  this.index = index;
}

List.getLiveEdge = function() {
  throw new Error("not implemented");
};

List.prototype.checkRange = function(up) {
  var { duration, list } = this.index;
  var i = Math.floor(up / duration);
  return (i >= 0 && i < list.length);
};

List.prototype.createSegment = function(segmentIndex, time) {
  var segment = this.index.list[segmentIndex];
  return {
    id: segmentIndex,
    media: segment.media,
    time: time,
    number: undefined,
    range: segment.range,
    duration: this.index.duration,
  };
};

List.prototype.getSegments = function(up, to) {
  // TODO(pierre): use startNumber
  var { duration, list } = this.index;
  var i = Math.floor(up / duration);
  var l = Math.floor(to / duration);
  var segments = [];
  while (i < l) {
    segments.push(this.createSegment(i, i * duration));
    i++;
  }
  return segments;
};

List.prototype.addSegment = function() {
  return false;
};

module.exports = List;
