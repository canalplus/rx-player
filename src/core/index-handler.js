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
var assert = require("canal-js-utils/assert");

var Template = require("./indexes/template");
var Timeline = require("./indexes/timeline");
var List = require("./indexes/list");
var Base = require("./indexes/base");

function OutOfIndexError(type) {
  this.name = "OutOfIndexError";
  this.type = type;
  this.message = "out of range in index " + type;
}
OutOfIndexError.prototype = new Error();

function selectIndexHandler(index) {
  switch(index.indexType) {
  case "template": return Template;
  case "timeline": return Timeline;
  case "list":     return List;
  case "base":     return Base;
  default:
    throw new Error(`index-handler: unrecognized indexType ${index.indexType}`);
  }
}

function getLiveEdge(manifest) {
  // TODO(pierre): improve index access ?
  var videoIndex = manifest.adaptations.video[0].representations[0].index;
  return selectIndexHandler(videoIndex).getLiveEdge(videoIndex, manifest);
}

function IndexHandler(adaptation, representation) {
  this.adaptation = adaptation;
  this.representation = representation;
  this.index = representation.index;
  this.handler = new (selectIndexHandler(this.index))(this.index);
}

IndexHandler.prototype.getInitSegment = function() {
  var initialization = this.index.initialization || {};
  return {
    id: "init_" + this.adaptation.id + "_" + this.representation.id,
    init: true,
    media: initialization.media,
    range: initialization.range,
    indexRange: this.index.indexRange
  };
};

IndexHandler.prototype.normalizeRange = function(ts, offset, bufSize) {
  var presentationOffset = this.index.presentationTimeOffset || 0;
  var timescale = this.index.timescale || 1;

  if (!offset)  offset  = 0;
  if (!bufSize) bufSize = 0;

  offset = Math.min(offset, bufSize);

  return {
    time: ts * timescale - presentationOffset,
    up: (ts + offset)  * timescale - presentationOffset,
    to: (ts + bufSize) * timescale - presentationOffset,
  };
};

IndexHandler.prototype.getSegments = function(ts, offset, bufSize) {
  var { time, up, to } = this.normalizeRange(ts, offset, bufSize);
  if (!this.handler.checkRange(time)) {
    throw new OutOfIndexError(this.index.indexType);
  }

  return this.handler.getSegments(up, to);
};

IndexHandler.prototype.insertNewSegments = function(nextSegments, currentSegment) {
  var addedSegments = [];
  for (var i = 0; i < nextSegments.length; i++) {
    if (this.handler.addSegment(nextSegments[i], currentSegment)) {
      addedSegments.push(nextSegments[i]);
    }
  }
  return addedSegments;
};

IndexHandler.prototype.setTimescale = function(timescale) {
  var { index } = this;

  if (__DEV__) {
    assert(typeof timescale == "number");
    assert(timescale > 0);
  }

  if (index.timescale !== timescale) {
    index.timescale = timescale;
    return true;
  }

  return false;
};

IndexHandler.prototype.scale = function(time) {
  if (__DEV__) {
    assert(this.index.timescale > 0);
  }

  return time / this.index.timescale;
};

module.exports = {
  OutOfIndexError,
  IndexHandler,
  getLiveEdge,
};
