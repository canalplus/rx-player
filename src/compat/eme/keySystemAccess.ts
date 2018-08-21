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

export interface IMediaKeySystemAccess {
  readonly keySystem : string;
  getConfiguration() : MediaKeySystemConfiguration;
  createMediaKeys() : Promise<MediaKeys|IMockMediaKeys>;
}

/**
 * Simple implementation of the MediaKeySystemAccess EME API.
 *
 * All needed arguments are given to the constructor
 * @class CustomMediaKeySystemAccess
 */
export default class CustomMediaKeySystemAccess implements IMediaKeySystemAccess {
  /**
   * @param {string} _keyType
   * @param {Object} _mediaKeys
   * @param {Object} _configuration
   */
  constructor(
    private readonly _keyType : string,
    private readonly _mediaKeys : IMockMediaKeys|MediaKeys,
    private readonly _configuration : MediaKeySystemConfiguration
  ) {}

  /**
   * @returns {string}
   */
  get keySystem() : string {
    return this._keyType;
  }

  /**
   * @returns {Promise}
   */
  public createMediaKeys() : Promise<IMockMediaKeys|MediaKeys> {
    return new Promise((res) => res(this._mediaKeys));
  }

  /**
   * @returns {Object}
   */
  public getConfiguration() : MediaKeySystemConfiguration {
    return this._configuration;
  }
}
