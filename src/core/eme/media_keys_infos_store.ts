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
  IMediaKeySystemAccess,
  IMockMediaKeys,
} from "../../compat";
import { IKeySystemOption } from "./types";
import SessionsStore from "./utils/open_sessions_store";

export type ICurrentMediaKeysInfos = {
  mediaElement : HTMLMediaElement;
  keySystemOptions : IKeySystemOption;
  mediaKeySystemAccess : IMediaKeySystemAccess;
  mediaKeys : MediaKeys|IMockMediaKeys;
  sessionsStore : SessionsStore;
}|null;

/**
 * Store the MediaKeys infos attached to a media element.
 * TODO This is obviously a hack find better solution
 * @class MediaKeysInfosStore
 */
export default class MediaKeysInfosStore {
  private _state : ICurrentMediaKeysInfos;
  constructor() {
    this._state = null;
  }

  setState(state : ICurrentMediaKeysInfos) {
    this._state = state;
  }

  getState() : ICurrentMediaKeysInfos {
    return this._state;
  }

  clearState() {
    this._state = null;
  }
}
