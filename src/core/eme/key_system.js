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

import { Observable } from "rxjs/Observable";

import config from "../../config.js";
import log from "../../utils/log";
import {
  KeySystemAccess,
  requestMediaKeySystemAccess,
  shouldRenewMediaKeys,
} from "../../compat";

import {
  EncryptedMediaError,
} from "../../errors";

const {
  EME_DEFAULT_WIDEVINE_ROBUSTNESSES,
  EME_KEY_SYSTEMS,
} = config;

function getCachedKeySystemAccess(keySystems, instanceInfos = {}) {
  const {
    $keySystem,
    $mediaKeys,
    $mediaKeySystemConfiguration,
  }  = instanceInfos;

  // NOTE(pierre): alwaysRenew flag is used for IE11 which require the
  // creation of a new MediaKeys instance for each session creation
  if (!$keySystem || !$mediaKeys || shouldRenewMediaKeys()) {
    return null;
  }

  const configuration = $mediaKeySystemConfiguration;
  const foundKeySystem = keySystems.filter((ks) => {
    if (ks.type !== $keySystem.type) {
      return false;
    }

    if (ks.persistentLicense &&
        configuration.persistentState != "required") {
      return false;
    }

    if (ks.distinctiveIdentifierRequired &&
        configuration.distinctiveIdentifier != "required") {
      return false;
    }

    return true;
  })[0];

  if (foundKeySystem) {
    return {
      keySystem: foundKeySystem,
      keySystemAccess: new KeySystemAccess(
        $keySystem,
        $mediaKeys,
        $mediaKeySystemConfiguration),
    };
  }
  else {
    return null;
  }
}

/**
 * Build configuration for the requestMediaKeySystemAccess EME API, based
 * on the current keySystem object.
 * @param {Object} keySystem
 * @param {Boolean} [keySystem.persistentLicense]
 * @param {Boolean} [keySystem.persistentStateRequired]
 * @param {Boolean} [keySystem.distinctiveIdentifierRequired]
 * @returns {Array.<Object>} - Configuration to give to the
 * requestMediaKeySystemAccess API.
 */
function buildKeySystemConfigurations(keySystem) {
  const sessionTypes = ["temporary"];
  let persistentState = "optional";
  let distinctiveIdentifier = "optional";

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

  // TODO Widevine robustnesses should only be indicated for... Widevine-based
  // encryption
  const videoRobustnesses = keySystem.videoRobustnesses ||
    EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
  const audioRobustnesses = keySystem.audioRobustnesses ||
    EME_DEFAULT_WIDEVINE_ROBUSTNESSES;

  // From the W3 EME spec, we have to provide videoCapabilities and
  // audioCapabilities.
  // These capabilities must specify a codec (even though your stream can use
  // a completely different codec afterward).
  // It is also strongly recommended to specify the required security
  // robustness. As we do not want to forbide any security level, we specify
  // every existing security level from highest to lowest so that the best
  // security level is selected.
  // More details here:
  // https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf
  // https://www.w3.org/TR/encrypted-media/#get-supported-configuration-and-consent
  const videoCapabilities = videoRobustnesses.map(robustness => ({
    contentType: "video/mp4; codecs=\"avc1.42E01E\"", // standard mp4 codec
    robustness,
  }));

  const audioCapabilities = audioRobustnesses.map(robustness => ({
    contentType: "audio/mp4;codecs=\"mp4a.40.2\"", // standard mp4 codec
    robustness,
  }));

  const basicVideoCapabilities = [
    { contentType: "video/mp4; codecs=\"avc1.42E01E\"" },
    { contentType: "video/webm; codecs=\"vp8\"" },
  ];

  const basicConfig = {
    videoCapabilities: basicVideoCapabilities,
  };

  const offlineConfig = {
    videoCapabilities: basicVideoCapabilities,
    persistentState: "required",
    sessionTypes: ["persistent-license"],
  };

  return [
    {
      label: "",
      initDataTypes: ["cenc"],
      videoCapabilities,
      audioCapabilities,
      distinctiveIdentifier,
      persistentState,
    }, {
    // add another with no {audio,video}Capabilities for some legacy browsers.
    // As of today's spec, this should return NotSupported but the first
    // candidate configuration should be good, so whe should have no downside
    // doing that.
      label: "",
      initDataTypes: ["cenc"],
      videoCapabilities: undefined,
      audioCapabilities: undefined,
      distinctiveIdentifier,
      persistentState,
    },
    offlineConfig,
    basicConfig
  ];
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
 * @returns {Observable}
 */
function findCompatibleKeySystem(keySystems, instanceInfos) {
  // Fast way to find a compatible keySystem if the currently loaded
  // one as exactly the same compatibility options.
  const cachedKeySystemAccess =
    getCachedKeySystemAccess(keySystems, instanceInfos);
  if (cachedKeySystemAccess) {
    log.debug("eme: found compatible keySystem quickly", cachedKeySystemAccess);
    return Observable.of(cachedKeySystemAccess);
  }

  /**
   * Array of set keySystems for this content.
   * Each item of this array is an object containing two keys:
   *   - keyType {string}: keySystem type
   *   - keySystem {Object}: the original keySystem object
   * @type {Array.<Object>}
   */
  const keySystemsType = keySystems.reduce(
    (arr, keySystem) =>
      arr.concat(
        (EME_KEY_SYSTEMS[keySystem.type] || [])
          .map((keyType) => ({ keyType, keySystem }))
      )
    , []);

  return Observable.create((obs) => {
    let disposed = false;
    let sub = null;

    /**
     * Test the key system as defined in keySystemsType[index].
     * @param {Number} index
     */
    function testKeySystem(index) {
      // completely quit the loop if unsubscribed
      if (disposed) {
        return;
      }
      // if we iterated over the whole keySystemsType Array, quit on error
      if (index >= keySystemsType.length) {
        obs.error(new EncryptedMediaError("INCOMPATIBLE_KEYSYSTEMS", null, true));
        return;
      }

      const { keyType, keySystem } = keySystemsType[index];
      const keySystemConfigurations =
        buildKeySystemConfigurations(keySystem);

      log.debug(
        `eme: request keysystem access ${keyType},` +
        `${index+1} of ${keySystemsType.length}`,
        keySystemConfigurations
      );

      sub = requestMediaKeySystemAccess(keyType, keySystemConfigurations)
        .subscribe(
          (keySystemAccess) => {
            log.info("eme: found compatible keysystem", keyType, keySystemConfigurations);
            obs.next({ keySystem, keySystemAccess });
            obs.complete();
          },
          () => {
            log.debug("eme: rejected access to keysystem", keyType, keySystemConfigurations);
            sub = null;
            testKeySystem(index + 1);
          }
        );
    }

    testKeySystem(0);

    return () => {
      disposed = true;
      if (sub) {
        sub.unsubscribe();
      }
    };
  });
}

function getKeySystem(instanceInfos = {}) {
  return instanceInfos.$keySystem && instanceInfos.$keySystem.type;
}

export {
  findCompatibleKeySystem,
  getKeySystem,
};

export default findCompatibleKeySystem;
