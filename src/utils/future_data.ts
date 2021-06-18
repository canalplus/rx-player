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

import assert from "./assert";

/**
 * Wrapper for data which may be obtained later.
 *
 * This class contains method to await for future data, check if data has been
 * set yet and to set that data.
 *
 * The reason behind creating this class was to obtain an easier to-grasp and to
 * use ReplaySubject (from the RxJS library) when an synchronous unique data is
 * needed, without needing a Promise overhead when it's not needed.
 *
 * @class FutureData
 */
export default class FutureData<T> {
  private _innerProm : {
    promise : Promise<T>;
    resolve : (arg : T) => void;
    reject : (e : Error) => void;
  };
  private _innerData : { data: T } | null;
  constructor() {
    this._innerData = null;
    let resolve : ((arg : T) => void) | undefined;
    let reject : ((e : Error) => void) | undefined;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // The previous callback should have been called synchronously
    assert(resolve !== undefined);
    assert(reject !== undefined);
    this._innerProm = { promise,
                        resolve,
                        reject };
  }

  public hasData() : boolean {
    return this._innerData !== null;
  }

  public unwrap() : T {
    if (this._innerData === null) {
      throw new Error("Unwrapping a not-yet set FutureData");
    }
    return this._innerData.data;
  }

  public awaitData() : Promise<T> {
    return this._innerProm.promise;
  }

  public setIfNone(data : T) : boolean {
    if (this._innerData !== null) {
      return false;
    }
    this._innerData = { data };
    this._innerProm.resolve(data);
    return true;
  }

  public dispose() : void {
    if (this._innerData !== null) {
      this._innerProm.reject(new Error("FutureData has been disposed"));
    }
  }
}

