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

export type IEncryptedMediaErrorCode = "INCOMPATIBLE_KEYSYSTEMS" |
                                       "INVALID_ENCRYPTED_EVENT" |
                                       "INVALID_KEY_SYSTEM" |
                                       "KEY_ERROR" |
                                       "KEY_GENERATE_REQUEST_ERROR" |
                                       "KEY_LOAD_ERROR" |
                                       "KEY_LOAD_TIMEOUT" |
                                       "KEY_STATUS_CHANGE_ERROR" |
                                       "KEY_UPDATE_ERROR" |
                                       "LICENSE_SERVER_CERTIFICATE_ERROR" |
                                       "MEDIA_IS_ENCRYPTED_ERROR" |
                                       "MULTIPLE_SESSIONS_SAME_INIT_DATA";

/**
 * Error linked to the encryption of the media.
 *
 * @class EncryptedMediaError
 * @extends Error
 */
export default class EncryptedMediaError extends Error {
  public readonly name : "EncryptedMediaError";
  public readonly type : string;
  public readonly message : string;
  public readonly code : IEncryptedMediaErrorCode;
  public fatal : boolean;

  /**
   * @param {string} code
   * @param {string} reason
   * @Param {Boolean} fatal
   */
  constructor(code : IEncryptedMediaErrorCode, reason : string) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, EncryptedMediaError.prototype);

    this.name = "EncryptedMediaError";
    this.type = ErrorTypes.ENCRYPTED_MEDIA_ERROR;

    this.code = code;
    this.message = errorMessage(this.name, this.code, reason);
    this.fatal = false;
  }
}
