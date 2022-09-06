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
  IEncryptedMediaErrorCode,
} from "./error_codes";
import errorMessage from "./error_message";

/**
 * Error linked to the encryption of the media.
 *
 * @class EncryptedMediaError
 * @extends Error
 */
export default class EncryptedMediaError extends Error {
  public readonly name : "EncryptedMediaError";
  public readonly type : "ENCRYPTED_MEDIA_ERROR";
  public readonly code : IEncryptedMediaErrorCode;
  public readonly keyStatus? : MediaKeyStatus;
  public message : string;
  public fatal : boolean;

  /**
   * @param {string} code
   * @param {string} reason
   */
  constructor(
    code : "KEY_STATUS_CHANGE_ERROR",
    reason : string,
    supplementaryInfos : { keyStatus : MediaKeyStatus }
  );
  constructor(
    code : Omit<IEncryptedMediaErrorCode, "KEY_STATUS_CHANGE_ERROR">,
    reason : string
  );
  constructor(
    code : IEncryptedMediaErrorCode,
    reason : string,
    supplementaryInfos? : { keyStatus? : MediaKeyStatus }
  ) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, EncryptedMediaError.prototype);

    this.name = "EncryptedMediaError";
    this.type = ErrorTypes.ENCRYPTED_MEDIA_ERROR;

    this.code = code;
    this.message = errorMessage(this.name, this.code, reason);
    this.fatal = false;

    if (typeof supplementaryInfos?.keyStatus === "string") {
      this.keyStatus = supplementaryInfos.keyStatus;
    }
  }
}
