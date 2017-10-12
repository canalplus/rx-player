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
  RequestErrorTypes,
} from "./constants";

import RequestError from "./RequestError";
import errorMessage from "./errorMessage";

/**
 * @class NetworkError
 * @extends Error
 */
export default class NetworkError extends Error {
  public name : "NetworkError";
  public type : string;
  public message : string;
  public code : string;
  public fatal : boolean;
  public reason : RequestError;
  public xhr : XMLHttpRequest;
  public url : string;
  public status : number;
  public errorType : string;

  constructor(code : string, reason : RequestError, fatal? : boolean) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, NetworkError.prototype);

    this.name = "NetworkError";
    this.type = ErrorTypes.NETWORK_ERROR;

    this.xhr = reason.xhr;
    this.url = reason.url;
    this.status = reason.status;
    this.errorType = reason.type;

    this.reason = reason;
    this.code = ErrorCodes[code];
    this.fatal = !!fatal;
    this.message = errorMessage(this.name, this.code, this.reason);
  }

  /**
   * Returns true if the NetworkError is due to the given http error code
   * @param {number} httpErrorCode
   * @returns {Boolean}
   */
  isHttpError(httpErrorCode : number) : boolean {
    return (
      this.errorType === RequestErrorTypes.ERROR_HTTP_CODE &&
      this.status === httpErrorCode
    );
  }
}
