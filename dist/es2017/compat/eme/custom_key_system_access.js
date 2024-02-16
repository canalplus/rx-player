/**
 * Simple implementation of the MediaKeySystemAccess EME API.
 *
 * All needed arguments are given to the constructor
 * @class CustomMediaKeySystemAccess
 */
export default class CustomMediaKeySystemAccess {
    /**
     * @param {string} _keyType - type of key system (e.g. "widevine" or
     * "com.widevine.alpha").
     * @param {Object} _mediaKeys - MediaKeys implementation
     * @param {Object} _configuration - Configuration accepted for this
     * MediaKeySystemAccess.
     */
    constructor(_keyType, _mediaKeys, _configuration) {
        this._keyType = _keyType;
        this._mediaKeys = _mediaKeys;
        this._configuration = _configuration;
    }
    /**
     * @returns {string} - current key system type (e.g. "widevine" or
     * "com.widevine.alpha").
     */
    get keySystem() {
        return this._keyType;
    }
    /**
     * @returns {Promise.<Object>} - Promise wrapping the MediaKeys for this
     * MediaKeySystemAccess. Never rejects.
     */
    createMediaKeys() {
        return new Promise((res) => res(this._mediaKeys));
    }
    /**
     * @returns {Object} - Configuration accepted for this MediaKeySystemAccess.
     */
    getConfiguration() {
        return this._configuration;
    }
}
