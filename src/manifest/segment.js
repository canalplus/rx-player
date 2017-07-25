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

class Segment {
  /**
   * @constructor
   * @param {Object} [args={}]
   * @param {string|Number} [args.id]
   * @param {Number} [args.duration]
   * @param {Boolean} [args.init=false]
   * @param {Array.<Number>} [args.range]
   * @param {Number} [args.time]
   * @param {Array.<Number>} [args.indexRange]
   * @param {Number} [args.number]
   * @param {Number} [args.timescale]
   * @param {string} [args.media]
   */
  constructor(args = {}) {
    this.id = args.id;
    this.duration = args.duration;
    this.isInit = !!args.init;
    this.range = args.range;
    this.time = args.time;
    this.indexRange = args.indexRange;
    this.number = args.number;
    this.timescale = args.timescale == null ? 1 : args.timescale;
    this.media = args.media;
  }
}

export default Segment;
