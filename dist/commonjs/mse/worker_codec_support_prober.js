"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Maximum size the `WorkerCodecSupportProber`'s inner cache can be.
 */
var MAX_CODEC_CACHE_SIZE = 50;
/**
 * Class allowing to check for mimeType + codec support in a WebWorker
 * environment where MSE API are not available.
 * @class {WorkerCodecSupportProber}
 */
var WorkerCodecSupportProber = /** @class */ (function () {
    function WorkerCodecSupportProber() {
        this._currentCacheSize = 0;
        this._cachedCodecSupport = new Map();
    }
    /**
     * Probe for the support of the given mime-type and codec combination.
     *
     * Only returns a boolean if the support was added to this
     * `WorkerCodecSupportProber`'s cache (through the `updateCache` method).
     * @param {string} mimeType
     * @param {string} codec
     * @returns {boolean|undefined}
     */
    WorkerCodecSupportProber.prototype.isSupported = function (mimeType, codec) {
        var _a;
        var knownSupport = (_a = this._cachedCodecSupport.get(mimeType)) === null || _a === void 0 ? void 0 : _a.get(codec);
        if (knownSupport !== undefined) {
            return knownSupport;
        }
        return undefined;
    };
    /**
     * Add an entry into the `WorkerCodecSupportProber`'s cache, so that it can
     * synchronously determine, through the `isSupported` method, whether a codec
     * and mimetype combination is currently supported.
     * @param {string} mimeType
     * @param {string} codec
     * @param {boolean} isSupported
     */
    WorkerCodecSupportProber.prototype.updateCache = function (mimeType, codec, isSupported) {
        if (this._currentCacheSize >= MAX_CODEC_CACHE_SIZE) {
            // For simplicity, just clear everything here, we don't care that much
            // about implementing a true LRU cache here
            this._cachedCodecSupport.clear();
            this._currentCacheSize = 0;
        }
        var prevCodecMap = this._cachedCodecSupport.get(mimeType);
        if (prevCodecMap !== undefined) {
            prevCodecMap.set(codec, isSupported);
        }
        else {
            var codecMap = new Map();
            codecMap.set(codec, isSupported);
            this._cachedCodecSupport.set(mimeType, codecMap);
        }
    };
    return WorkerCodecSupportProber;
}());
exports.default = new WorkerCodecSupportProber();
