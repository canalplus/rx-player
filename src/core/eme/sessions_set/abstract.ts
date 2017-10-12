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

export default abstract class SessionSet<T> {
  protected _entries : T[];

  constructor() {
    this._entries = [];
  }

  find(func : (x : T) => boolean) : T|null {
    for (let i = 0; i < this._entries.length; i++) {
      if (func(this._entries[i]) === true) {
        return this._entries[i];
      }
    }
    return null;
  }
}
