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

import type {
  IMediaElement,
  IMediaKeySystemAccess,
  IMediaKeys,
} from "../../../compat/browser_compatibility_types";
import type { IEmeApiImplementation } from "../../../compat/eme";
import type { IKeySystemOption } from "../../../public_types";
import type LoadedSessionsStore from "./loaded_sessions_store";

/** DRM-related state that can be associated to a single HTMLMediaElement. */
export interface IMediaElementMediaKeysInfos {
  emeImplementation: IEmeApiImplementation;

  /** Last keySystemOptions used with that HTMLMediaElement. */
  keySystemOptions: IKeySystemOption;

  /**
   * Last MediaKeySystemAccess used to create a MediaKeys bound to that
   * HTMLMediaElement.
   */
  mediaKeySystemAccess: IMediaKeySystemAccess;

  /** Last MediaKeys instance bound to that HTMLMediaElement. */
  mediaKeys: IMediaKeys;

  /**
   * Store containing information about every MediaKeySession active on the
   * MediaKeys instance bound to that HTMLMediaElement.
   */
  loadedSessionsStore: LoadedSessionsStore;
}

// Store the MediaKeys infos attached to a media element.
const currentMediaState = new WeakMap<
  IMediaElement,
  IMediaElementMediaKeysInfos | null
>();

export default {
  /**
   * Update MediaKeys infos set on a HMTLMediaElement
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} state
   */
  setState(mediaElement: IMediaElement, state: IMediaElementMediaKeysInfos | null): void {
    currentMediaState.set(mediaElement, state);
  },

  /**
   * Get MediaKeys infos currently set on a HMTLMediaElement
   * @param {HTMLMediaElement} mediaElement
   * @returns {Object}
   */
  getState(mediaElement: IMediaElement): IMediaElementMediaKeysInfos | null {
    const currentState = currentMediaState.get(mediaElement);
    return currentState === undefined ? null : currentState;
  },

  /**
   * Remove MediaKeys infos currently set on a HMTLMediaElement
   * @param {HTMLMediaElement} mediaElement
   */
  clearState(mediaElement: IMediaElement): void {
    currentMediaState.set(mediaElement, null);
  },
};
