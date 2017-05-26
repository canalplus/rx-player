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

import assert from "../utils/assert";

import { getAdaptationsByType } from "./manifest";
import { InitSegment } from "./segment";
import Template from "./indexes/template";
import Timeline from "./indexes/timeline";
import List from "./indexes/list";
import Base from "./indexes/base";
import Smooth from "./indexes/smooth";

import { IndexError } from "../errors";

/**
 * Returns right indexHandler for the given index
 * @param {Object} index
 * @returns {List|Template|Base|Timeline}
 * @throws IndexError - The indexType is not known
 */
function selectIndexHandler(index) {
  const { indexType } = index;
  switch(indexType) {
  case "template": return Template;
  case "timeline": return Timeline;
  case "list":     return List;
  case "base":     return Base;
  case "smooth":   return Smooth;
  default:
    throw new IndexError("UNKNOWN_INDEX", indexType, true);
  }
}

/**
 * Recuperate liveEdge for the manifest's first video representation.
 * @param {Object} manifest
 * @returns {Number}
 * @throws IndexError - The video indexType (contained in the manifest) is not
 * known.
 */
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

    // TODO always access index through this.representation
    this.index = representation.index;
    this.handler = new (selectIndexHandler(this.index))(adaptation,
                                                        representation,
                                                        this.index);
  }

  /**
   * Construct and returns the InitSegment.
   * @returns {InitSegment}
   */
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

  /**
   * Returns ranges needed (current time, lower bound and upper bound needed)
   * in the right timescale and with the presentationTimeOffset taken into
   * account.
   * @param {Number} ts - current timestamp
   * @param {Number} offset - offset from the current timestamp we need
   * @param {Number} bufSize - buffer size we need
   * @returns {Object} - Object with time (current time), up (lower bound)
   * and to (upper bounds) properties, all in the right timescale.
   */
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

  /**
   * Returns an array of segment needed to fulfill what is asked in terms of
   * range.
   * @param {Number} ts - current timestamp
   * @param {Number} offset - offset from the current timestamp we need
   * @param {Number} bufSize - buffer size we need
   * @returns {Array.<Segment>}
   * @throws IndexError - Throws if the current timestamp is considered out
   * of bounds.
   */
  getSegments(ts, offset, bufSize) {
    const { time, up, to } = this.normalizeRange(ts, offset, bufSize);
    if (!this.handler.checkRange(time, up, to)) {
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

  /**
   * Update the timescale used (for all segments).
   * TODO This should probably update all previous segments to the newly set
   * Timescale.
   * @param {Number} timescale
   * @returns {Boolean} - Returns true if the timescale has been updated.
   */
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

  /**
   * Returns time given scaled into seconds.
   * @param {Number} time
   * @returns {Number}
   */
  scale(time) {
    if (__DEV__) {
      assert(this.index.timescale > 0);
    }

    return time / this.index.timescale;
  }
}

export {
  IndexHandler,
  getLiveEdge,
};
