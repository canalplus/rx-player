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
  map,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  events,
  hasEMEAPIs,
} from "../../compat/";
import { EncryptedMediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import {
  IContentProtection,
  IEMEManagerEvent,
  IKeySystemOption,
} from "../eme";

const { onEncrypted$ } = events;

/**
 * Event emitted after deciding that no EME logic should be launched for the
 * current content.
 */
export interface IEMEDisabledEvent { type: "eme-disabled" }

/**
 * Create EMEManager if possible (has the APIs and configuration).
 * Else, return an Observable throwing at the next encrypted event encountered.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystems
 * @param {Observable<Object>} contentProtections$
 * @returns {Observable}
 */
export default function createEMEManager(
  mediaElement : HTMLMediaElement,
  keySystems : IKeySystemOption[],
  contentProtections$ : Observable<IContentProtection>
) : Observable<IEMEManagerEvent|IEMEDisabledEvent> {
  const encryptedEvents$ = observableMerge(onEncrypted$(mediaElement),
                                           contentProtections$);
  if (features.emeManager == null) {
    return observableMerge(
      encryptedEvents$.pipe(map(() => {
        log.error("Init: Encrypted event but EME feature not activated");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR",
                                      "EME feature not activated.");
      })),
      observableOf({ type: "eme-disabled" as const }));
  }

  if (keySystems.length === 0) {
    return observableMerge(
      encryptedEvents$.pipe(map(() => {
        log.error("Init: Ciphered media and no keySystem passed");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR",
                                      "Media is encrypted and no `keySystems` given");
      })),
      observableOf({ type: "eme-disabled" as const }));
  }

  if (!hasEMEAPIs()) {
    return observableMerge(
      encryptedEvents$.pipe(map(() => {
        log.error("Init: Encrypted event but no EME API available");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR",
                                      "Encryption APIs not found.");
      })),
      observableOf({ type: "eme-disabled" as const }));
  }

  log.debug("Init: Creating EMEManager");
  return features.emeManager(mediaElement,
                             keySystems,
                             contentProtections$);
}

export { IEMEManagerEvent };
