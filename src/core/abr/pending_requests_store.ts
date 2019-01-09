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
import { IBufferType } from "../source_buffers";

export interface IProgressEventValue {
  duration : number; // current duration for the request, in ms
  id: string|number; // unique ID for the request
  size : number; // current downloaded size, in bytes
  timestamp : number; // timestamp of the progress event since unix epoch, in ms
  totalSize : number; // total size to download, in bytes
}

export interface IProgressRequest {
  type: IBufferType;
  event: "progress";
  value: IProgressEventValue;
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

export interface IBeginRequest {
  type: IBufferType;
  event: "requestBegin";
  value: {
    id: string|number;
    time: number;
    duration: number;
    requestTimestamp: number;
  };
}

export interface IProgressRequest {
  type: IBufferType;
  event: "progress";
  value: IProgressEventValue;
}

/**
 * Store informations about pending requests, like informations about:
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
   * Add informations about a new pending request.
   * @param {string} id
   * @param {Object} payload
   */
  public add(id : string, payload: IBeginRequest) : void {
    if (this._currentRequests[id]) {
      if (__DEV__) {
        throw new Error("ABR: request already added.");
      }
      log.warn("ABR: request already added.");
      return;
    }
    const { time, duration, requestTimestamp } = payload.value;
    this._currentRequests[id] = {
      time,
      duration,
      requestTimestamp,
      progress: [],
    };
  }

  /**
   * Notify of the progress of a currently pending request.
   * @param {string} id
   * @param {Object} progress
   */
  public addProgress(id : string, progress : IProgressRequest) : void {
    const request = this._currentRequests[id];
    if (!request) {
      if (__DEV__) {
        throw new Error("ABR: progress for a request not added");
      }
      log.warn("ABR: progress for a request not added");
      return;
    }
    request.progress.push(progress.value);
  }

  /**
   * Remove a request previously set as pending.
   * @param {string} id
   */
  public remove(id : string) : void {
    if (!this._currentRequests[id]) {
      if (__DEV__) {
        throw new Error("ABR: can't remove unknown request");
      }
      log.warn("ABR: can't remove unknown request");
    }
    delete this._currentRequests[id];
  }

  /**
   *
   */
  public getRequests() : IRequestInfo[] {
    return objectValues(this._currentRequests)
      .filter((x) : x is IRequestInfo => x != null);
  }
}
