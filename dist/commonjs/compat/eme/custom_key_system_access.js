"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Simple implementation of the MediaKeySystemAccess EME API.
 *
 * All needed arguments are given to the constructor
 * @class CustomMediaKeySystemAccess
 */
var CustomMediaKeySystemAccess = /** @class */ (function () {
    /**
     * @param {string} _keyType - type of key system (e.g. "widevine" or
     * "com.widevine.alpha").
     * @param {Object} _mediaKeys - MediaKeys implementation
     * @param {Object} _configuration - Configuration accepted for this
     * MediaKeySystemAccess.
     */
    function CustomMediaKeySystemAccess(_keyType, _mediaKeys, _configuration) {
        this._keyType = _keyType;
        this._mediaKeys = _mediaKeys;
        this._configuration = _configuration;
    }
    Object.defineProperty(CustomMediaKeySystemAccess.prototype, "keySystem", {
        /**
         * @returns {string} - current key system type (e.g. "widevine" or
         * "com.widevine.alpha").
         */
        get: function () {
            return this._keyType;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @returns {Promise.<Object>} - Promise wrapping the MediaKeys for this
     * MediaKeySystemAccess. Never rejects.
     */
    CustomMediaKeySystemAccess.prototype.createMediaKeys = function () {
        var _this = this;
        return new Promise(function (res) { return res(_this._mediaKeys); });
    };
    /**
     * @returns {Object} - Configuration accepted for this MediaKeySystemAccess.
     */
    CustomMediaKeySystemAccess.prototype.getConfiguration = function () {
        return this._configuration;
    };
    return CustomMediaKeySystemAccess;
}());
exports.default = CustomMediaKeySystemAccess;
