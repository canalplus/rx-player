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
 * @class ManifestBoundsCalculator
 */
export default class ManifestBoundsCalculator {
  /** Value of MPD@timeShiftBufferDepth. */
  private _timeShiftBufferDepth : number | null;
  /** Value of `performance.now` at the time `lastPosition` was calculated. */
  private _positionTime : number | undefined;
  /** Last position calculated at a given moment (itself indicated by `_positionTime`. */
  private _lastPosition : number | undefined;
  /** `true` if MPD@type is equal to "dynamic". */
  private _isDynamic : boolean;

  /**
   * @param {Object} args
   */
  constructor(args : { timeShiftBufferDepth? : number;
                       isDynamic : boolean; }
  ) {
    this._isDynamic = args.isDynamic;
    this._timeShiftBufferDepth = !args.isDynamic ||
                                 args.timeShiftBufferDepth === undefined ?
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
   * @param {number} lastPosition
   * @param {number|undefined} positionTime
   */
  setLastPosition(lastPosition : number, positionTime?: number) : void {
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
   * Estimate a minimum bound for the content from the last set segment time
   * and buffer depth.
   * Consider that it is only an estimation, not the real value.
   * @return {number|undefined}
   */
  estimateMinimumBound(): number | undefined {
    if (!this._isDynamic || this._timeShiftBufferDepth === null) {
      return 0;
    }
    const maximumBound = this.estimateMaximumBound();
    if (maximumBound === undefined) {
      return undefined;
    }
    const minimumBound = maximumBound - this._timeShiftBufferDepth;
    return minimumBound;
  }

  /**
   * Estimate a maximum bound for the content from the last set segment time.
   * Consider that it is only an estimation, not the real value.
   * @return {number|undefined}
   */
  estimateMaximumBound() : number | undefined {
    if (this._isDynamic &&
        this._positionTime != null &&
        this._lastPosition != null)
    {
      return Math.max((this._lastPosition - this._positionTime) +
                        (performance.now() / 1000),
                      0);
    }
    return this._lastPosition;
  }
}
