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
} from "./constants.js";

import errorMessage from "./errorMessage.js";

/**
 * @class NetworkError
 */
function NetworkError(code, reason, fatal) {
  this.name = "NetworkError";
  this.type = ErrorTypes.NETWORK_ERROR;

  this.xhr = reason.xhr;
  this.url = reason.url;
  this.status = reason.status;
  this.reqType = reason.type;

  this.reason = reason;
  this.code = ErrorCodes[code];
  this.fatal = fatal;
  if (this.reason) {
    this.message = errorMessage(this.name, this.code, this.reason);
  } else {
    const reasonMessage = `${this.reqType}${this.status > 0 ? `(${this.status})` : ""} on ${this.url}`;
    this.message = errorMessage(this.name, this.code, {
      message: reasonMessage,
    });
  }
}
NetworkError.prototype = new Error();

NetworkError.prototype.isHttpError = function(httpErrorCode) {
  return (
    this.reqType == RequestErrorTypes.ERROR_HTTP_CODE &&
    this.status == httpErrorCode
  );
};

export default NetworkError;
