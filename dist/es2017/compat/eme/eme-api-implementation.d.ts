import type { CancellationSignal } from "../../utils/task_canceller";
import type { IMediaElement } from "../browser_compatibility_types";
import type { IEventTargetLike } from "../event_listeners";
import CustomMediaKeySystemAccess from "./custom_key_system_access";
import type { ICustomMediaKeys } from "./custom_media_keys/types";
/**
 * Automatically detect and set which EME implementation should be used in the
 * current platform.
 *
 * You can call `getEmeApiImplementation` for a different implementation.
 */
declare const defaultEmeImplementation: IEmeApiImplementation;
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
    requestMediaKeySystemAccess: (keyType: string, config: MediaKeySystemConfiguration[]) => Promise<MediaKeySystemAccess | CustomMediaKeySystemAccess>;
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
    onEncrypted: (target: IEventTargetLike, listener: (evt: unknown) => void, cancelSignal: CancellationSignal) => void;
    /**
     * API allowing to attach a `MediaKeys` instance (or an `ICustomMediaKeys`) to
     * the HTMLMediaElement so it can start decoding.
     * @param {HTMLMediaElement} The HTMLMediaElement on which the content plays.
     * @param {MediaKeys} mediaKeys - The MediaKeys instance to attach.
     * @returns {Promise} - That promise resolves if the `MediaKeys` instance was
     * attached to the `HTMLMediaElement` with success, or rejects on the opposite
     * scenario.
     */
    setMediaKeys: (mediaElement: IMediaElement, mediaKeys: MediaKeys | ICustomMediaKeys | null) => Promise<unknown>;
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
//# sourceMappingURL=eme-api-implementation.d.ts.map