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

import { IEMEManagerEvent } from "../eme";
import { IEMEDisabledEvent } from "./create_eme_manager";

/**
 * Returns true if the received EME-related event indicate that we can begin to
 * load the content.
 * @param {Object} emeEvent
 * @returns {Boolean}
 */
export default function isEMEReadyEvent(
  emeEvent : IEMEManagerEvent | IEMEDisabledEvent
) : boolean {
  return emeEvent.type === "eme-disabled" ||
         emeEvent.type === "attached-media-keys" ||
         (emeEvent.type === "created-media-keys" &&
          emeEvent.value.keySystemOptions.disableMediaKeysAttachmentLock === true);
}
