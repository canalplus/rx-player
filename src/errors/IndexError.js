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
 * @class IndexError
 */
function IndexError(code, indexType, fatal) {
  this.name = "IndexError";
  this.type = ErrorTypes.INDEX_ERROR;

  this.indexType = indexType;

  this.reason = null;
  this.code = ErrorCodes[code];
  this.fatal = fatal;
  this.message = errorMessage(this.name, this.code, null);
}
IndexError.prototype = new Error();

export default IndexError;
