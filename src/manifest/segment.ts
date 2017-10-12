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

interface ISegmentArguments {
  // -- required
  id : number|string;
  init : boolean;
  timescale : number;
  time : number|undefined;

  // - optional
  duration? : number;
  indexRange? : [number, number]|null;
  media? : string;
  number? : number;
  range? : [number, number]|null;
}

// TODO Both InitSegment and Segment
class Segment /* implements ISegment */ {
  public id : number|string;
  public duration : number|undefined;
  public isInit : boolean;
  public range : [number, number]|undefined;
  public time : number;
  public indexRange : [number, number]|undefined;
  public number : number|undefined;
  public timescale : number;
  public media : string;

  /**
   * @constructor
   * @param {Object} [args={}]
   * @param {string|Number} [args.id]
   * @param {Number} [args.duration]
   * @param {Boolean} [args.init=false]
   * @param {Number} [args.time]
   * @param {Array.<Number>} [args.range]
   * @param {Array.<Number>} [args.indexRange]
   * @param {Number} [args.number]
   * @param {Number} [args.timescale]
   * @param {string} [args.media]
   */
  constructor(args : ISegmentArguments) {
    if (__DEV__) {
      if (!args.init) {
        assert(args.time as number >= 0);
      }
      assert(args.id);
      assert(args.timescale);
      assert(args.media);
    }

    this.id = args.id;
    this.duration = args.duration;
    this.isInit = !!args.init;
    this.range = args.range || undefined;
    this.time = args.time || 0;
    this.indexRange = args.indexRange || undefined;
    this.number = args.number;
    this.timescale = args.timescale == null ? 1 : args.timescale;
    this.media = args.media || "";
  }
}

export default Segment;
