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
  ICustomError,
  isKnownError,
  OtherError,
} from "../../errors";

/**
 * Format an unknown error into an API-defined error.
 * @param {*} error
 * @param {Boolean} fatal
 * @returns {Error}
 */
export default function formatError(
  error : unknown,
  fatal : boolean
) : ICustomError {
  if (!isKnownError(error)) {
    const reason = error instanceof Error && error.message ? error.message :
                                                             "Unknown error";
    return new OtherError("NONE", reason, fatal);
  } else {
    error.fatal = fatal;
    return error;
  }
}
