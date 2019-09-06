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
 * This class allows to easily calculate the live edge of a live content at any
 * time.
 *
 * That task can be an hard for live DASH contents: it depends from either a
 * synchronization mechanism or, if none were provided, on the segment
 * indexing schemes (e.g. SegmentTemplate, SegmentTimeline etc.) of the last
 * Periods.
 * As such, it might only be known once a large chunk of the MPD has already
 * been parsed.
 *
 * By centralizing the live edge calculation in this class and by giving an
 * instance of it to each parsed elements which might depend on that live edge,
 * we ensure that we can provide it once it is known to every one of those
 * elements without needing to parse a second time the MPD.
 *
 * @example
 * ```js
 * const liveEdgeCalculator = new LiveEdgeCalculator();
 *
 * // let's imagine a property `index` on a Representation which need to obtain
 * // the live edge at any time
 * someRepresentation.index = new TemplateRepresentationIndex({
 *   // ...
 *   liveEdgeCalculator // for now, `getCurrentLiveEdge` will return `undefined`
 * });
 *
 * // ...
 * // Let's imagine a function which try to guess the live edge based on a given
 * // parsed period
 * const liveEdge = getLiveEdge(somePeriod);
 * if (liveEdge != null) {
 *   liveEdgeCalculator.setLiveEdgeOffset(liveEdge - performance.now() / 1000);
 *   // `getCurrentLiveEdge` will now be correctly communicate the new live edge
 *   // (it returned `undefined` until then).
 * }
 * ```
 * @class LiveEdgeCalculator
 */
export default class LiveEdgeCalculator {
  private _liveEdgeOffset : number | undefined;

  /**
   * Set the live Edge offset, which is the live edge in seconds to which is
   * substracted the value of `performance.now()` at the time that live edge
   * time was true converted into seconds.
   *
   * @example
   * Example if you trust `Date.now() to give you a reliable offset:
   * ```js
   * const liveEdgeOffset = (Date.now() - performance.now()) / 1000;
   * liveEdgeCalculator.setLiveEdgeOffset(liveEdgeOffset);
   * ```
   *
   * @param {number} liveEdgeOffset
   */
  setLiveEdgeOffset(liveEdgeOffset : number) {
    this._liveEdgeOffset = liveEdgeOffset;
  }

  /**
   * Returns `true` if the live edge has already been communicated at least once.
   * `false` otherwise.
   * @returns {boolean}
   */
  knowCurrentLiveEdge() : boolean {
    return this._liveEdgeOffset != null;
  }

  /**
   * Calculate the new live edge.
   * `undefined` if it has never been communicated.
   * @return {number|undefined}
   */
  getCurrentLiveEdge() : number | undefined {
    return this._liveEdgeOffset == null ? undefined :
                                          this._liveEdgeOffset +
                                            (performance.now() / 1000);
  }
}
