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
} from "./constants.js";

import errorMessage from "./errorMessage.js";

/**
 * @class MediaError
 */
function MediaError(code, reason, fatal) {
  this.name = "MediaError";
  this.type = ErrorTypes.MEDIA_ERROR;

  this.reason = reason;
  this.code = ErrorCodes[code];
  this.fatal = fatal;
  this.message = errorMessage(this.name, this.code, this.reason);
}
MediaError.prototype = new Error();

export default MediaError;
