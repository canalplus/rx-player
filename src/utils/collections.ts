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
 * Simple hash-based set.
 * @class SimpleSet
 */
class SimpleSet {
  private _hash : IDictionary<true>;

  constructor() {
    this._hash = {};
  }

  public add(x : string|number) : void {
    this._hash[x] = true;
  }

  public remove(x : string|number) : void {
    delete this._hash[x];
  }

  public test(x : string|number) : boolean {
    return !!this._hash[x];
  }

  public isEmpty() : boolean {
    return !Object.keys(this._hash).length;
  }
}

// TODO export default
export { SimpleSet };
