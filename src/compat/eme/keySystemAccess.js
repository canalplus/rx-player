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

import { Observable } from "rxjs/Observable";

// @implement interface MediaKeySystemAccess
export default class KeySystemAccess {
  constructor(keyType, mediaKeys, mediaKeySystemConfiguration) {
    this._keyType = keyType;
    this._mediaKeys = mediaKeys;
    this._configuration = mediaKeySystemConfiguration;
  }
  get keySystem() {
    return this._keyType;
  }
  createMediaKeys() {
    return Observable.of(this._mediaKeys);
  }
  getConfiguration() {
    return this._configuration;
  }
}

