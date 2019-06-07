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
} from "./error_codes";
import errorMessage from "./error_message";
import RequestError from "./request_error";

/**
 * Error linked to network interactions (requests).
 *
 * @class NetworkError
 * @extends Error
 */
export default class NetworkError extends Error {
  public readonly name : "NetworkError";
  public readonly type : string;
  public readonly message : string;
  public readonly code : string|undefined;
  public readonly xhr : XMLHttpRequest|null;
  public readonly url : string;
  public readonly status : number;
  public readonly errorType : string;
  public fatal : boolean;

  /**
   * @param {string} code
   * @param {Error} requestError
   * @param {Boolean} fatal
   */
  constructor(code : string, requestError : RequestError, fatal : boolean) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, NetworkError.prototype);

    this.name = "NetworkError";
    this.type = ErrorTypes.NETWORK_ERROR;

    this.xhr = requestError.xhr;
    this.url = requestError.url;
    this.status = requestError.status;
    this.errorType = requestError.type;

    this.code = ErrorCodes.hasOwnProperty(code) ?
                  (ErrorCodes as Record<string, string>)[code] :
                  "";
    this.fatal = !!fatal;
    this.message = errorMessage(this.name, this.code, requestError.message);
  }

  /**
   * Returns true if the NetworkError is due to the given http error code
   * @param {number} httpErrorCode
   * @returns {Boolean}
   */
  isHttpError(httpErrorCode : number) : boolean {
    return this.errorType === RequestErrorTypes.ERROR_HTTP_CODE &&
           this.status === httpErrorCode;
  }
}
