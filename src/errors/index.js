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

import EncryptedMediaError from "./EncryptedMediaError.js";
import IndexError from "./IndexError.js";
import MediaError from "./MediaError.js";
import NetworkError from "./NetworkError.js";
import OtherError from "./OtherError.js";
import RequestError from "./RequestError.js";

/**
 * Whether the error given has a type defined here.
 * @param {Error} error
 * @returns {Boolean}
 */
function isKnownError(error) {
  return (!!error && !!error.type && ErrorTypes.keys.indexOf(error.type) >= 0);
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
