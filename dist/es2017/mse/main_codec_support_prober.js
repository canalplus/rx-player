import isCodecSupported from "../compat/is_codec_supported";
/**
 * Maximum size the `MainCodecSupportProber`'s inner cache can be.
 */
const MAX_CODEC_CACHE_SIZE = 50;
/**
 * Class allowing to check for mimeType + codec support when MSE API are
 * available in the current environment.
 *
 * In that environment, codec support can always be requested synchronously and
 * is relatively cheap.
 * @class {MainCodecSupportProber}
 */
class MainCodecSupportProber {
    constructor() {
        this._cachedCodecSupport = new Map();
    }
    /**
     * Probe for the support of the given mime-type and codec combination.
     * @param {string} mimeType
     * @param {string} codec
     * @returns {boolean}
     */
    isSupported(mimeType, codec) {
        const mimeTypeStr = `${mimeType !== null && mimeType !== void 0 ? mimeType : ""};codecs="${codec !== null && codec !== void 0 ? codec : ""}"`;
        const knownSupport = this._cachedCodecSupport.get(mimeTypeStr);
        if (knownSupport !== undefined) {
            return knownSupport;
        }
        if (this._cachedCodecSupport.size >= MAX_CODEC_CACHE_SIZE) {
            // For simplicity, just clear everything here, we don't care that much
            // about implementing a true LRU cache here
            this._cachedCodecSupport.clear();
        }
        const isSupported = isCodecSupported(mimeTypeStr);
        this._cachedCodecSupport.set(mimeTypeStr, isSupported);
        return isSupported;
    }
}
const mainCodecSupportProber = new MainCodecSupportProber();
export default mainCodecSupportProber;
