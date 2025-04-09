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

import type { IEncryptedMediaErrorKeyStatusObject } from "../public_types";
import type { IEncryptedMediaErrorCode } from "./error_codes";
import { ErrorTypes } from "./error_codes";
import errorMessage from "./error_message";

/**
 * Error linked to the encryption of the media.
 *
 * @class EncryptedMediaError
 * @extends Error
 */
export default class EncryptedMediaError extends Error {
  public readonly name: "EncryptedMediaError";
  public readonly type: "ENCRYPTED_MEDIA_ERROR";
  public readonly code: IEncryptedMediaErrorCode;
  public readonly keyStatuses: IEncryptedMediaErrorKeyStatusObject[] | undefined;
  public readonly keySystemConfiguration: MediaKeySystemConfiguration | undefined;
  public readonly keySystem: string | undefined;
  public fatal: boolean;
  private _originalMessage: string;

  /**
   * @param {string} code
   * @param {string} reason
   */
  constructor(
    code: "KEY_STATUS_CHANGE_ERROR",
    reason: string,
    supplementaryInfos: {
      keyStatuses: IEncryptedMediaErrorKeyStatusObject[];
      keySystemConfiguration: MediaKeySystemConfiguration;
      keySystem: string;
    },
  );
  constructor(
    code: Omit<
      IEncryptedMediaErrorCode,
      | "KEY_STATUS_CHANGE_ERROR"
      | "INCOMPATIBLE_KEYSYSTEMS"
      | "INVALID_KEY_SYSTEM"
      | "MEDIA_IS_ENCRYPTED_ERROR"
    >,
    reason: string,
    supplementaryInfos: {
      keyStatuses: undefined;
      keySystemConfiguration: MediaKeySystemConfiguration;
      keySystem: string;
    },
  );
  constructor(
    code: "INCOMPATIBLE_KEYSYSTEMS" | "INVALID_KEY_SYSTEM" | "MEDIA_IS_ENCRYPTED_ERROR",
    reason: string,
    supplementaryInfos: {
      keyStatuses: undefined;
      keySystemConfiguration: undefined;
      keySystem: undefined;
    },
  );
  constructor(
    code: IEncryptedMediaErrorCode,
    reason: string,
    supplementaryInfos: {
      keyStatuses: IEncryptedMediaErrorKeyStatusObject[] | undefined;
      keySystemConfiguration: MediaKeySystemConfiguration | undefined;
      keySystem: string | undefined;
    },
  ) {
    super(errorMessage(code, reason));
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, EncryptedMediaError.prototype);

    this.name = "EncryptedMediaError";
    this.type = ErrorTypes.ENCRYPTED_MEDIA_ERROR;

    this.code = code;
    this._originalMessage = reason;
    this.fatal = false;

    this.keyStatuses = supplementaryInfos.keyStatuses;
    this.keySystemConfiguration = supplementaryInfos.keySystemConfiguration;
    this.keySystem = supplementaryInfos.keySystem;
  }

  /**
   * If that error has to be communicated through another thread, this method
   * allows to obtain its main defining properties in an Object so the Error can
   * be reconstructed in the other thread.
   * @returns {Object}
   */
  public serialize(): ISerializedEncryptedMediaError {
    return {
      name: this.name,
      code: this.code,
      reason: this._originalMessage,
      keyStatuses: this.keyStatuses,
      keySystemConfiguration: this.keySystemConfiguration,
      keySystem: this.keySystem,
    };
  }
}

export interface ISerializedEncryptedMediaError {
  name: "EncryptedMediaError";
  code: IEncryptedMediaErrorCode;
  reason: string;
  keyStatuses:
    | Array<{
        keyStatus: MediaKeyStatus;
        keyId: ArrayBuffer;
      }>
    | undefined;
  keySystemConfiguration: MediaKeySystemConfiguration | undefined;
  keySystem: string | undefined;
}
