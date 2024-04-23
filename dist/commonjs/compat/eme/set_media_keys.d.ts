import type { ICustomMediaKeys } from "./custom_media_keys";
import type { IEmeApiImplementation } from "./eme-api-implementation";
/**
 * @param {Object} emeImplementation
 * @param {Object} mediaElement
 * @param {Object|null} mediaKeys
 * @returns {Promise}
 */
export declare function setMediaKeys(emeImplementation: IEmeApiImplementation, mediaElement: HTMLMediaElement, mediaKeys: MediaKeys | ICustomMediaKeys | null): Promise<unknown>;
