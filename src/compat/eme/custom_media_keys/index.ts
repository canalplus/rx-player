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

import PPromise from "pinkie";
import { MediaError } from "../../../errors";
import assert from "../../../utils/assert";
import { ICompatHTMLMediaElement } from "../../browser_compatibility_types";
import { isIE11 } from "../../browser_detection";
import isNode from "../../is_node";
import shouldFavourCustomSafariEME from "../../should_favour_custom_safari_EME";
import CustomMediaKeySystemAccess from "./../custom_key_system_access";
import getIE11MediaKeysCallbacks, {
  MSMediaKeysConstructor,
} from "./ie11_media_keys";
import getMozMediaKeysCallbacks, {
  MozMediaKeysConstructor,
} from "./moz_media_keys_constructor";
import getOldKitWebKitMediaKeyCallbacks, {
  isOldWebkitMediaElement,
} from "./old_webkit_media_keys";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
} from "./types";
import getWebKitMediaKeysCallbacks from "./webkit_media_keys";
import { WebKitMediaKeysConstructor } from "./webkit_media_keys_constructor";

/** Generic implementation of the navigator.requestMediaKeySystemAccess API. */
type ICompatRequestMediaKeySystemAccessFn =
  (keyType : string, config : MediaKeySystemConfiguration[]) =>
    Promise<MediaKeySystemAccess | CustomMediaKeySystemAccess>;

let requestMediaKeySystemAccess : ICompatRequestMediaKeySystemAccessFn | null = null;

/**
 * Set the given MediaKeys on the given HTMLMediaElement.
 * Emits null when done then complete.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 */
let setMediaKeys :
((elt: HTMLMediaElement, mediaKeys: MediaKeys | ICustomMediaKeys | null) => void) =
  function defaultSetMediaKeys(
    mediaElement: HTMLMediaElement,
    mediaKeys: MediaKeys | ICustomMediaKeys | null
  ) {
    const elt : ICompatHTMLMediaElement = mediaElement;
    /* eslint-disable @typescript-eslint/unbound-method */
    if (typeof elt.setMediaKeys === "function") {
      return elt.setMediaKeys(mediaKeys as MediaKeys);
    }
    /* eslint-enable @typescript-eslint/unbound-method */

    // If we get in the following code, it means that no compat case has been
    // found and no standard setMediaKeys API exists. This case is particulary
    // rare. We will try to call each API with native media keys.
    if (typeof elt.webkitSetMediaKeys === "function") {
      return elt.webkitSetMediaKeys(mediaKeys);
    }

    if (typeof elt.mozSetMediaKeys === "function") {
      return elt.mozSetMediaKeys(mediaKeys);
    }

    if (typeof elt.msSetMediaKeys === "function" && mediaKeys !== null) {
      return elt.msSetMediaKeys(mediaKeys);
    }
  };

/**
 * Since Safari 12.1, EME APIs are available without webkit prefix.
 * However, it seems that since fairplay CDM implementation within the browser is not
 * standard with EME w3c current spec, the requestMediaKeySystemAccess API doesn't resolve
 * positively, even if the drm (fairplay in most cases) is supported.
 *
 * Therefore, we prefer not to use requestMediaKeySystemAccess on Safari when webkit API
 * is available.
 */
if (isNode ||
    (navigator.requestMediaKeySystemAccess != null && !shouldFavourCustomSafariEME())
) {
  requestMediaKeySystemAccess = navigator.requestMediaKeySystemAccess.bind(navigator);
} else {
  let isTypeSupported: (keyType: string) => boolean;
  let createCustomMediaKeys: (keyType: string) => ICustomMediaKeys;

  // This is for Chrome with unprefixed EME api
  if (isOldWebkitMediaElement(HTMLVideoElement.prototype)) {
    const callbacks = getOldKitWebKitMediaKeyCallbacks();
    isTypeSupported = callbacks.isTypeSupported;
    createCustomMediaKeys = callbacks.createCustomMediaKeys;
    setMediaKeys = callbacks.setMediaKeys;
  // This is for WebKit with prefixed EME api
  } else if (WebKitMediaKeysConstructor !== undefined) {
    const callbacks = getWebKitMediaKeysCallbacks();
    isTypeSupported = callbacks.isTypeSupported;
    createCustomMediaKeys = callbacks.createCustomMediaKeys;
    setMediaKeys = callbacks.setMediaKeys;
  } else if (isIE11 && MSMediaKeysConstructor !== undefined) {
    const callbacks = getIE11MediaKeysCallbacks();
    isTypeSupported = callbacks.isTypeSupported;
    createCustomMediaKeys = callbacks.createCustomMediaKeys;
    setMediaKeys = callbacks.setMediaKeys;
  } else if (MozMediaKeysConstructor !== undefined) {
    const callbacks = getMozMediaKeysCallbacks();
    isTypeSupported = callbacks.isTypeSupported;
    createCustomMediaKeys = callbacks.createCustomMediaKeys;
    setMediaKeys = callbacks.setMediaKeys;
  } else {
    const MK = window.MediaKeys as unknown as typeof MediaKeys & {
      isTypeSupported? : (keyType : string) => boolean;
      new(keyType? : string) : ICustomMediaKeys;
    };
    const checkForStandardMediaKeys = () => {
      if (MK === undefined) {
        throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED",
                             "No `MediaKeys` implementation found " +
                             "in the current browser.");
      }
      if (typeof MK.isTypeSupported === "undefined") {
        const message = "This browser seems to be unable to play encrypted contents " +
                        "currently. Note: Some browsers do not allow decryption " +
                        "in some situations, like when not using HTTPS.";
        throw new Error(message);
      }
    };
    isTypeSupported = (keyType: string): boolean => {
      checkForStandardMediaKeys();
      assert(typeof MK.isTypeSupported === "function");
      return MK.isTypeSupported(keyType);
    };
    createCustomMediaKeys = (keyType: string) => {
      checkForStandardMediaKeys();
      return new MK(keyType);
    };
  }

  requestMediaKeySystemAccess = function(
    keyType : string,
    keySystemConfigurations : MediaKeySystemConfiguration[]
  ) : Promise<MediaKeySystemAccess|CustomMediaKeySystemAccess> {
    if (!isTypeSupported(keyType)) {
      return PPromise.reject(new Error("Unsupported key type"));
    }

    for (let i = 0; i < keySystemConfigurations.length; i++) {
      const keySystemConfiguration = keySystemConfigurations[i];
      const { videoCapabilities,
              audioCapabilities,
              initDataTypes,
              distinctiveIdentifier } = keySystemConfiguration;
      let supported = true;
      supported = supported &&
                  (initDataTypes == null ||
                   initDataTypes.some((idt) => idt === "cenc"));
      supported = supported && (distinctiveIdentifier !== "required");

      if (supported) {
        const keySystemConfigurationResponse = {
          videoCapabilities,
          audioCapabilities,
          initDataTypes: ["cenc"],
          distinctiveIdentifier: "not-allowed" as const,
          persistentState: "required" as const,
          sessionTypes: ["temporary", "persistent-license"],
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const customMediaKeys = createCustomMediaKeys(keyType);
        return PPromise.resolve(
          new CustomMediaKeySystemAccess(keyType,
                                         customMediaKeys,
                                         keySystemConfigurationResponse)
        );
      }
    }

    return PPromise.reject(new Error("Unsupported configuration"));
  };
}

export {
  requestMediaKeySystemAccess,
  setMediaKeys,
  ICustomMediaKeys,
  ICustomMediaKeySession,
};
