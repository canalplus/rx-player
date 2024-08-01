import type { IMediaElement } from "../browser_compatibility_types";
import type { ICustomMediaKeys } from "./custom_media_keys";
import type { IEmeApiImplementation } from "./eme-api-implementation";
/**
 * @param {Object} emeImplementation
 * @param {Object} mediaElement
 * @param {Object|null} mediaKeys
 * @returns {Promise}
 */
export declare function setMediaKeys(emeImplementation: IEmeApiImplementation, mediaElement: IMediaElement, mediaKeys: MediaKeys | ICustomMediaKeys | null): Promise<unknown>;
//# sourceMappingURL=set_media_keys.d.ts.map