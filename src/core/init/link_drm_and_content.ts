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
  Subscription,
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
  IInitializationDataInfo,
  IKeySystemOption,
  IKeysUpdateEvent,
  ContentDecryptorState,
} from "../decrypt";
import { IWarningEvent } from "./types";

const { onEncrypted$ } = events;

/**
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystems
 * @param {Observable<Object>} contentProtections$
 * @param {Promise} linkingMedia$
 * @returns {Observable}
 */
export default function linkDrmAndContent<T>(
  mediaElement : HTMLMediaElement,
  keySystems : IKeySystemOption[],
  contentProtections$ : Observable<IContentProtection>,
  linkingMedia$ : Observable<T>
) : Observable<IContentDecryptorInitEvent<T>> {
  const encryptedEvents$ = observableMerge(onEncrypted$(mediaElement),
                                           contentProtections$);
  if (features.ContentDecryptor == null) {
    return observableMerge(
      encryptedEvents$.pipe(map(() => {
        log.error("Init: Encrypted event but EME feature not activated");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR",
                                      "EME feature not activated.");
      })),
      linkingMedia$.pipe(map(mediaSource => ({
        type: "decryption-disabled" as const,
        value: { drmSystemId: undefined, mediaSource },
      }))));
  }

  if (keySystems.length === 0) {
    return observableMerge(
      encryptedEvents$.pipe(map(() => {
        log.error("Init: Ciphered media and no keySystem passed");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR",
                                      "Media is encrypted and no `keySystems` given");
      })),
      linkingMedia$.pipe(map(mediaSource => ({
        type: "decryption-disabled" as const,
        value: { drmSystemId: undefined, mediaSource },
      }))));
  }

  if (!hasEMEAPIs()) {
    return observableMerge(
      encryptedEvents$.pipe(map(() => {
        log.error("Init: Encrypted event but no EME API available");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR",
                                      "Encryption APIs not found.");
      })),
      linkingMedia$.pipe(map(mediaSource => ({
        type: "decryption-disabled" as const,
        value: { drmSystemId: undefined, mediaSource },
      }))));
  }

  log.debug("Init: Creating ContentDecryptor");
  const ContentDecryptor = features.ContentDecryptor;
  return new Observable((obs) => {
    const contentDecryptor = new ContentDecryptor(mediaElement, keySystems);

    let mediaSub : Subscription | undefined;
    contentDecryptor.addEventListener("stateChange", (state) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");

        mediaSub = linkingMedia$.subscribe(mediaSource => {
          contentDecryptor.addEventListener("stateChange", (newState) => {
            if (newState === ContentDecryptorState.ReadyForContent) {
              obs.next({ type: "decryption-ready",
                         value: { drmSystemId: contentDecryptor.systemId,
                                  mediaSource } });
              contentDecryptor.removeEventListener("stateChange");
            }
          });

          contentDecryptor.attach();
        });
      }
    });

    contentDecryptor.addEventListener("keyUpdate", (e) => {
      obs.next({ type: "keys-update", value: e });
    });

    contentDecryptor.addEventListener("error", (e) => {
      obs.error(e);
    });

    contentDecryptor.addEventListener("warning", (w) => {
      obs.next({ type: "warning", value: w });
    });

    contentDecryptor.addEventListener("blacklistProtectionData", (e) => {
      obs.next({ type: "blacklist-protection-data", value: e });
    });

    const protectionDataSub = contentProtections$.subscribe(data => {
      contentDecryptor.onInitializationData(data);
    });

    return () => {
      protectionDataSub.unsubscribe();
      mediaSub?.unsubscribe();
      contentDecryptor.dispose();
    };
  });
}

export type IContentDecryptorInitEvent<T> = IDecryptionDisabledEvent<T> |
                                            IDecryptionReadyEvent<T> |
                                            IKeysUpdateEvent |
                                            IBlacklistProtectionDataEvent |
                                            IWarningEvent;

/**
 * Event emitted after deciding that no decryption logic will be launched for
 * the current content.
 */
export interface IDecryptionDisabledEvent<T> {
  type: "decryption-disabled";
  value: {
    /**
     * Identify the current DRM's system ID.
     * Here `undefined` as no decryption capability has been added.
     */
    drmSystemId: undefined;
    /** The value outputed by the `linkingMedia$` Observable. */
    mediaSource: T;
  };
}

/**
 * Event emitted when decryption capabilities have started and content can
 * begin to be pushed on the HTMLMediaElement.
 */
export interface IDecryptionReadyEvent<T> {
  type: "decryption-ready";
  value: {
    /**
     * Identify the current DRM's systemId as an hexadecimal string, so the
     * RxPlayer may be able to (optionally) only send the corresponding
     * encryption initialization data.
     * `undefined` if unknown.
     */
    drmSystemId: string | undefined;
    /** The value outputed by the `linkingMedia$` Observable. */
    mediaSource: T;
  };
}

/**
 * Event Emitted when specific "protection data" cannot be deciphered and is thus
 * blacklisted.
 *
 * The linked value is the initialization data linked to the content that cannot
 * be deciphered.
 */
export interface IBlacklistProtectionDataEvent {
  type: "blacklist-protection-data";
  value: IInitializationDataInfo;
}
