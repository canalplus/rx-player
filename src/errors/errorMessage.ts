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

/**
 * Generate a normalized error message.
 * @param {string} name
 * @param {string} code
 * @param {Error|string} [reason]
 * @returns {string}
 */
export default function errorMessage(
  name : string,
  code : string,
  reason? : { message : string }|string|null
) : string {
   if (reason == null) {
     return `${name} (${code})`;
   } else if (typeof reason === "string") {
     return `${name} (${code}) ${reason}`;
   } else {
     const message = reason.message;
     return `${name} (${code}) ${message}`;
   }
 }
