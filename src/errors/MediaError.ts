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

/**
 * @class MediaError
 * @extends Error
 */
export default class MediaError extends Error {
  public name : "MediaError";
  public type : string;
  public message : string;
  public code : string;
  public fatal : boolean;
  public reason? : { message : string }|string|null;

  constructor(code : string, reason? : any, fatal? : boolean) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, MediaError.prototype);

    this.name = "MediaError";
    this.type = ErrorTypes.MEDIA_ERROR;

    this.reason = reason;
    this.code = ErrorCodes[code];
    this.fatal = !!fatal;
    this.message = errorMessage(this.name, this.code, this.reason);
  }
}
