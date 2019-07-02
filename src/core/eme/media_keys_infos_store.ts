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
  ICompatMediaKeySystemAccess,
  ICustomMediaKeys,
  ICustomMediaKeySystemAccess,
} from "../../compat";
import { IKeySystemOption } from "./types";
import SessionsStore from "./utils/open_sessions_store";

export type IMediaElementMediaKeysInfos =
  { keySystemOptions : IKeySystemOption;

    mediaKeySystemAccess : ICustomMediaKeySystemAccess |
                           ICompatMediaKeySystemAccess;

    mediaKeys : MediaKeys |
                ICustomMediaKeys;

    sessionsStore : SessionsStore;
  } |
  null;

/**
 * Store the MediaKeys infos attached to a media element.
 * @class MediaKeysInfosStore
 */
export default class MediaKeysInfosStore {
  private _state : WeakMap<HTMLMediaElement, IMediaElementMediaKeysInfos>;

  constructor() {
    this._state = new WeakMap();
  }

  setState(
    mediaElement : HTMLMediaElement,
    state : IMediaElementMediaKeysInfos
  ) : void {
    this._state.set(mediaElement, state);
  }

  getState(mediaElement : HTMLMediaElement) : IMediaElementMediaKeysInfos {
    return this._state.get(mediaElement) || null;
  }

  clearState(mediaElement : HTMLMediaElement) : void {
    this._state.set(mediaElement, null);
  }
}

const defaultMediaKeysInfosStore = new MediaKeysInfosStore();

export { defaultMediaKeysInfosStore };
