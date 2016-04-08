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

const { resolveURL } = require("../utils/url");

function isNumber(val) {
  return (typeof val == "number" && !isNaN(val)) || !isNaN(+val) ? true : false;
}

class Segment {
  static create(adaptation,
                representation,
                id,
                media,
                time,
                duration,
                number,
                range,
                indexRange,
                init) {

    const segId = `${adaptation.id}_${representation.id}_${id}`;
    const segment = new Segment(adaptation,
                                representation,
                                segId,
                                media,
                                time,
                                duration,
                                number,
                                range,
                                indexRange,
                                init);
    return segment;
  }

  constructor(adaptation,
              representation,
              id,
              media,
              time,
              duration,
              number,
              range,
              indexRange,
              init) {
    this.id = id;
    this.ada = adaptation;
    this.rep = representation;
    this.time = isNumber(time) ? +time : -1;
    this.duration = isNumber(duration) ? +duration : -1;
    this.number = isNumber(number) ? +number : -1;
    this.media = media ? ""+media : "";
    this.range = Array.isArray(range) ? range : null;
    this.indexRange = Array.isArray(indexRange) ? indexRange : null;
    this.init = !!init;
  }

  getId() {
    return this.id;
  }

  getAdaptation() {
    return this.ada;
  }

  getRepresentation() {
    return this.rep;
  }

  getTime() {
    return this.time;
  }

  getDuration() {
    return this.duration;
  }

  getNumber() {
    return this.number;
  }

  getMedia() {
    return this.media;
  }

  getRange() {
    return this.range;
  }

  getIndexRange() {
    return this.indexRange;
  }

  isInitSegment() {
    return this.init;
  }

  getResolvedURL() {
    return resolveURL(
      this.ada.rootURL,
      this.ada.baseURL,
      this.rep.baseURL
    );
  }
}

class InitSegment extends Segment {
  constructor(adaptation,
              representation,
              media,
              range,
              indexRange) {

    super(
      adaptation,
      representation,
      `${adaptation.id}_${representation.id}_init`,
                  /* id */
      media,      /* media */
      -1,         /* time */
      -1,         /* duration */
      -1,         /* number */
      range,      /* range */
      indexRange, /* indexRange */
      true        /* init */
    );
  }
}

module.exports = {
  Segment,
  InitSegment,
};
