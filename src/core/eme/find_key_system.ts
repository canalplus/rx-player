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
  Subscription,
} from "rxjs";
import {
  // XXX TODO remove when the issue is resolved
  // https://github.com/Microsoft/TypeScript/issues/19189
  ICompatMediaKeySystemAccess,
  ICompatMediaKeySystemConfiguration,

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
  mediaKeySystemAccess: ICompatMediaKeySystemAccess |
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

interface IKeySystemType { keyName: string;
                           keyType: string;
                           keySystemOptions: IKeySystemOption; }

const { EME_DEFAULT_WIDEVINE_ROBUSTNESSES,
        EME_KEY_SYSTEMS } = config;

/**
 * @param {Array.<Object>} keySystems
 * @param {Object} currentMediaKeysInfos
 * @returns {null|Object}
 */
function checkCachedMediaKeySystemAccess(
  keySystems: IKeySystemOption[],
  currentKeySystemAccess: ICompatMediaKeySystemAccess|ICustomMediaKeySystemAccess,
  currentKeySystemOptions: IKeySystemOption
) : null | {
  keySystemOptions: IKeySystemOption;
  keySystemAccess: ICompatMediaKeySystemAccess|ICustomMediaKeySystemAccess;
} {
  const mksConfiguration = currentKeySystemAccess.getConfiguration();

  if (shouldRenewMediaKeys() || !mksConfiguration) {
    return null;
  }

  const firstCompatibleOption = keySystems.filter((ks) => {
    // TODO Do it with MediaKeySystemAccess.prototype.keySystem instead
    if (ks.type !== currentKeySystemOptions.type) {
      return false;
    }

    if (ks.persistentLicense &&
      mksConfiguration.persistentState !== "required") {
      return false;
    }

    if (ks.distinctiveIdentifierRequired &&
      mksConfiguration.distinctiveIdentifier !== "required") {
      return false;
    }

    return true;
  })[0];

  if (firstCompatibleOption) {
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
function findKeySystemCanonicalName(ksType: string)
: string|undefined {
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
  ksName: string,
  keySystem: IKeySystemOption
) : ICompatMediaKeySystemConfiguration[] {
  const sessionTypes = ["temporary"];
  let persistentState: MediaKeysRequirement = "optional";
  let distinctiveIdentifier: MediaKeysRequirement = "optional";

  if (keySystem.persistentLicense) {
    persistentState = "required";
    sessionTypes.push("persistent-license");
  }

  if (keySystem.persistentStateRequired) {
    persistentState = "required";
  }

  if (keySystem.distinctiveIdentifierRequired) {
    distinctiveIdentifier = "required";
  }

  // Set robustness, in order of consideration:
  //   1. the user specified its own robustnesses
  //   2. a "widevine" key system is used, in that case set the default widevine
  //      robustnesses as defined in the config
  //   3. set an undefined robustness
  const videoRobustnesses = keySystem.videoRobustnesses ||
    (ksName === "widevine" ? EME_DEFAULT_WIDEVINE_ROBUSTNESSES : []);
  const audioRobustnesses = keySystem.audioRobustnesses ||
    (ksName === "widevine" ? EME_DEFAULT_WIDEVINE_ROBUSTNESSES : []);

  if (!videoRobustnesses.length) {
    videoRobustnesses.push(undefined);
  }

  if (!audioRobustnesses.length) {
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
 * @param {Array.<Object>} keySystems - The keySystems you want to test.
 * @param {Object} currentMediaKeysInfos
 * @returns {Observable}
 */
export default function getMediaKeySystemAccess(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[],
  currentMediaKeysInfos: MediaKeysInfosStore
) : Observable<IFoundMediaKeySystemAccessEvent> {
  return observableDefer<Observable<IFoundMediaKeySystemAccessEvent>>(() => {
    const currentState = currentMediaKeysInfos.getState(mediaElement);
    if (currentState) {
      // Fast way to find a compatible keySystem if the currently loaded
      // one as exactly the same compatibility options.
      const cachedKeySystemAccess =
        checkCachedMediaKeySystemAccess(keySystemsConfigs,
                                        currentState.mediaKeySystemAccess,
                                        currentState.keySystemOptions);
      if (cachedKeySystemAccess) {
        log.debug("EME: Found cached compatible keySystem", cachedKeySystemAccess);
        return observableOf({
          type: "reuse-media-key-system-access" as "reuse-media-key-system-access",
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
          }
          );
        }
        else {
          const keyName = findKeySystemCanonicalName(keySystemOptions.type) || "";
          const keyType = keySystemOptions.type;
          ksType = [{ keyName, keyType, keySystemOptions }];
        }

        return arr.concat(ksType);
      }
      , []);

    return new Observable((obs) => {
      let disposed = false;
      let sub: Subscription|null;

      /**
       * Test the key system as defined in keySystemsType[index].
       * @param {Number} index
       */
      function testKeySystem(index: number) : void {
        // completely quit the loop if unsubscribed
        if (disposed) {
          return;
        }

        // if we iterated over the whole keySystemsType Array, quit on error
        if (index >= keySystemsType.length) {
          obs.error(new EncryptedMediaError("INCOMPATIBLE_KEYSYSTEMS",
                                            "No key system compatible with your " +
                                            "wanted configuration has been found " +
                                            "in the current browser."));
          return;
        }

        const { keyName, keyType, keySystemOptions } = keySystemsType[index];

        const keySystemConfigurations =
        buildKeySystemConfigurations(keyName, keySystemOptions);

        log.debug(`EME: Request keysystem access ${keyType},` +
                  `${index + 1} of ${keySystemsType.length}`,
                  keySystemConfigurations);

        if (requestMediaKeySystemAccess == null) {
          throw new Error("requestMediaKeySystemAccess is not " +
                          "implemented in your browser.");
        }

        sub = requestMediaKeySystemAccess(keyType, keySystemConfigurations)
          .subscribe((keySystemAccess) => {
            log.info("EME: Found compatible keysystem", keyType, keySystemConfigurations);
            obs.next({ type: "create-media-key-system-access",
                       value: { options: keySystemOptions,
                                mediaKeySystemAccess: keySystemAccess },
                      });
            obs.complete();
          },
          () => {
            log.debug("EME: Rejected access to keysystem",
                      keyType,
                      keySystemConfigurations);
            sub = null;
            testKeySystem(index + 1);
          });
      }

      testKeySystem(0);

      return () => {
        disposed = true;
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  });
}
