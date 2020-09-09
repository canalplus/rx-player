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

import log from "../../log";
import objectValues from "../../utils/object_values";

export interface IProgressEventValue {
  duration : number; // current duration for the request, in ms
  id: string|number; // unique ID for the request
  size : number; // current downloaded size, in bytes
  timestamp : number; // timestamp of the progress event since unix epoch, in ms
  totalSize : number; // total size to download, in bytes
}

export interface IBeginRequestValue {
  id: string|number;
  time: number;
  duration: number;
  requestTimestamp: number;
}

export interface IRequestInfo {
  duration : number; // duration of the corresponding chunk, in seconds
  progress: IProgressEventValue[]; // progress events for this request
  requestTimestamp: number; // unix timestamp at which the request began, in ms
  time: number; // time at which the corresponding segment begins, in seconds
}

export interface IProgressEventValue {
  duration : number; // current duration for the request, in ms
  id: string|number; // unique ID for the request
  size : number; // current downloaded size, in bytes
  timestamp : number; // timestamp of the progress event since unix epoch, in ms
  totalSize : number; // total size to download, in bytes
}

/**
 * Store information about pending requests, like information about:
 *   - for which segments they are
 *   - how the request's progress goes
 * @class PendingRequestsStore
 */
export default class PendingRequestsStore {
  private _currentRequests: Partial<Record<string, IRequestInfo>>;

  constructor() {
    this._currentRequests = {};
  }

  /**
   * Add information about a new pending request.
   * @param {string} id
   * @param {Object} payload
   */
  public add(payload : IBeginRequestValue) : void {
    const { id, time, duration, requestTimestamp } = payload;
    this._currentRequests[id] = { time,
                                  duration,
                                  requestTimestamp,
                                  progress: [] };
  }

  /**
   * Notify of the progress of a currently pending request.
   * @param {Object} progress
   */
  public addProgress(progress : IProgressEventValue) : void {
    const request = this._currentRequests[progress.id];
    if (request == null) {
      if (__DEV__) {
        throw new Error("ABR: progress for a request not added");
      }
      log.warn("ABR: progress for a request not added");
      return;
    }
    request.progress.push(progress);
  }

  /**
   * Remove a request previously set as pending.
   * @param {string} id
   */
  public remove(id : string) : void {
    if (this._currentRequests[id] == null) {
      if (__DEV__) {
        throw new Error("ABR: can't remove unknown request");
      }
      log.warn("ABR: can't remove unknown request");
    }
    delete this._currentRequests[id];
  }

  /**
   * Returns information about all pending requests, in segment's chronological
   * order.
   * @returns {Array.<Object>}
   */
  public getRequests() : IRequestInfo[] {
    return objectValues(this._currentRequests)
      .filter((x) : x is IRequestInfo => x != null)
      .sort((reqA, reqB) => reqA.time - reqB.time);
  }
}
