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

/**
 * This class allows to easily calculate the first available position in a
 * live content at any time.
 *
 * That task can be an hard for live DASH contents: it depends on a
 * `timeShiftBufferDepth` defined in the MPD an on the maximum possible
 * position.
 *
 * The latter can come from either a clock synchronization mechanism or the
 * indexing schemes (e.g. SegmentTemplate, SegmentTimeline etc.) of the last
 * Periods.
 * As such, it might only be known once a large chunk of the MPD has already
 * been parsed.
 *
 * By centralizing the buffer depth calculation in this class and by giving an
 * instance of it to each parsed elements which might depend on it, we ensure
 * that we can provide it once it is known to every one of those elements
 * without needing to parse a second time the MPD.
 *
 * @example
 * ```js
 * const bufferDepthCalculator = new BufferDepthCalculator();
 *
 * // let's imagine a property `index` on a Representation which need to obtain
 * // the last position at any time
 * someRepresentation.index = new TemplateRepresentationIndex({
 *   // ...
 *   bufferDepthCalculator // for now, `getLastPosition` will return `undefined`
 * });
 *
 * // ...
 * // Let's imagine a function which try to guess the last position based on a
 * // given parsed period
 * const lastPosition = getLastPositionForPeriod(somePeriod);
 * if (lastPosition != null) {
 *   const lastPositionOffset = lastPosition - performance.now() / 1000;
 *   bufferDepthCalculator.setLastPositionOffset();
 *   // `getLastPosition` will now be correctly communicate the last position
 *   // (it returned `undefined` until then).
 * }
 * ```
 * @class BufferDepthCalculator
 */
export default class BufferDepthCalculator {
  private _timeShiftBufferDepth : number | null;
  private _availabilityStartTime : number;
  private _lastPositionOffset : number | undefined;

  constructor(args : { timeShiftBufferDepth? : number;
                       availabilityStartTime : number;
                       isDynamic : boolean; }
  ) {
    this._timeShiftBufferDepth = !args.isDynamic ||
                                 args.timeShiftBufferDepth == null ?
                                   null :
                                   args.timeShiftBufferDepth;
    this._availabilityStartTime = args.availabilityStartTime;
  }

  /**
   * Set the last position offset, which is the last position in seconds to
   * which is substracted the value of `performance.now()` at the time that
   * position was true converted into seconds.
   *
   * @example
   * Example if you trust `Date.now()` to give you a reliable offset:
   * ```js
   * const lastPositionOffset = (Date.now() - performance.now()) / 1000;
   * bufferDepthCalculator.setLastPositionOffset(lastPositionOffset);
   * ```
   *
   * @param {number} lastPositionOffset
   */
  setLastPositionOffset(lastPositionOffset : number) {
    this._lastPositionOffset = lastPositionOffset;
  }

  /**
   * Returns `true` if the last position offset has already been communicated at
   * least once. `false` otherwise.
   * @returns {boolean}
   */
  lastPositionIsKnown() : boolean {
    return this._lastPositionOffset != null;
  }

  /**
   * Calculate the current first available position by using both the calculated
   * last position offset and the timeshift buffer depth.
   * `undefined` if the last position offset has never been communicated.
   * @return {number|undefined}
   */
  getFirstAvailablePosition() : number | undefined {
    if (this._timeShiftBufferDepth == null) {
      return 0;
    }
    if (this._lastPositionOffset == null) {
      return undefined;
    }
    return Math.max(this._lastPositionOffset + (performance.now() / 1000) -
                      this._timeShiftBufferDepth - this._availabilityStartTime,
                    0);
  }
}
