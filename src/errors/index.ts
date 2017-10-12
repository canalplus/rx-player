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

// Custom Errors
import EncryptedMediaError from "./EncryptedMediaError";
import IndexError from "./IndexError";
import MediaError from "./MediaError";
import OtherError from "./OtherError";
import NetworkError from "./NetworkError";

// Error used for XHRs
import RequestError from "./RequestError";

export type CustomError =
  EncryptedMediaError |
  IndexError |
  MediaError |
  OtherError |
  NetworkError;

/**
 * Whether the error given is a CustomError.
 * @param {Error} error
 * @returns {Boolean}
 */
function isKnownError(error : any) : error is CustomError {
  return (
    !!error &&
    !!error.type &&
    Object.keys(ErrorTypes).indexOf(error.type) >= 0
  );
}

export {
  ErrorCodes,
  ErrorTypes,
  RequestErrorTypes,

  EncryptedMediaError,
  IndexError,
  MediaError,
  NetworkError,
  OtherError,
  RequestError,

  isKnownError,
};
