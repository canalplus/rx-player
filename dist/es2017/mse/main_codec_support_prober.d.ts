import type { ICodecSupportProber } from "./types";
/**
 * Class allowing to check for mimeType + codec support when MSE API are
 * available in the current environment.
 *
 * In that environment, codec support can always be requested synchronously and
 * is relatively cheap.
 * @class {MainCodecSupportProber}
 */
declare class MainCodecSupportProber implements ICodecSupportProber {
    /**
     * Small cache keeping the result of codec support checks for the last one
     * requested.
     */
    private _cachedCodecSupport;
    constructor();
    /**
     * Probe for the support of the given mime-type and codec combination.
     * @param {string} mimeType
     * @param {string} codec
     * @returns {boolean}
     */
    isSupported(mimeType: string, codec: string): boolean;
}
declare const mainCodecSupportProber: MainCodecSupportProber;
export default mainCodecSupportProber;
