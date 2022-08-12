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
  ErrorTypes,
  IMediaErrorCode,
} from "./error_codes";
import errorMessage from "./error_message";

/**
 * Error linked to the media Playback.
 *
 * @class MediaError
 * @extends Error
 */
export default class MediaError extends Error {
  public readonly name : "MediaError";
  public readonly type : "MEDIA_ERROR";
  public readonly message : string;
  public readonly code : IMediaErrorCode;
  public fatal : boolean;

  /**
   * @param {string} code
   * @param {string} reason
   */
  constructor(code : IMediaErrorCode, reason : string) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, MediaError.prototype);

    this.name = "MediaError";
    this.type = ErrorTypes.MEDIA_ERROR;

    this.code = code;
    this.message = errorMessage(this.name, this.code, reason);
    this.fatal = false;
  }
}
