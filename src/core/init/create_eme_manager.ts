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
  concat as observableConcat,
  Observable,
  of as observableOf,
} from "rxjs";
import { map } from "rxjs/operators";
import {
  events,
  hasEMEAPIs,
} from "../../compat/";
import { EncryptedMediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import {
  IEMEInitEvent,
  IEMEManagerEvent,
  IKeySystemOption,
} from "../eme";

const { onEncrypted$ } = events;

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

  // emit disabled event and handle unexpected encrypted event
  function handleDisabledEME(logMessage: string): Observable<IEMEInitEvent> {
    return observableConcat(
      observableOf({ type: "eme-disabled" as "eme-disabled" }),
      onEncrypted$(mediaElement).pipe(map(() => {
        log.error(logMessage);
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
      }))
    );
  }

  if (features.emeManager == null) {
    return handleDisabledEME("Init: Encrypted event but EME feature not activated");
  }

  if (!keySystems || !keySystems.length) {
    return handleDisabledEME("Init: Ciphered media and no keySystem passed");
  }

  if (!hasEMEAPIs()) {
    return handleDisabledEME("Init: Encrypted event but no EME API available");
  }

  log.debug("Init: Creating EMEManager");
  return features.emeManager(mediaElement, keySystems);
}

export { IEMEManagerEvent };
