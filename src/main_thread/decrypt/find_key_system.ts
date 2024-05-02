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

import type { IMediaElement } from "../../compat/browser_compatibility_types";
import type { ICustomMediaKeySystemAccess } from "../../compat/eme";
import eme from "../../compat/eme";
import shouldRenewMediaKeySystemAccess from "../../compat/should_renew_media_key_system_access";
import config from "../../config";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import type { IKeySystemOption } from "../../public_types";
import arrayIncludes from "../../utils/array_includes";
import flatMap from "../../utils/flat_map";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import type { CancellationSignal } from "../../utils/task_canceller";
import MediaKeysInfosStore from "./utils/media_keys_infos_store";

type MediaKeysRequirement = "optional" | "required" | "not-allowed";

export interface IMediaKeySystemAccessInfos {
  mediaKeySystemAccess: MediaKeySystemAccess | ICustomMediaKeySystemAccess;
  options: IKeySystemOption;
}

export interface IReuseMediaKeySystemAccessEvent {
  type: "reuse-media-key-system-access";
  value: IMediaKeySystemAccessInfos;
}

export interface ICreateMediaKeySystemAccessEvent {
  type: "create-media-key-system-access";
  value: IMediaKeySystemAccessInfos;
}

export type IFoundMediaKeySystemAccessEvent =
  | IReuseMediaKeySystemAccessEvent
  | ICreateMediaKeySystemAccessEvent;

interface IKeySystemType {
  /**
   * Generic name for the key system. e.g. "clearkey", "widevine", "playready".
   * Can be used to make exceptions depending on it.
   * `undefined` if unknown or if this concept does not exist for this key
   * system.
   */
  keyName: string | undefined;
  /** keyType: keySystem type (e.g. "com.widevine.alpha") */
  keyType: string;
  /** keySystem {Object}: the original keySystem object */
  keySystemOptions: IKeySystemOption;
}

/**
 * @param {Array.<Object>} keySystems
 * @param {MediaKeySystemAccess} currentKeySystemAccess
 * @param {Object} currentKeySystemOptions
 * @returns {null|Object}
 */
function checkCachedMediaKeySystemAccess(
  keySystems: IKeySystemOption[],
  currentKeySystemAccess: MediaKeySystemAccess | ICustomMediaKeySystemAccess,
  currentKeySystemOptions: IKeySystemOption,
): null | {
  keySystemOptions: IKeySystemOption;
  keySystemAccess: MediaKeySystemAccess | ICustomMediaKeySystemAccess;
} {
  const mksConfiguration = currentKeySystemAccess.getConfiguration();
  if (shouldRenewMediaKeySystemAccess() || isNullOrUndefined(mksConfiguration)) {
    return null;
  }

  const firstCompatibleOption = keySystems.filter((ks) => {
    // TODO Do it with MediaKeySystemAccess.prototype.keySystem instead
    if (ks.type !== currentKeySystemOptions.type) {
      return false;
    }

    if (
      (!isNullOrUndefined(ks.persistentLicenseConfig) ||
        ks.persistentState === "required") &&
      mksConfiguration.persistentState !== "required"
    ) {
      return false;
    }

    if (
      ks.distinctiveIdentifier === "required" &&
      mksConfiguration.distinctiveIdentifier !== "required"
    ) {
      return false;
    }

    return true;
  })[0];

  if (firstCompatibleOption !== undefined) {
    return {
      keySystemOptions: firstCompatibleOption,
      keySystemAccess: currentKeySystemAccess,
    };
  }
  return null;
}

/**
 * Find key system canonical name from key system type.
 * @param {string} ksType - Obtained via inversion
 * @returns {string|undefined} - Either the canonical name, or undefined.
 */
function findKeySystemCanonicalName(ksType: string): string | undefined {
  const { EME_KEY_SYSTEMS } = config.getCurrent();
  for (const ksName of Object.keys(EME_KEY_SYSTEMS)) {
    if (arrayIncludes(EME_KEY_SYSTEMS[ksName] as string[], ksType)) {
      return ksName;
    }
  }
  return undefined;
}

/**
 * Build configuration for the requestMediaKeySystemAccess EME API, based
 * on the current keySystem object.
 * @param {Object} keySystemTypeInfo
 * @returns {Array.<Object>} - Configuration to give to the
 * requestMediaKeySystemAccess API.
 */
function buildKeySystemConfigurations(
  keySystemTypeInfo: IKeySystemType,
): MediaKeySystemConfiguration[] {
  const { keyName, keyType, keySystemOptions: keySystem } = keySystemTypeInfo;
  const sessionTypes = ["temporary"];
  let persistentState: MediaKeysRequirement = "optional";
  let distinctiveIdentifier: MediaKeysRequirement = "optional";

  if (!isNullOrUndefined(keySystem.persistentLicenseConfig)) {
    persistentState = "required";
    sessionTypes.push("persistent-license");
  }

  if (!isNullOrUndefined(keySystem.persistentState)) {
    persistentState = keySystem.persistentState;
  }

  if (!isNullOrUndefined(keySystem.distinctiveIdentifier)) {
    distinctiveIdentifier = keySystem.distinctiveIdentifier;
  }
  const {
    EME_DEFAULT_AUDIO_CODECS,
    EME_DEFAULT_VIDEO_CODECS,
    EME_DEFAULT_WIDEVINE_ROBUSTNESSES,
    EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES,
  } = config.getCurrent();

  // From the W3 EME spec, we have to provide videoCapabilities and
  // audioCapabilities.
  // These capabilities must specify a codec (even though you can use a
  // completely different codec afterward).
  // It is also strongly recommended to specify the required security
  // robustness. As we do not want to forbide any security level, we specify
  // every existing security level from highest to lowest so that the best
  // security level is selected.
  // More details here:
  // https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf
  // https://www.w3.org/TR/encrypted-media/#get-supported-configuration-and-consent

  let audioCapabilities: MediaKeySystemMediaCapability[];
  let videoCapabilities: MediaKeySystemMediaCapability[];

  const { audioCapabilitiesConfig, videoCapabilitiesConfig } = keySystem;
  if (audioCapabilitiesConfig?.type === "full") {
    audioCapabilities = audioCapabilitiesConfig.value;
  } else {
    let audioRobustnesses: Array<string | undefined>;
    if (audioCapabilitiesConfig?.type === "robustness") {
      audioRobustnesses = audioCapabilitiesConfig.value;
    } else if (keyName === "widevine") {
      audioRobustnesses = EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
    } else if (keyType === "com.microsoft.playready.recommendation") {
      audioRobustnesses = EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
    } else {
      audioRobustnesses = [];
    }

    if (audioRobustnesses.length === 0) {
      audioRobustnesses.push(undefined);
    }

    const audioCodecs =
      audioCapabilitiesConfig?.type === "contentType"
        ? audioCapabilitiesConfig.value
        : EME_DEFAULT_AUDIO_CODECS;

    audioCapabilities = flatMap(audioRobustnesses, (robustness) =>
      audioCodecs.map((contentType) => {
        return robustness !== undefined ? { contentType, robustness } : { contentType };
      }),
    );
  }
  if (videoCapabilitiesConfig?.type === "full") {
    videoCapabilities = videoCapabilitiesConfig.value;
  } else {
    let videoRobustnesses: Array<string | undefined>;
    if (videoCapabilitiesConfig?.type === "robustness") {
      videoRobustnesses = videoCapabilitiesConfig.value;
    } else if (keyName === "widevine") {
      videoRobustnesses = EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
    } else if (keyType === "com.microsoft.playready.recommendation") {
      videoRobustnesses = EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
    } else {
      videoRobustnesses = [];
    }

    if (videoRobustnesses.length === 0) {
      videoRobustnesses.push(undefined);
    }

    const videoCodecs =
      videoCapabilitiesConfig?.type === "contentType"
        ? videoCapabilitiesConfig.value
        : EME_DEFAULT_VIDEO_CODECS;

    videoCapabilities = flatMap(videoRobustnesses, (robustness) =>
      videoCodecs.map((contentType) => {
        return robustness !== undefined ? { contentType, robustness } : { contentType };
      }),
    );
  }

  const wantedMediaKeySystemConfiguration: MediaKeySystemConfiguration = {
    initDataTypes: ["cenc"],
    videoCapabilities,
    audioCapabilities,
    distinctiveIdentifier,
    persistentState,
    sessionTypes,
  };

  return [
    wantedMediaKeySystemConfiguration,

    // Some legacy implementations have issues with `audioCapabilities` and
    // `videoCapabilities`, so we're including a supplementary
    // `MediaKeySystemConfiguration` without those properties.
    {
      ...wantedMediaKeySystemConfiguration,
      audioCapabilities: undefined,
      videoCapabilities: undefined,
    } as unknown as MediaKeySystemConfiguration,
  ];
}

/**
 * Try to find a compatible key system from the keySystems array given.
 *
 * This function will request a MediaKeySystemAccess based on the various
 * keySystems provided.
 *
 * This Promise might either:
 *   - resolves the MediaKeySystemAccess and the keySystems as an object, when
 *     found.
 *   - reject if no compatible key system has been found.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs - The keySystems you want to test.
 * @param {Object} cancelSignal
 * @returns {Promise.<Object>}
 */
export default function getMediaKeySystemAccess(
  mediaElement: IMediaElement,
  keySystemsConfigs: IKeySystemOption[],
  cancelSignal: CancellationSignal,
): Promise<IFoundMediaKeySystemAccessEvent> {
  log.info("DRM: Searching for compatible MediaKeySystemAccess");
  const currentState = MediaKeysInfosStore.getState(mediaElement);
  if (currentState !== null) {
    if (eme.implementation === currentState.emeImplementation.implementation) {
      // Fast way to find a compatible keySystem if the currently loaded
      // one as exactly the same compatibility options.
      const cachedKeySystemAccess = checkCachedMediaKeySystemAccess(
        keySystemsConfigs,
        currentState.mediaKeySystemAccess,
        currentState.keySystemOptions,
      );
      if (cachedKeySystemAccess !== null) {
        log.info("DRM: Found cached compatible keySystem");
        return Promise.resolve({
          type: "reuse-media-key-system-access" as const,
          value: {
            mediaKeySystemAccess: cachedKeySystemAccess.keySystemAccess,
            options: cachedKeySystemAccess.keySystemOptions,
          },
        });
      }
    }
  }

  /**
   * Array of set keySystems for this content.
   * Each item of this array is an object containing the following keys:
   *   - keyName {string}: keySystem canonical name (e.g. "widevine")
   *   - keyType {string}: keySystem type (e.g. "com.widevine.alpha")
   *   - keySystem {Object}: the original keySystem object
   * @type {Array.<Object>}
   */
  const keySystemsType: IKeySystemType[] = keySystemsConfigs.reduce(
    (arr: IKeySystemType[], keySystemOptions) => {
      const { EME_KEY_SYSTEMS } = config.getCurrent();
      const managedRDNs = EME_KEY_SYSTEMS[keySystemOptions.type];
      let ksType;

      if (!isNullOrUndefined(managedRDNs)) {
        ksType = managedRDNs.map((keyType) => {
          const keyName = keySystemOptions.type;
          return { keyName, keyType, keySystemOptions };
        });
      } else {
        const keyName = findKeySystemCanonicalName(keySystemOptions.type);
        const keyType = keySystemOptions.type;
        ksType = [{ keyName, keyType, keySystemOptions }];
      }

      return arr.concat(ksType);
    },
    [],
  );

  return recursivelyTestKeySystems(0);

  /**
   * Test all key system configuration stored in `keySystemsType` one by one
   * recursively.
   * Returns a Promise which will emit the MediaKeySystemAccess if one was
   * found compatible with one of the configurations or just reject if none
   * were found to be compatible.
   * @param {Number} index - The index in `keySystemsType` to start from.
   * Should be set to `0` when calling directly.
   * @returns {Promise.<Object>}
   */
  async function recursivelyTestKeySystems(
    index: number,
  ): Promise<IFoundMediaKeySystemAccessEvent> {
    // if we iterated over the whole keySystemsType Array, quit on error
    if (index >= keySystemsType.length) {
      throw new EncryptedMediaError(
        "INCOMPATIBLE_KEYSYSTEMS",
        "No key system compatible with your wanted " +
          "configuration has been found in the current " +
          "browser.",
      );
    }

    if (isNullOrUndefined(eme.requestMediaKeySystemAccess)) {
      throw new Error("requestMediaKeySystemAccess is not implemented in your browser.");
    }

    const chosenType = keySystemsType[index];
    const { keyType, keySystemOptions } = chosenType;

    const keySystemConfigurations = buildKeySystemConfigurations(chosenType);

    log.debug(
      `DRM: Request keysystem access ${keyType},` +
        `${index + 1} of ${keySystemsType.length}`,
    );

    try {
      const keySystemAccess = await eme.requestMediaKeySystemAccess(
        keyType,
        keySystemConfigurations,
      );
      log.info("DRM: Found compatible keysystem", keyType, index + 1);
      return {
        type: "create-media-key-system-access" as const,
        value: {
          options: keySystemOptions,
          mediaKeySystemAccess: keySystemAccess,
        },
      };
    } catch (_) {
      log.debug("DRM: Rejected access to keysystem", keyType, index + 1);
      if (cancelSignal.cancellationError !== null) {
        throw cancelSignal.cancellationError;
      }
      return recursivelyTestKeySystems(index + 1);
    }
  }
}
