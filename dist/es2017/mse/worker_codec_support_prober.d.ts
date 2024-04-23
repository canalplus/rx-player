import type { ICodecSupportProber } from "./types";
/**
 * Class allowing to check for mimeType + codec support in a WebWorker
 * environment where MSE API are not available.
 * @class {WorkerCodecSupportProber}
 */
declare class WorkerCodecSupportProber implements ICodecSupportProber {
    /**
     * Current size of the `_cachedCodecSupport` size.
     * We cannot rely on `_cachedCodecSupport.size` directly as it is a Map of
     * Maps.
     */
    private _currentCacheSize;
    /**
     * Small cache keeping the result of codec support checks for the last one
     * requested.
     * The first key is the mime-type, the second is the codec.
     */
    private _cachedCodecSupport;
    constructor();
    /**
     * Probe for the support of the given mime-type and codec combination.
     *
     * Only returns a boolean if the support was added to this
     * `WorkerCodecSupportProber`'s cache (through the `updateCache` method).
     * @param {string} mimeType
     * @param {string} codec
     * @returns {boolean|undefined}
     */
    isSupported(mimeType: string, codec: string): boolean | undefined;
    /**
     * Add an entry into the `WorkerCodecSupportProber`'s cache, so that it can
     * synchronously determine, through the `isSupported` method, whether a codec
     * and mimetype combination is currently supported.
     * @param {string} mimeType
     * @param {string} codec
     * @param {boolean} isSupported
     */
    updateCache(mimeType: string, codec: string, isSupported: boolean): void;
}
declare const _default: WorkerCodecSupportProber;
export default _default;
