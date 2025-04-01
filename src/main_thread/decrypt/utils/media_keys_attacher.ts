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
  IMediaKeys,
  IMediaKeySystemAccess,
} from "../../../compat/browser_compatibility_types";
import type { IEmeApiImplementation } from "../../../compat/eme";
import { setMediaKeys } from "../../../compat/eme/set_media_keys";
import { EncryptedMediaError } from "../../../errors";
import log from "../../../log";
import type { IKeySystemOption } from "../../../public_types";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import type LoadedSessionsStore from "./loaded_sessions_store";

/** DRM-related state that can be associated to a single HTMLMediaElement. */
export interface IMediaElementMediaKeysInfos {
  emeImplementation: IEmeApiImplementation;

  /** Last keySystemOptions used with that HTMLMediaElement. */
  keySystemOptions: IKeySystemOption;

  /**
   * The actual MediaKeySystemConfiguration asked to the
   * `requestMediaKeySystemAccess` API.
   */
  askedConfiguration: MediaKeySystemConfiguration;

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
const currentMediaState = new WeakMap<IMediaElement, IMediaKeysAttacherItem>();

interface IMediaKeysAttacherItem {
  /**
   * Information on `MediaKeys` which has been attached or is being attached
   * to the `HTMLMediaElement`.
   *
   * `null` either if no `MediaKeys` is attached or if the last attachment
   * task failed.
   */
  mediaKeysState: IMediaElementMediaKeysInfos | null;

  /**
   * Property set to a Promise **only** when the `MediaKeys` attachment is
   * pending.
   *
   * This promise resolves once `mediaKeys` is attached to that
   * `HTMLMediaElement`, and rejects if it failed to do so.
   *
   * `null` if no `MediaKeys` attachment is pending (it is already attached
   * or it already failed to do so).
   */
  pendingTask: Promise<void> | null;
}

export default {
  /**
   * Attach new MediaKeys infos set on a HMTLMediaElement.
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} mediaKeysInfo
   * @returns {Promise}
   */
  async attach(
    mediaElement: IMediaElement,
    mediaKeysInfo: IMediaElementMediaKeysInfos,
  ): Promise<void> {
    const previousState = currentMediaState.get(mediaElement);
    const pendingTask = attachMediaKeys(mediaElement, previousState, mediaKeysInfo).then(
      () => {
        currentMediaState.set(mediaElement, {
          pendingTask: null,
          mediaKeysState: mediaKeysInfo,
        });
      },
      () => {
        currentMediaState.set(mediaElement, {
          pendingTask: null,
          mediaKeysState: null,
        });
      },
    );
    currentMediaState.set(mediaElement, {
      pendingTask,
      mediaKeysState: mediaKeysInfo,
    });
    return pendingTask;
  },

  /**
   * Get MediaKeys information expected to be linked to the given
   * `HTMLMediaElement`.
   *
   * Unlike `getAttachedMediaKeysState`, this method is synchronous and will
   * also return the expected state when `MediaKeys` attachment is still
   * pending and thus when that state is not truly applied (and where it
   * might fail before being applied).
   *
   * As such, only call this method if you want the currently expected state,
   * not the actual one.
   * @param {HTMLMediaElement} mediaElement
   * @returns {Array}
   */
  getAwaitedState(mediaElement: IMediaElement): IMediaElementMediaKeysInfos | null {
    const currentState = currentMediaState.get(mediaElement);
    return currentState?.mediaKeysState ?? null;
  },

  /**
   * Get MediaKeys information set on a HMTLMediaElement.
   *
   * This method is asynchronous because that state may still be in a process
   * of being attached to the `HTMLMediaElement` (and the state we're
   * currently setting may not work out).
   * @param {HTMLMediaElement} mediaElement
   * @returns {Object|null}
   */
  async getAttachedMediaKeysState(
    mediaElement: IMediaElement,
  ): Promise<IMediaElementMediaKeysInfos | null> {
    const currentState = currentMediaState.get(mediaElement);
    if (currentState === undefined) {
      return null;
    }
    if (currentState.pendingTask !== null) {
      await currentState.pendingTask;
      return this.getAttachedMediaKeysState(mediaElement);
    }
    return currentState.mediaKeysState;
  },

  /**
   * Remove MediaKeys currently set on a HMTLMediaElement and update state
   * accordingly.
   * @param {HTMLMediaElement} mediaElement
   * @returns {Promise}
   */
  clearMediaKeys(mediaElement: IMediaElement): Promise<void> {
    const previousState = currentMediaState.get(mediaElement);
    const pendingTask = clearMediaKeys(mediaElement, previousState).then(
      () => {
        currentMediaState.set(mediaElement, {
          pendingTask: null,
          mediaKeysState: null,
        });
      },
      () => {
        currentMediaState.set(mediaElement, {
          pendingTask: null,
          mediaKeysState: null,
        });
      },
    );
    currentMediaState.set(mediaElement, {
      pendingTask,
      mediaKeysState: null,
    });
    return pendingTask;
  },
};

/**
 * Ensure that the last `MediaKeys` set on the given HTMLMediaElement is
 * attached.
 *
 * The returned Promise never rejects, it will just log an error if the
 * previous attachment failed.
 *
 * @param {Object} previousState
 * @returns {Promise.<undefined>}
 */
async function awaitMediaKeysAttachment(
  previousState: IMediaKeysAttacherItem,
): Promise<void> {
  const promise = previousState.pendingTask;
  if (isNullOrUndefined(promise)) {
    return;
  }
  log.info("DRM: Awaiting previous MediaKeys attachment operation");
  try {
    await previousState.pendingTask;
  } catch (err) {
    log.info(
      "DRM: previous MediaKeys attachment operation failed",
      err instanceof Error ? err : "Unknown error",
    );
  }
}

async function attachMediaKeys(
  mediaElement: IMediaElement,
  previousState: IMediaKeysAttacherItem | undefined,
  mediaKeysInfo: IMediaElementMediaKeysInfos,
): Promise<void> {
  if (previousState !== undefined) {
    if (previousState.pendingTask !== null) {
      // Ensure the `MediaKeys` has been fully attached to the HTMLMediaElement before
      // resetting things, to avoid browser errors due to an invalid state.
      await awaitMediaKeysAttachment(previousState);
    }

    const closeAllSessions =
      !isNullOrUndefined(previousState.mediaKeysState) &&
      previousState.mediaKeysState.loadedSessionsStore !==
        mediaKeysInfo.loadedSessionsStore
        ? previousState.mediaKeysState.loadedSessionsStore.closeAllSessions()
        : Promise.resolve();

    await closeAllSessions;

    if (mediaElement.mediaKeys === mediaKeysInfo.mediaKeys) {
      log.debug("DRM: Right MediaKeys already set");
      return;
    }
  }

  log.info("DRM: Attaching MediaKeys to the media element");
  try {
    await setMediaKeys(
      mediaKeysInfo.emeImplementation,
      mediaElement,
      mediaKeysInfo.mediaKeys,
    );
    log.info("DRM: MediaKeys attached with success");
  } catch (err) {
    const errMessage = err instanceof Error ? err.toString() : "Unknown Error";
    throw new EncryptedMediaError(
      "MEDIA_KEYS_ATTACHMENT_ERROR",
      "Could not attach the MediaKeys to the media element: " + errMessage,
    );
  }
}

async function clearMediaKeys(
  mediaElement: IMediaElement,
  previousState: IMediaKeysAttacherItem | undefined,
): Promise<unknown> {
  if (previousState === undefined) {
    return;
  }

  if (previousState.pendingTask !== null) {
    // Ensure the `MediaKeys` has been fully attached to the HTMLMediaElement before
    // resetting things, to avoid browser errors due to an invalid state.
    await awaitMediaKeysAttachment(previousState);
  }

  if (previousState.mediaKeysState === null) {
    return;
  }

  log.info("DRM: Disposing of the current MediaKeys");
  const { loadedSessionsStore } = previousState.mediaKeysState;
  await loadedSessionsStore.closeAllSessions();
  return setMediaKeys(previousState.mediaKeysState.emeImplementation, mediaElement, null);
}
