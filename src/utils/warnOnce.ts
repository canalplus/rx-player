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

import arrayIncludes from "./array-includes";

const WARNED_MESSAGES : string[] = [];

/**
 * Perform a console.warn only once in the application lifetime.
 *
 * Useful for deprecated messages, for example.
 *
 * @param {string} message
 */
export default function warnOnce(message : string) : void {
  if (!arrayIncludes(WARNED_MESSAGES, message)) {
    /* eslint-disable no-console */
    console.warn(message);
    /* eslint-enable no-console */
    WARNED_MESSAGES.push(message);
  }
}
