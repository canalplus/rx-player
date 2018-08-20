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

import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { hasEMEAPIs } from "../../compat/";
import { onEncrypted$ } from "../../compat/events";
import { EncryptedMediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import { IEMEManagerEvent } from "../eme";
import { IKeySystemOption } from "../eme/types";

/**
 * Create EMEManager if possible (has the APIs and configuration).
 * Else, return an Observable throwing at the next encrypted event encountered.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystems
 * @returns {Observable}
 */
export default function createEMEManager(
  mediaElement : HTMLMediaElement,
  keySystems : IKeySystemOption[]
) : Observable<IEMEManagerEvent> {
  if (features.emeManager == null) {
    return onEncrypted$(mediaElement).pipe(map(() => {
      log.error("eme: encrypted event but EME feature not activated");
      throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
    }));
  }

  if (!keySystems || !keySystems.length) {
    return onEncrypted$(mediaElement).pipe(map(() => {
      log.error("eme: ciphered media and no keySystem passed");
      throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
    }));
  }

  if (!hasEMEAPIs()) {
    return onEncrypted$(mediaElement).pipe(map(() => {
      log.error("eme: encrypted event but no EME API available");
      throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
    }));
  }

  return features.emeManager(mediaElement, keySystems);
}

export { IEMEManagerEvent };
