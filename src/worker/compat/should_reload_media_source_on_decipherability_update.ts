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
 * Returns true if we have to reload the MediaSource due to an update in the
 * decipherability status of some segments based on the current key sytem.
 *
 * We found that on all Widevine targets tested, a simple seek is sufficient.
 * As widevine clients make a good chunk of users, we can make a difference
 * between them and others as it is for the better.
 * @param {string|null} currentKeySystem
 * @returns {Boolean}
 */
export default function shouldReloadMediaSourceOnDecipherabilityUpdate(
  currentKeySystem : string | null
) : boolean {
  return currentKeySystem === null ||
         currentKeySystem.indexOf("widevine") < 0;
}
