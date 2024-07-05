import { MediaError } from "../../errors";
import assert from "../../utils/assert";
import globalScope from "../../utils/global_scope";
import isNode from "../../utils/is_node";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import type { CancellationSignal } from "../../utils/task_canceller";
import type {
  IMediaElement,
  IMediaKeySystemAccess,
  IMediaKeys,
} from "../browser_compatibility_types";
import { isIE11 } from "../browser_detection";
import type { IEventTargetLike } from "../event_listeners";
import { createCompatibleEventListener } from "../event_listeners";
import shouldFavourCustomSafariEME from "../should_favour_custom_safari_EME";
import CustomMediaKeySystemAccess from "./custom_key_system_access";
import getIE11MediaKeysCallbacks, {
  MSMediaKeysConstructor,
} from "./custom_media_keys/ie11_media_keys";
import getMozMediaKeysCallbacks, {
  MozMediaKeysConstructor,
} from "./custom_media_keys/moz_media_keys_constructor";
import getOldKitWebKitMediaKeyCallbacks, {
  isOldWebkitMediaElement,
} from "./custom_media_keys/old_webkit_media_keys";
import getWebKitMediaKeysCallbacks from "./custom_media_keys/webkit_media_keys";
import { WebKitMediaKeysConstructor } from "./custom_media_keys/webkit_media_keys_constructor";

/**
 * Automatically detect and set which EME implementation should be used in the
 * current platform.
 *
 * You can call `getEmeApiImplementation` for a different implementation.
 */
const defaultEmeImplementation = getEmeApiImplementation("auto");

export default defaultEmeImplementation;

/**
 * Generic interface harmonizing the structure of the different EME API
 * implementations the RxPlayer could use.
 */
export interface IEmeApiImplementation {
  /**
   * API implementing the `navigator.requestMediaKeySystemAccess` static method
   * from EME.
   * @param {string} keyType - Key system name, as a reverse domain name.
   * @param {Array.<MediaKeySystemMediaCapability>} Wanted configurations, from
   * the most wanted to the least.
   * @returns {Promise}
   */
  requestMediaKeySystemAccess: (
    keyType: string,
    config: MediaKeySystemConfiguration[],
  ) => Promise<IMediaKeySystemAccess | CustomMediaKeySystemAccess>;

  /**
   * API allowing to listen for `"encrypted"` events, presumably sent by the
   * HTMLMediaElement on which encrypted content is pushed.
   * @param {EventTarget} The element on which the event will be listened to.
   * Generally it is the HTMLMediaElement.
   * @param {Function} listener - The event listener on which that event's
   * payload will be dispatched.
   * @param {Object} cancelSignal - The event listener will be removed once that
   * `CancellationSignal` emits.
   */
  onEncrypted: (
    target: IEventTargetLike,
    listener: (evt: unknown) => void,
    cancelSignal: CancellationSignal,
  ) => void;

  /**
   * API allowing to attach a `MediaKeys` instance (or an `IMediaKeys`) to
   * the HTMLMediaElement so it can start decoding.
   * @param {HTMLMediaElement} The HTMLMediaElement on which the content plays.
   * @param {MediaKeys} mediaKeys - The MediaKeys instance to attach.
   * @returns {Promise} - That promise resolves if the `MediaKeys` instance was
   * attached to the `HTMLMediaElement` with success, or rejects on the opposite
   * scenario.
   */
  setMediaKeys: (
    mediaElement: IMediaElement,
    mediaKeys: IMediaKeys | null,
  ) => Promise<unknown>;

  /**
   * String describing the currently used EME implementation:
   *
   *   - "standard": regular EME implementation
   *
   *   - "webkit": The webkit-prefixed variant of the EME API
   *
   *   - "older-webkit": An even older webkit-prefixed variant of the EME API
   *
   *   - "ms": The ms-prefixed variant of the EME API
   *
   *   - "moz": The moz-prefixed variant of the EME API
   *
   *   - "unknown": An unidentified variant of the EME API
   */
  implementation: "standard" | "webkit" | "older-webkit" | "ms" | "moz" | "unknown";
}

/**
 * Union of all the different value the preferred EME API type can be set to:
 *
 *   - "auto": The implementation will be chosen automatically based on what
 *     we've most confidence on on the current device.
 *
 *   - "standard": If present, the standard EME API will be given precedence
 *     over custom and browser-specific ones.
 *
 *   - "webkit": The webkit-prefixed variant of the EME API will be given
 *     precedence over any other one if present.
 *
 */
export type IPreferredEmeApiType = "auto" | "standard" | "webkit";

/**
 * Returns the current EME implementation based on what's present on the device
 * and the given preference.
 * @param {string} preferredApiType - EME API preference
 * (@see IPreferredEmeApiType).
 * @returns {Object}
 */
function getEmeApiImplementation(
  preferredApiType: IPreferredEmeApiType,
): IEmeApiImplementation {
  let requestMediaKeySystemAccess: IEmeApiImplementation["requestMediaKeySystemAccess"];
  let onEncrypted: IEmeApiImplementation["onEncrypted"];
  let setMediaKeys: IEmeApiImplementation["setMediaKeys"] = defaultSetMediaKeys;
  let implementation: IEmeApiImplementation["implementation"];
  if (
    (preferredApiType === "standard" ||
      (preferredApiType === "auto" && !shouldFavourCustomSafariEME())) &&
    // eslint-disable-next-line @typescript-eslint/unbound-method
    (isNode || !isNullOrUndefined(navigator.requestMediaKeySystemAccess))
  ) {
    requestMediaKeySystemAccess = (...args) =>
      navigator.requestMediaKeySystemAccess(...args);
    onEncrypted = createCompatibleEventListener(["encrypted"]);
    implementation = "standard";
  } else {
    let isTypeSupported: (keyType: string) => boolean;
    let createCustomMediaKeys: (keyType: string) => IMediaKeys;

    if (preferredApiType === "webkit" && WebKitMediaKeysConstructor !== undefined) {
      onEncrypted = createCompatibleEventListener(["needkey"]);
      const callbacks = getWebKitMediaKeysCallbacks();
      isTypeSupported = callbacks.isTypeSupported;
      createCustomMediaKeys = callbacks.createCustomMediaKeys;
      setMediaKeys = callbacks.setMediaKeys;
      implementation = "webkit";
    } else {
      // This is for Chrome with unprefixed EME api
      if (isOldWebkitMediaElement(globalScope.HTMLVideoElement?.prototype)) {
        onEncrypted = createCompatibleEventListener(["needkey"]);
        const callbacks = getOldKitWebKitMediaKeyCallbacks();
        isTypeSupported = callbacks.isTypeSupported;
        createCustomMediaKeys = callbacks.createCustomMediaKeys;
        setMediaKeys = callbacks.setMediaKeys;
        implementation = "older-webkit";
        // This is for WebKit with prefixed EME api
      } else if (WebKitMediaKeysConstructor !== undefined) {
        onEncrypted = createCompatibleEventListener(["needkey"]);
        const callbacks = getWebKitMediaKeysCallbacks();
        isTypeSupported = callbacks.isTypeSupported;
        createCustomMediaKeys = callbacks.createCustomMediaKeys;
        setMediaKeys = callbacks.setMediaKeys;
        implementation = "webkit";
      } else if (isIE11 && MSMediaKeysConstructor !== undefined) {
        onEncrypted = createCompatibleEventListener(["encrypted", "needkey"]);
        const callbacks = getIE11MediaKeysCallbacks();
        isTypeSupported = callbacks.isTypeSupported;
        createCustomMediaKeys = callbacks.createCustomMediaKeys;
        setMediaKeys = callbacks.setMediaKeys;
        implementation = "ms";
      } else if (MozMediaKeysConstructor !== undefined) {
        onEncrypted = createCompatibleEventListener(["encrypted", "needkey"]);
        const callbacks = getMozMediaKeysCallbacks();
        isTypeSupported = callbacks.isTypeSupported;
        createCustomMediaKeys = callbacks.createCustomMediaKeys;
        setMediaKeys = callbacks.setMediaKeys;
        implementation = "moz";
      } else {
        onEncrypted = createCompatibleEventListener(["encrypted", "needkey"]);
        const MK = globalScope.MediaKeys as unknown as typeof MediaKeys & {
          isTypeSupported?: (keyType: string) => boolean;
          new (keyType?: string): IMediaKeys;
        };
        const checkForStandardMediaKeys = () => {
          if (MK === undefined) {
            throw new MediaError(
              "MEDIA_KEYS_NOT_SUPPORTED",
              "No `MediaKeys` implementation found " + "in the current browser.",
            );
          }
          if (typeof MK.isTypeSupported === "undefined") {
            const message =
              "This browser seems to be unable to play encrypted " +
              "contents currently." +
              "Note: Some browsers do not allow decryption " +
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
        implementation = "unknown";
      }
    }

    requestMediaKeySystemAccess = function (
      keyType: string,
      keySystemConfigurations: MediaKeySystemConfiguration[],
    ): Promise<IMediaKeySystemAccess> {
      if (!isTypeSupported(keyType)) {
        return Promise.reject(new Error("Unsupported key type"));
      }

      for (let i = 0; i < keySystemConfigurations.length; i++) {
        const keySystemConfiguration = keySystemConfigurations[i];
        const {
          videoCapabilities,
          audioCapabilities,
          initDataTypes,
          distinctiveIdentifier,
        } = keySystemConfiguration;
        let supported = true;
        supported =
          supported &&
          (isNullOrUndefined(initDataTypes) ||
            initDataTypes.some((idt) => idt === "cenc"));
        supported = supported && distinctiveIdentifier !== "required";

        if (supported) {
          const keySystemConfigurationResponse: MediaKeySystemConfiguration = {
            initDataTypes: ["cenc"],
            distinctiveIdentifier: "not-allowed" as const,
            persistentState: "required" as const,
            sessionTypes: ["temporary", "persistent-license"],
          };
          if (videoCapabilities !== undefined) {
            keySystemConfigurationResponse.videoCapabilities = videoCapabilities;
          }
          if (audioCapabilities !== undefined) {
            keySystemConfigurationResponse.audioCapabilities = audioCapabilities;
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const customMediaKeys = createCustomMediaKeys(keyType);
          return Promise.resolve(
            new CustomMediaKeySystemAccess(
              keyType,
              customMediaKeys,
              keySystemConfigurationResponse,
            ),
          );
        }
      }

      return Promise.reject(new Error("Unsupported configuration"));
    };
  }
  return {
    requestMediaKeySystemAccess,
    onEncrypted,
    setMediaKeys,
    implementation,
  };
}

/**
 * Set the given MediaKeys on the given HTMLMediaElement.
 * Emits null when done then complete.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Promise}
 */
function defaultSetMediaKeys(
  elt: IMediaElement,
  mediaKeys: IMediaKeys | null,
): Promise<unknown> {
  try {
    let ret: unknown;
    /* eslint-disable-next-line @typescript-eslint/unbound-method */
    if (typeof elt.setMediaKeys === "function") {
      // eslint-disable-next-line @typescript-eslint/ban-types
      ret = elt.setMediaKeys(mediaKeys as MediaKeys);
    }

    // If we get in the following code, it means that no compat case has been
    // found and no standard setMediaKeys API exists. This case is particulary
    // rare. We will try to call each API with native media keys.
    else if (typeof elt.webkitSetMediaKeys === "function") {
      ret = elt.webkitSetMediaKeys(mediaKeys);
    } else if (typeof elt.mozSetMediaKeys === "function") {
      ret = elt.mozSetMediaKeys(mediaKeys);
    } else if (typeof elt.msSetMediaKeys === "function" && mediaKeys !== null) {
      ret = elt.msSetMediaKeys(mediaKeys);
    }

    if (
      typeof ret === "object" &&
      ret !== null &&
      typeof (ret as Promise<unknown>).then === "function"
    ) {
      return ret as Promise<unknown>;
    } else {
      return Promise.resolve(ret);
    }
  } catch (err) {
    return Promise.reject(err);
  }
}
