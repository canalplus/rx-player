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

import Segment from "../manifest/segment";

/**
 * Caching object used to cache initialization segments.
 * This allow to have a faster representation switch and faster seeking.
 */
class InitializationSegmentCache<T> {
  private _cache : IDictionary<T>;

  constructor() {
    this._cache = {};
  }

  /**
   * @param {Object} obj
   * @param {Object} obj.segment
   * @param {*} response
   * TODO just add segment directly, not in an object?
   */
  public add({ segment } : { segment : Segment }, response : T) : void {
    if (segment.isInit) {
      this._cache[segment.id] = response;
    }
  }

  /**
   * @param {Object} obj
   * @param {Object} obj.segment
   * @returns {*} response
   * TODO just add segment directly, not in an object?
   */
  public get({ segment } : { segment : Segment }) : T|null {
    if (segment.isInit) {
      const value = this._cache[segment.id];
      if (value != null) {
        return value;
      }
    }
    return null;
  }
}

export default InitializationSegmentCache;
