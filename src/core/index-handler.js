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

const assert = require("../utils/assert");

const { getAdaptationsByType } = require("./manifest");
const { InitSegment } = require("./segment");
const Template = require("./indexes/template");
const Timeline = require("./indexes/timeline");
const List = require("./indexes/list");
const Base = require("./indexes/base");

const { IndexError } = require("../errors");

function selectIndexHandler(index) {
  const { indexType } = index;
  switch(indexType) {
  case "template": return Template;
  case "timeline": return Timeline;
  case "list":     return List;
  case "base":     return Base;
  default:
    throw new IndexError("UNKNOWN_INDEX", indexType, true);
  }
}

function getLiveEdge(manifest) {
  // TODO(pierre): improve index access ?
  const videoAda = getAdaptationsByType(manifest, "video");
  const videoIdx = videoAda[0].representations[0].index;
  return selectIndexHandler(videoIdx).getLiveEdge(videoIdx, manifest);
}

class IndexHandler {
  constructor(adaptation, representation) {
    this.adaptation = adaptation;
    this.representation = representation;
    this.index = representation.index;
    this.handler = new (selectIndexHandler(this.index))(adaptation,
                                                        representation,
                                                        this.index);
  }

  getInitSegment() {
    const initialization = this.index.initialization || {};
    return new InitSegment(
      this.adaptation,
      this.representation,
      initialization.media,
      initialization.range,
      this.index.indexRange
    );
  }

  normalizeRange(ts, offset, bufSize) {
    const presentationOffset = this.index.presentationTimeOffset || 0;
    const timescale = this.index.timescale || 1;

    if (!offset) {
      offset  = 0;
    }
    if (!bufSize) {
      bufSize = 0;
    }

    offset = Math.min(offset, bufSize);

    return {
      time: ts * timescale - presentationOffset,
      up: (ts + offset)  * timescale - presentationOffset,
      to: (ts + bufSize) * timescale - presentationOffset,
    };
  }

  checkDiscontinuity(time) {
    if (!this.adaptation.isLive) {
      return null;
    }
    const timescale = this.index.timescale || 1;
    const ts = this.handler.checkDiscontinuity(time * timescale);
    if (ts > 0) {
      return { ts: ts / timescale + 1 };
    }
    return null;
  }

  getSegments(ts, offset, bufSize) {
    const { time, up, to } = this.normalizeRange(ts, offset, bufSize);
    if (!this.handler.checkRange(time)) {
      throw new IndexError("OUT_OF_INDEX_ERROR", this.index.indexType, false);
    }

    return this.handler.getSegments(up, to);
  }

  insertNewSegments(nextSegments, currentSegment) {
    const addedSegments = [];
    for (let i = 0; i < nextSegments.length; i++) {
      if (this.handler.addSegment(nextSegments[i], currentSegment)) {
        addedSegments.push(nextSegments[i]);
      }
    }
    return addedSegments;
  }

  setTimescale(timescale) {
    const { index } = this;

    if (__DEV__) {
      assert(typeof timescale == "number");
      assert(timescale > 0);
    }

    if (index.timescale !== timescale) {
      index.timescale = timescale;
      return true;
    }

    return false;
  }

  scale(time) {
    if (__DEV__) {
      assert(this.index.timescale > 0);
    }

    return time / this.index.timescale;
  }
}

module.exports = {
  IndexHandler,
  getLiveEdge,
};
