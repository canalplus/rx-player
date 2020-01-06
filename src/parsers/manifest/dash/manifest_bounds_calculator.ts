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
 * This class allows to easily calculate the first and last available positions
 * in a content at any time.
 *
 * That task can be an hard for dynamic DASH contents: it depends on a
 * `timeShiftBufferDepth` defined in the MPD and on the maximum possible
 * position.
 *
 * The latter can come from either a clock synchronization mechanism or the
 * indexing schemes (e.g. SegmentTemplate, SegmentTimeline etc.) of the last
 * Periods.
 * As such, it might only be known once a large chunk of the MPD has already
 * been parsed.
 *
 * By centralizing the manifest bounds calculation in this class and by giving
 * an instance of it to each parsed elements which might depend on it, we
 * ensure that we can provide it once it is known to every one of those
 * elements without needing to parse a second time the MPD.
 *
 * @example
 * ```js
 * const manifestBoundsCalculator = new ManifestBoundsCalculator();
 *
 * // let's imagine a property `index` on a Representation which need to obtain
 * // the last position at any time
 * someRepresentation.index = new TemplateRepresentationIndex({
 *   // ...
 *   manifestBoundsCalculator // for now, `getLastPosition` will return `undefined`
 * });
 *
 * // ...
 * // Let's imagine a function which try to guess the last position based on a
 * // given parsed period
 * const lastPosition = getMaximumBound(somePeriod);
 * if (lastPosition != null) {
 *   const positionTime = performance.now() / 1000;
 *   manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
 *   // `getLastPosition` will now be correctly communicate the last position
 *   // (it returned `undefined` until then).
 * }
 * ```
 * @class ManifestBoundsCalculator
 */
export default class ManifestBoundsCalculator {
  private _timeShiftBufferDepth : number | null;
  private _positionTime : number | undefined;
  private _lastPosition : number | undefined;
  private _isDynamic : boolean;

  constructor(args : { timeShiftBufferDepth? : number;
                       isDynamic : boolean; }
  ) {
    this._isDynamic = args.isDynamic;
    this._timeShiftBufferDepth = !args.isDynamic ||
                                 args.timeShiftBufferDepth == null ?
                                   null :
                                   args.timeShiftBufferDepth;
  }

  /**
   * Set the last position and the position time (the value of `performance.now()`
   * at the time that position was true converted into seconds).
   *
   * @example
   * Example if you trust `Date.now()` to give you a reliable offset:
   * ```js
   * const lastPosition = Date.now();
   * const positionTime = performance.now() / 1000;
   * manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
   * ```
   *
   * @param {number} lastPositionOffset
   */
  setLastPosition(lastPosition : number, positionTime?: number) {
    this._lastPosition = lastPosition;
    this._positionTime = positionTime;
  }

  /**
   * Returns `true` if the last position and the position time
   * (for dynamic content only) have been comunicated.
   * `false` otherwise.
   * @returns {boolean}
   */
  lastPositionIsKnown() : boolean {
    if (this._isDynamic) {
      return this._positionTime != null && this._lastPosition != null;
    }
    return this._lastPosition != null;
  }

  /**
   * Get minimum bound of content.
   * @return {number|undefined}
   */
  getMinimumBound(): number | undefined {
    if (!this._isDynamic || this._timeShiftBufferDepth === null) {
      return 0;
    }
    const maximumBound = this.getMaximumBound();
    if (maximumBound === undefined) {
      return undefined;
    }
    const minimumBound = maximumBound - this._timeShiftBufferDepth;
    return minimumBound;
  }

  /**
   * Calculate the current maximum bound by using both the calculated
   * last position and the timeshift buffer depth.
   * `undefined` if the last position has never been communicated.
   * @return {number|undefined}
   */
  getMaximumBound() : number | undefined {
    if (this._isDynamic &&
        this._positionTime != null &&
        this._lastPosition != null
      ) {
      return Math.max((this._lastPosition - this._positionTime) +
                        (performance.now() / 1000),
                      0);
    }
    return this._lastPosition;
  }
}
