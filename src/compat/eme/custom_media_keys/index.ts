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
  Observable,
  of as observableOf,
  throwError as observableThrow,
} from "rxjs";
import castToObservable from "../../../utils/cast_to_observable";
import {
  // XXX TODO remove when the issue is resolved
  // https://github.com/Microsoft/TypeScript/issues/19189
  ICompatMediaKeySystemAccess,
  ICompatMediaKeySystemConfiguration,
  MediaKeys_,
} from "../../browser_compatibility_types";
import { isIE11 } from "../../browser_detection";
import isNode from "../../is_node";
import shouldUseWebKitMediaKeys from "../../should_use_webkit_media_keys";
import CustomMediaKeySystemAccess from "./../custom_key_system_access";
import getIE11MediaKeysCallbacks from "./ie11_media_keys";
import getOldKitWebKitMediaKeyCallbacks, {
  isOldWebkitMediaElement
} from "./oldwebkit_media_keys";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
} from "./types";
import getWebKitMediaKeysCallbacks from "./webkit_media_keys";

/* tslint:disable no-unsafe-any */
const { MSMediaKeys,
        WebKitMediaKeys } = (window as any);
/* tslint:enable no-unsafe-any */

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
let requestMediaKeySystemAccess : null |
                                  ((keyType : string,
                                    config : ICompatMediaKeySystemConfiguration[])
                                      => Observable<ICompatMediaKeySystemAccess |
                                                    CustomMediaKeySystemAccess>)
                                = null;

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
    (navigator.requestMediaKeySystemAccess != null && !shouldUseWebKitMediaKeys())
) {
  requestMediaKeySystemAccess = (a : string, b : ICompatMediaKeySystemConfiguration[]) =>
    castToObservable(
      navigator.requestMediaKeySystemAccess(a, b) as Promise<ICompatMediaKeySystemAccess>
    );
} else {
  // This is for Chrome with unprefixed EME api
  if (isOldWebkitMediaElement(HTMLVideoElement.prototype)) {
    const callbacks = getOldKitWebKitMediaKeyCallbacks();
    isTypeSupported = callbacks.isTypeSupported;
    createCustomMediaKeys = callbacks.createCustomMediaKeys;
  // This is for WebKit with prefixed EME api
  } else if (shouldUseWebKitMediaKeys() &&
             /* tslint:disable no-unsafe-any */
             typeof WebKitMediaKeys.isTypeSupported === "function"
             /* tslint:enable no-unsafe-any */
  ) {
    const callbacks = getWebKitMediaKeysCallbacks();
    /* tslint:disable no-unsafe-any */
    isTypeSupported = callbacks.isTypeSupported;
    /* tslint:enable no-unsafe-any */
    createCustomMediaKeys = callbacks.createCustomMediaKeys;
  } else if (isIE11 &&
             MSMediaKeys != null &&
             /* tslint:disable no-unsafe-any */
             MSMediaKeys.prototype != null &&
             typeof MSMediaKeys.isTypeSupported === "function" &&
             typeof MSMediaKeys?.prototype?.createSession === "function")
             /* tslint:enable no-unsafe-any */
    {
      const callbacks = getIE11MediaKeysCallbacks();
      /* tslint:disable no-unsafe-any */
      isTypeSupported = callbacks.isTypeSupported;
      /* tslint:enable no-unsafe-any */
      createCustomMediaKeys = callbacks.createCustomMediaKeys;
    }

  requestMediaKeySystemAccess = function(
    keyType : string,
    keySystemConfigurations : ICompatMediaKeySystemConfiguration[]
  ) : Observable<ICompatMediaKeySystemAccess|CustomMediaKeySystemAccess> {
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

export {
  requestMediaKeySystemAccess,
  ICustomMediaKeys,
  ICustomMediaKeySession,
};
