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
  catchError,
  defer as observableDefer,
  map,
  Observable,
  of as observableOf,
  throwError as observableThrow,
} from "rxjs";
import {
  ICustomMediaKeySystemAccess,
  requestMediaKeySystemAccess,
  shouldRenewMediaKeys,
} from "../../compat";
import config from "../../config";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import arrayIncludes from "../../utils/array_includes";
import flatMap from "../../utils/flat_map";
import MediaKeysInfosStore from "./media_keys_infos_store";
import { IKeySystemOption } from "./types";

type MediaKeysRequirement = "optional" |
                            "required" |
                            "not-allowed";

export interface IMediaKeySystemAccessInfos {
  mediaKeySystemAccess: MediaKeySystemAccess |
                        ICustomMediaKeySystemAccess;
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

export type IFoundMediaKeySystemAccessEvent = IReuseMediaKeySystemAccessEvent |
                                              ICreateMediaKeySystemAccessEvent;

interface IMediaCapability { contentType?: string;
                             robustness?: string; }

interface IKeySystemType { keyName : string | undefined;
                           keyType : string;
                           keySystemOptions : IKeySystemOption; }

const { EME_DEFAULT_WIDEVINE_ROBUSTNESSES,
        EME_KEY_SYSTEMS } = config;

/**
 * @param {Array.<Object>} keySystems
 * @param {MediaKeySystemAccess} currentKeySystemAccess
 * @param {Object} currentKeySystemOptions
 * @returns {null|Object}
 */
function checkCachedMediaKeySystemAccess(
  keySystems: IKeySystemOption[],
  currentKeySystemAccess: MediaKeySystemAccess|ICustomMediaKeySystemAccess,
  currentKeySystemOptions: IKeySystemOption
) : null | {
  keySystemOptions: IKeySystemOption;
  keySystemAccess: MediaKeySystemAccess|ICustomMediaKeySystemAccess;
} {
  const mksConfiguration = currentKeySystemAccess.getConfiguration();
  if (shouldRenewMediaKeys() || mksConfiguration == null) {
    return null;
  }

  const firstCompatibleOption = keySystems.filter((ks) => {
    // TODO Do it with MediaKeySystemAccess.prototype.keySystem instead
    if (ks.type !== currentKeySystemOptions.type) {
      return false;
    }

    if ((ks.persistentLicense === true || ks.persistentStateRequired === true) &&
        mksConfiguration.persistentState !== "required")
    {
      return false;
    }

    if (ks.distinctiveIdentifierRequired === true &&
        mksConfiguration.distinctiveIdentifier !== "required")
    {
      return false;
    }

    return true;
  })[0];

  if (firstCompatibleOption != null) {
    return { keySystemOptions: firstCompatibleOption,
             keySystemAccess: currentKeySystemAccess };
  }
  return null;
}

/**
 * Find key system canonical name from key system type.
 * @param {string} ksType - Obtained via inversion
 * @returns {string|undefined} - Either the canonical name, or undefined.
 */
function findKeySystemCanonicalName(ksType: string) : string | undefined {
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
 * @param {string} [ksName] - Generic name for the key system. e.g. "clearkey",
 * "widevine", "playready". Can be used to make exceptions depending on it.
 * @param {Object} keySystem
 * @returns {Array.<Object>} - Configuration to give to the
 * requestMediaKeySystemAccess API.
 */
function buildKeySystemConfigurations(
  ksName : string | undefined,
  keySystem : IKeySystemOption
) : MediaKeySystemConfiguration[] {
  const sessionTypes = ["temporary"];
  let persistentState: MediaKeysRequirement = "optional";
  let distinctiveIdentifier: MediaKeysRequirement = "optional";

  if (keySystem.persistentLicense === true) {
    persistentState = "required";
    sessionTypes.push("persistent-license");
  }

  if (keySystem.persistentStateRequired === true) {
    persistentState = "required";
  }

  if (keySystem.distinctiveIdentifierRequired === true) {
    distinctiveIdentifier = "required";
  }

  // Set robustness, in order of consideration:
  //   1. the user specified its own robustnesses
  //   2. a "widevine" key system is used, in that case set the default widevine
  //      robustnesses as defined in the config
  //   3. set an undefined robustness
  const videoRobustnesses = keySystem.videoRobustnesses != null ?
    keySystem.videoRobustnesses :
    (ksName === "widevine" ? EME_DEFAULT_WIDEVINE_ROBUSTNESSES :
                             []);
  const audioRobustnesses = keySystem.audioRobustnesses != null ?
    keySystem.audioRobustnesses :
    (ksName === "widevine" ? EME_DEFAULT_WIDEVINE_ROBUSTNESSES :
                             []);

  if (videoRobustnesses.length === 0) {
    videoRobustnesses.push(undefined);
  }

  if (audioRobustnesses.length === 0) {
    audioRobustnesses.push(undefined);
  }

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
  const videoCapabilities: IMediaCapability[] =
    flatMap(videoRobustnesses,
            robustness => [{ contentType: "video/mp4;codecs=\"avc1.4d401e\"",
                             robustness },
                           { contentType: "video/mp4;codecs=\"avc1.42e01e\"",
                             robustness },
                           { contentType: "video/webm;codecs=\"vp8\"",
                             robustness } ]);

  const audioCapabilities: IMediaCapability[] =
    flatMap(audioRobustnesses,
            robustness => [{ contentType: "audio/mp4;codecs=\"mp4a.40.2\"",
                             robustness },
                           { contentType: "audio/webm;codecs=opus",
                             robustness } ]);

  // TODO Re-test with a set contentType but an undefined robustness on the
  // STBs on which this problem was found.
  //
  // add another with no {audio,video}Capabilities for some legacy browsers.
  // As of today's spec, this should return NotSupported but the first
  // candidate configuration should be good, so we should have no downside
  // doing that.
  // initDataTypes: ["cenc"],
  // videoCapabilities: undefined,
  // audioCapabilities: undefined,
  // distinctiveIdentifier,
  // persistentState,
  // sessionTypes,

  return [{ initDataTypes: ["cenc"],
            videoCapabilities,
            audioCapabilities,
            distinctiveIdentifier,
            persistentState,
            sessionTypes }];
}

/**
 * Try to find a compatible key system from the keySystems array given.
 *
 * Returns an Observable which, when subscribed to, will request a
 * MediaKeySystemAccess based on the various keySystems provided. This
 * Observable will:
 *   - emit the MediaKeySystemAccess and the keySystems as an object, when
 *     found. The object is under this form:
 *     {
 *       keySystemAccess {MediaKeySystemAccess}
 *       keySystem {Object}
 *     }
 *   - complete immediately after emitting.
 *   - throw if no  compatible key system has been found.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystems - The keySystems you want to test.
 * @returns {Observable}
 */
export default function getMediaKeySystemAccess(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[]
) : Observable<IFoundMediaKeySystemAccessEvent> {
  return observableDefer<Observable<IFoundMediaKeySystemAccessEvent>>(() => {
    log.info("EME: Searching for compatible MediaKeySystemAccess");
    const currentState = MediaKeysInfosStore.getState(mediaElement);
    if (currentState != null) {
      // Fast way to find a compatible keySystem if the currently loaded
      // one as exactly the same compatibility options.
      const cachedKeySystemAccess =
        checkCachedMediaKeySystemAccess(keySystemsConfigs,
                                        currentState.mediaKeySystemAccess,
                                        currentState.keySystemOptions);
      if (cachedKeySystemAccess !== null) {
        log.info("EME: Found cached compatible keySystem", cachedKeySystemAccess);
        return observableOf({
          type: "reuse-media-key-system-access" as const,
          value: { mediaKeySystemAccess: cachedKeySystemAccess.keySystemAccess,
                   options: cachedKeySystemAccess.keySystemOptions },
        });
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

        const managedRDNs = EME_KEY_SYSTEMS[keySystemOptions.type];
        let ksType;

        if (managedRDNs != null) {
          ksType = managedRDNs.map((keyType) => {
            const keyName = keySystemOptions.type;
            return { keyName, keyType, keySystemOptions };
          });
        }
        else {
          const keyName = findKeySystemCanonicalName(keySystemOptions.type);
          const keyType = keySystemOptions.type;
          ksType = [{ keyName, keyType, keySystemOptions }];
        }

        return arr.concat(ksType);
      }
      , []);

    return recursivelyTestKeySystems(0);

    /**
     * Test all key system configuration stored in `keySystemsType` one by one
     * recursively.
     * Returns an Observable which emit the MediaKeySystemAccess if one was
     * found compatible with one of the configurations or just throws if none
     * were found to be compatible.
     * @param {Number} index - The index in `keySystemsType` to start from.
     * Should be set to `0` when calling directly.
     * @returns {Observable}
     */
    function recursivelyTestKeySystems(
      index : number
    ) : Observable<IFoundMediaKeySystemAccessEvent> {
      // if we iterated over the whole keySystemsType Array, quit on error
      if (index >= keySystemsType.length) {
        const error = new EncryptedMediaError("INCOMPATIBLE_KEYSYSTEMS",
                                              "No key system compatible with your " +
                                              "wanted configuration has been found " +
                                              "in the current browser.");
        return observableThrow(() => error);
      }

      if (requestMediaKeySystemAccess == null) {
        const error = Error("requestMediaKeySystemAccess is not " +
                            "implemented in your browser.");
        return observableThrow(() => error);
      }

      const { keyName, keyType, keySystemOptions } = keySystemsType[index];

      const keySystemConfigurations = buildKeySystemConfigurations(keyName,
                                                                   keySystemOptions);

      log.debug(`EME: Request keysystem access ${keyType},` +
                `${index + 1} of ${keySystemsType.length}`,
                keySystemConfigurations);

      return requestMediaKeySystemAccess(keyType, keySystemConfigurations).pipe(
        map((keySystemAccess) => {
          log.info("EME: Found compatible keysystem", keyType, keySystemConfigurations);
          return { type: "create-media-key-system-access" as const,
                   value: { options: keySystemOptions,
                            mediaKeySystemAccess: keySystemAccess } };
        }),
        catchError(() => {
          log.debug("EME: Rejected access to keysystem",
                    keyType,
                    keySystemConfigurations);
          return recursivelyTestKeySystems(index + 1);
        }));
    }
  });
}
