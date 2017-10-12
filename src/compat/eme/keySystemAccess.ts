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

import { IMockMediaKeys } from "./MediaKeys";

/**
 * Simple implementation of the MediaKeySystemAccess EME API.
 *
 * All needed arguments are given to the constructor
 * @class CustomMediaKeySystemAccess
 */
export default class CustomMediaKeySystemAccess {
  constructor(
    private _keyType : string,
    private _mediaKeys : IMockMediaKeys|MediaKeys,
    private _configuration : MediaKeySystemConfiguration
  ) {}

  get keySystem() : string {
    return this._keyType;
  }

  public createMediaKeys() : Promise<IMockMediaKeys|MediaKeys> {
    return new Promise((res) => res(this._mediaKeys));
  }

  public getConfiguration() : MediaKeySystemConfiguration {
    return this._configuration;
  }
}
