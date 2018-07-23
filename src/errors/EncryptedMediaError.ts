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
  ErrorCodes,
  ErrorTypes,
} from "./constants";

import errorMessage from "./errorMessage";

type IEncryptedMediaErrorReason =
  Error|Event|string|null;

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
  public readonly code : string;
  public readonly reason? : IEncryptedMediaErrorReason;
  public fatal : boolean;

  constructor(
    code : string,
    reason? : IEncryptedMediaErrorReason,
    fatal? : boolean
  ) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, EncryptedMediaError.prototype);

    this.name = "EncryptedMediaError";
    this.type = ErrorTypes.ENCRYPTED_MEDIA_ERROR;

    this.reason = reason;
    this.code = ErrorCodes.hasOwnProperty(code) ?
      (ErrorCodes as Record<string, string>)[code] : "";
    this.fatal = !!fatal;
    this.message = errorMessage(this.name, this.code, this.reason);
  }
}
