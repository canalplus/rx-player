"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var is_codec_supported_1 = require("../compat/is_codec_supported");
/**
 * Maximum size the `MainCodecSupportProber`'s inner cache can be.
 */
var MAX_CODEC_CACHE_SIZE = 50;
/**
 * Class allowing to check for mimeType + codec support when MSE API are
 * available in the current environment.
 *
 * In that environment, codec support can always be requested synchronously and
 * is relatively cheap.
 * @class {MainCodecSupportProber}
 */
var MainCodecSupportProber = /** @class */ (function () {
    function MainCodecSupportProber() {
        this._cachedCodecSupport = new Map();
    }
    /**
     * Probe for the support of the given mime-type and codec combination.
     * @param {string} mimeType
     * @param {string} codec
     * @returns {boolean}
     */
    MainCodecSupportProber.prototype.isSupported = function (mimeType, codec) {
        var mimeTypeStr = "".concat(mimeType !== null && mimeType !== void 0 ? mimeType : "", ";codecs=\"").concat(codec !== null && codec !== void 0 ? codec : "", "\"");
        var knownSupport = this._cachedCodecSupport.get(mimeTypeStr);
        if (knownSupport !== undefined) {
            return knownSupport;
        }
        if (this._cachedCodecSupport.size >= MAX_CODEC_CACHE_SIZE) {
            // For simplicity, just clear everything here, we don't care that much
            // about implementing a true LRU cache here
            this._cachedCodecSupport.clear();
        }
        var isSupported = (0, is_codec_supported_1.default)(mimeTypeStr);
        this._cachedCodecSupport.set(mimeTypeStr, isSupported);
        return isSupported;
    };
    return MainCodecSupportProber;
}());
var mainCodecSupportProber = new MainCodecSupportProber();
exports.default = mainCodecSupportProber;
