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
  defer as observableDefer,
  Observable,
  of as observableOf,
  throwError as observableThrow,
} from "rxjs";
import castToObservable from "../../../utils/cast_to_observable";
import { MediaKeys_ } from "../../browser_compatibility_types";
import { isIE11 } from "../../browser_detection";
import isNode from "../../is_node";
import shouldFavourCustomSafariEME from "../../should_favour_custom_safari_EME";
import CustomMediaKeySystemAccess from "./../custom_key_system_access";
import getIE11MediaKeysCallbacks, {
  MSMediaKeysConstructor
} from "./ie11_media_keys";
import getOldKitWebKitMediaKeyCallbacks, {
  isOldWebkitMediaElement
} from "./old_webkit_media_keys";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
} from "./types";
import getWebKitMediaKeysCallbacks from "./webkit_media_keys";
import { WebKitMediaKeysConstructor } from "./webkit_media_keys_constructor";

let requestMediaKeySystemAccess : null |
                                  ((keyType : string,
                                    config : MediaKeySystemConfiguration[])
                                      => Observable<MediaKeySystemAccess |
                                                    CustomMediaKeySystemAccess>)
                                = null;

let _setMediaKeys : ((elt: HTMLMediaElement,
                      mediaKeys: MediaKeys | ICustomMediaKeys | null) => void) =
  function defaultSetMediaKeys(elt: HTMLMediaElement,
                               mediaKeys: MediaKeys | ICustomMediaKeys | null) {
    /* tslint:disable no-unbound-method */
    if (typeof elt.setMediaKeys === "function") {
      return elt.setMediaKeys(mediaKeys as MediaKeys);
    }
    /* tslint:enable no-unbound-method */

    // If we get in the following code, it means that no compat case has been
    // found and no standard setMediaKeys API exists. This case is particulary
    // rare. We will try to call each API with native media keys.
    if ((elt as any).webkitSetMediaKeys) {
      /* tslint:disable no-unsafe-any */
      return (elt as any).webkitSetMediaKeys(mediaKeys);
      /* tslint:enable no-unsafe-any */
    }

    if ((elt as any).mozSetMediaKeys) {
      /* tslint:disable no-unsafe-any */
      return (elt as any).mozSetMediaKeys(mediaKeys);
      /* tslint:enable no-unsafe-any */
    }

    if ((elt as any).msSetMediaKeys && mediaKeys !== null) {
      /* tslint:disable no-unsafe-any */
      return (elt as any).msSetMediaKeys(mediaKeys);
      /* tslint:enable no-unsafe-any */
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
  requestMediaKeySystemAccess = (a : string, b : MediaKeySystemConfiguration[]) =>
    castToObservable(navigator.requestMediaKeySystemAccess(a, b));
} else {
  let isTypeSupported = (keyType: string): boolean => {
    if ((MediaKeys_ as any).isTypeSupported === undefined) {
      throw new Error("No isTypeSupported on MediaKeys.");
    }
    /* tslint:disable no-unsafe-any */
    return (MediaKeys_ as any).isTypeSupported(keyType);
    /* tslint:enable no-unsafe-any */
  };
  let createCustomMediaKeys = (keyType: string) => {
    return new (MediaKeys_ as any)(keyType);
  };

  // This is for Chrome with unprefixed EME api
  if (isOldWebkitMediaElement(HTMLVideoElement.prototype)) {
    const callbacks = getOldKitWebKitMediaKeyCallbacks();
    isTypeSupported = callbacks.isTypeSupported;
    createCustomMediaKeys = callbacks.createCustomMediaKeys;
    _setMediaKeys = callbacks.setMediaKeys;
  // This is for WebKit with prefixed EME api
  } else if (WebKitMediaKeysConstructor !== undefined) {
    const callbacks = getWebKitMediaKeysCallbacks();
    /* tslint:disable no-unsafe-any */
    isTypeSupported = callbacks.isTypeSupported;
    /* tslint:enable no-unsafe-any */
    createCustomMediaKeys = callbacks.createCustomMediaKeys;
    _setMediaKeys = callbacks.setMediaKeys;
  } else if (isIE11 && MSMediaKeysConstructor !== undefined)
    {
      const callbacks = getIE11MediaKeysCallbacks();
      /* tslint:disable no-unsafe-any */
      isTypeSupported = callbacks.isTypeSupported;
      /* tslint:enable no-unsafe-any */
      createCustomMediaKeys = callbacks.createCustomMediaKeys;
      _setMediaKeys = callbacks.setMediaKeys;
    }

  requestMediaKeySystemAccess = function(
    keyType : string,
    keySystemConfigurations : MediaKeySystemConfiguration[]
  ) : Observable<MediaKeySystemAccess|CustomMediaKeySystemAccess> {
    // TODO Why TS Do not understand that isTypeSupported exists here?
    /* tslint:disable no-unsafe-any */
    if (!isTypeSupported(keyType)) {
    /* tslint:enable no-unsafe-any */
      return observableThrow(undefined);
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
          distinctiveIdentifier: "not-allowed" as "not-allowed",
          persistentState: "required" as "required",
          sessionTypes: ["temporary", "persistent-license"],
        };

        const customMediaKeys = createCustomMediaKeys(keyType);
        return observableOf(
          new CustomMediaKeySystemAccess(keyType,
                                         /* tslint:disable no-unsafe-any */
                                         customMediaKeys,
                                         /* tslint:enable no-unsafe-any */
                                         keySystemConfigurationResponse)
        );
      }
    }

    return observableThrow(undefined);
  };
}

/**
 * Set the given MediaKeys on the given HTMLMediaElement.
 * Emits null when done then complete.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Observable}
 */
function setMediaKeys(
  elt : HTMLMediaElement,
  mediaKeys : MediaKeys|ICustomMediaKeys|null
) : Observable<unknown> {
  return observableDefer(() => castToObservable(_setMediaKeys(elt, mediaKeys)));
}

export {
  requestMediaKeySystemAccess,
  setMediaKeys,
  ICustomMediaKeys,
  ICustomMediaKeySession,
};
