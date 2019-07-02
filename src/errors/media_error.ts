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

import { ErrorTypes } from "./error_codes";
import errorMessage from "./error_message";

export type IMediaErrorCode = "BUFFER_APPEND_ERROR" |
                              "BUFFER_FULL_ERROR" |
                              "BUFFER_TYPE_UNKNOWN" |
                              "MANIFEST_INCOMPATIBLE_CODECS_ERROR" |
                              "MANIFEST_PARSE_ERROR" |
                              "MANIFEST_UNSUPPORTED_ADAPTATION_TYPE" |
                              "MEDIA_ERR_ABORTED" |
                              "MEDIA_ERR_BLOCKED_AUTOPLAY" |
                              "MEDIA_ERR_PLAY_NOT_ALLOWED" |
                              "MEDIA_ERR_NOT_LOADED_METADATA" |
                              "MEDIA_ERR_DECODE" |
                              "MEDIA_ERR_NETWORK" |
                              "MEDIA_ERR_SRC_NOT_SUPPORTED" |
                              "MEDIA_ERR_UNKNOWN" |
                              "MEDIA_KEYS_NOT_SUPPORTED" |
                              "MEDIA_SOURCE_NOT_SUPPORTED" |
                              "MEDIA_STARTING_TIME_NOT_FOUND" |
                              "MEDIA_TIME_BEFORE_MANIFEST" |
                              "MEDIA_TIME_AFTER_MANIFEST" |
                              "MEDIA_TIME_NOT_FOUND";

/**
 * Error linked to the media Playback.
 *
 * @class MediaError
 * @extends Error
 */
export default class MediaError extends Error {
  public readonly name : "MediaError";
  public readonly type : string;
  public readonly message : string;
  public readonly code : IMediaErrorCode;
  public fatal : boolean;

  /**
   * @param {string} code
   * @param {string} reason
   * @param {Boolean} fatal
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
