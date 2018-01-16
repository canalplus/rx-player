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

import {
  ISegment,
  Representation,
} from "../manifest";

/**
 * Caching object used to cache initialization segments.
 * This allow to have a faster representation switch and faster seeking.
 */
class InitializationSegmentCache<T> {
  private _cache : WeakMap<Representation, T>;

  constructor() {
    this._cache = new WeakMap();
  }

  /**
   * @param {Object} obj
   * @param {Object} obj.representation
   * @param {Object} obj.segment
   * @param {*} response
   */
  public add(
    {
      representation,
      segment,
    } : {
      representation : Representation;
      segment : ISegment;
    },
    response : T
  ) : void {
    if (segment.isInit) {
      this._cache.set(representation, response);
    }
  }

  /**
   * @param {Object} obj
   * @param {Object} obj.segment
   * @returns {*} response
   * TODO just add segment directly, not in an object?
   */
  public get(
    {
      representation,
      segment,
    } : {
      representation : Representation;
      segment : ISegment;
    }
  ) {
    if (segment.isInit) {
      const value = this._cache.get(representation);
      if (value != null) {
        return value;
      }
    }
    return null;
  }
}

export default InitializationSegmentCache;
