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

import type { RequestError, ISerializedRequestError } from "../utils/request";
import type { INetworkErrorCode, INetworkErrorType } from "./error_codes";
import { ErrorTypes, NetworkErrorTypes } from "./error_codes";
import errorMessage from "./error_message";

/**
 * Error linked to network interactions (requests).
 *
 * @class NetworkError
 * @extends Error
 */
export default class NetworkError extends Error {
  public readonly name: "NetworkError";
  public readonly type: "NETWORK_ERROR";
  public readonly message: string;
  public readonly code: INetworkErrorCode;
  public readonly url: string;
  public readonly status: number;
  public readonly errorType: INetworkErrorType;
  public fatal: boolean;
  private _baseError: RequestError;

  /**
   * @param {string} code
   * @param {Error} baseError
   */
  constructor(code: INetworkErrorCode, baseError: RequestError) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, NetworkError.prototype);

    this.name = "NetworkError";
    this.type = ErrorTypes.NETWORK_ERROR;

    this.url = baseError.url;
    this.status = baseError.status;
    this.errorType = baseError.type;
    this._baseError = baseError;

    this.code = code;
    this.message = errorMessage(this.code, baseError.message);
    this.fatal = false;
  }

  /**
   * Returns true if the NetworkError is due to the given http error code
   * @param {number} httpErrorCode
   * @returns {Boolean}
   */
  isHttpError(httpErrorCode: number): boolean {
    return (
      this.errorType === NetworkErrorTypes.ERROR_HTTP_CODE &&
      this.status === httpErrorCode
    );
  }

  /**
   * If that error has to be communicated through another thread, this method
   * allows to obtain its main defining properties in an Object so the Error can
   * be reconstructed in the other thread.
   * @returns {Object}
   */
  public serialize(): ISerializedNetworkError {
    return {
      name: this.name,
      code: this.code,
      baseError: this._baseError.serialize(),
    };
  }
}

/** Serializable object which allows to create a `NetworkError` later. */
export interface ISerializedNetworkError {
  name: "NetworkError";
  code: INetworkErrorCode;
  baseError: ISerializedRequestError;
}
