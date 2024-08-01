"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("../../errors");
var assert_1 = require("../../utils/assert");
var global_scope_1 = require("../../utils/global_scope");
var is_node_1 = require("../../utils/is_node");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var browser_detection_1 = require("../browser_detection");
var event_listeners_1 = require("../event_listeners");
var should_favour_custom_safari_EME_1 = require("../should_favour_custom_safari_EME");
var custom_key_system_access_1 = require("./custom_key_system_access");
var ie11_media_keys_1 = require("./custom_media_keys/ie11_media_keys");
var moz_media_keys_constructor_1 = require("./custom_media_keys/moz_media_keys_constructor");
var old_webkit_media_keys_1 = require("./custom_media_keys/old_webkit_media_keys");
var webkit_media_keys_1 = require("./custom_media_keys/webkit_media_keys");
var webkit_media_keys_constructor_1 = require("./custom_media_keys/webkit_media_keys_constructor");
/**
 * Automatically detect and set which EME implementation should be used in the
 * current platform.
 *
 * You can call `getEmeApiImplementation` for a different implementation.
 */
var defaultEmeImplementation = getEmeApiImplementation("auto");
exports.default = defaultEmeImplementation;
/**
 * Returns the current EME implementation based on what's present on the device
 * and the given preference.
 * @param {string} preferredApiType - EME API preference
 * (@see IPreferredEmeApiType).
 * @returns {Object}
 */
function getEmeApiImplementation(preferredApiType) {
    var _a;
    var requestMediaKeySystemAccess;
    var onEncrypted;
    var setMediaKeys = defaultSetMediaKeys;
    var implementation;
    if ((preferredApiType === "standard" ||
        (preferredApiType === "auto" && !(0, should_favour_custom_safari_EME_1.default)())) &&
        // eslint-disable-next-line @typescript-eslint/unbound-method
        (is_node_1.default || !(0, is_null_or_undefined_1.default)(navigator.requestMediaKeySystemAccess))) {
        requestMediaKeySystemAccess = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return navigator.requestMediaKeySystemAccess.apply(navigator, __spreadArray([], __read(args), false));
        };
        onEncrypted = (0, event_listeners_1.createCompatibleEventListener)(["encrypted"]);
        implementation = "standard";
    }
    else {
        var isTypeSupported_1;
        var createCustomMediaKeys_1;
        if (preferredApiType === "webkit" && webkit_media_keys_constructor_1.WebKitMediaKeysConstructor !== undefined) {
            onEncrypted = (0, event_listeners_1.createCompatibleEventListener)(["needkey"]);
            var callbacks = (0, webkit_media_keys_1.default)();
            isTypeSupported_1 = callbacks.isTypeSupported;
            createCustomMediaKeys_1 = callbacks.createCustomMediaKeys;
            setMediaKeys = callbacks.setMediaKeys;
            implementation = "webkit";
        }
        else {
            // This is for Chrome with unprefixed EME api
            if ((0, old_webkit_media_keys_1.isOldWebkitMediaElement)((_a = global_scope_1.default.HTMLVideoElement) === null || _a === void 0 ? void 0 : _a.prototype)) {
                onEncrypted = (0, event_listeners_1.createCompatibleEventListener)(["needkey"]);
                var callbacks = (0, old_webkit_media_keys_1.default)();
                isTypeSupported_1 = callbacks.isTypeSupported;
                createCustomMediaKeys_1 = callbacks.createCustomMediaKeys;
                setMediaKeys = callbacks.setMediaKeys;
                implementation = "older-webkit";
                // This is for WebKit with prefixed EME api
            }
            else if (webkit_media_keys_constructor_1.WebKitMediaKeysConstructor !== undefined) {
                onEncrypted = (0, event_listeners_1.createCompatibleEventListener)(["needkey"]);
                var callbacks = (0, webkit_media_keys_1.default)();
                isTypeSupported_1 = callbacks.isTypeSupported;
                createCustomMediaKeys_1 = callbacks.createCustomMediaKeys;
                setMediaKeys = callbacks.setMediaKeys;
                implementation = "webkit";
            }
            else if (browser_detection_1.isIE11 && ie11_media_keys_1.MSMediaKeysConstructor !== undefined) {
                onEncrypted = (0, event_listeners_1.createCompatibleEventListener)(["encrypted", "needkey"]);
                var callbacks = (0, ie11_media_keys_1.default)();
                isTypeSupported_1 = callbacks.isTypeSupported;
                createCustomMediaKeys_1 = callbacks.createCustomMediaKeys;
                setMediaKeys = callbacks.setMediaKeys;
                implementation = "ms";
            }
            else if (moz_media_keys_constructor_1.MozMediaKeysConstructor !== undefined) {
                onEncrypted = (0, event_listeners_1.createCompatibleEventListener)(["encrypted", "needkey"]);
                var callbacks = (0, moz_media_keys_constructor_1.default)();
                isTypeSupported_1 = callbacks.isTypeSupported;
                createCustomMediaKeys_1 = callbacks.createCustomMediaKeys;
                setMediaKeys = callbacks.setMediaKeys;
                implementation = "moz";
            }
            else {
                onEncrypted = (0, event_listeners_1.createCompatibleEventListener)(["encrypted", "needkey"]);
                var MK_1 = global_scope_1.default.MediaKeys;
                var checkForStandardMediaKeys_1 = function () {
                    if (MK_1 === undefined) {
                        throw new errors_1.MediaError("MEDIA_KEYS_NOT_SUPPORTED", "No `MediaKeys` implementation found " + "in the current browser.");
                    }
                    if (typeof MK_1.isTypeSupported === "undefined") {
                        var message = "This browser seems to be unable to play encrypted " +
                            "contents currently." +
                            "Note: Some browsers do not allow decryption " +
                            "in some situations, like when not using HTTPS.";
                        throw new Error(message);
                    }
                };
                isTypeSupported_1 = function (keyType) {
                    checkForStandardMediaKeys_1();
                    (0, assert_1.default)(typeof MK_1.isTypeSupported === "function");
                    return MK_1.isTypeSupported(keyType);
                };
                createCustomMediaKeys_1 = function (keyType) {
                    checkForStandardMediaKeys_1();
                    return new MK_1(keyType);
                };
                implementation = "unknown";
            }
        }
        requestMediaKeySystemAccess = function (keyType, keySystemConfigurations) {
            if (!isTypeSupported_1(keyType)) {
                return Promise.reject(new Error("Unsupported key type"));
            }
            for (var i = 0; i < keySystemConfigurations.length; i++) {
                var keySystemConfiguration = keySystemConfigurations[i];
                var videoCapabilities = keySystemConfiguration.videoCapabilities, audioCapabilities = keySystemConfiguration.audioCapabilities, initDataTypes = keySystemConfiguration.initDataTypes, distinctiveIdentifier = keySystemConfiguration.distinctiveIdentifier;
                var supported = true;
                supported =
                    supported &&
                        ((0, is_null_or_undefined_1.default)(initDataTypes) ||
                            initDataTypes.some(function (idt) { return idt === "cenc"; }));
                supported = supported && distinctiveIdentifier !== "required";
                if (supported) {
                    var keySystemConfigurationResponse = {
                        initDataTypes: ["cenc"],
                        distinctiveIdentifier: "not-allowed",
                        persistentState: "required",
                        sessionTypes: ["temporary", "persistent-license"],
                    };
                    if (videoCapabilities !== undefined) {
                        keySystemConfigurationResponse.videoCapabilities = videoCapabilities;
                    }
                    if (audioCapabilities !== undefined) {
                        keySystemConfigurationResponse.audioCapabilities = audioCapabilities;
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    var customMediaKeys = createCustomMediaKeys_1(keyType);
                    return Promise.resolve(new custom_key_system_access_1.default(keyType, customMediaKeys, keySystemConfigurationResponse));
                }
            }
            return Promise.reject(new Error("Unsupported configuration"));
        };
    }
    return {
        requestMediaKeySystemAccess: requestMediaKeySystemAccess,
        onEncrypted: onEncrypted,
        setMediaKeys: setMediaKeys,
        implementation: implementation,
    };
}
/**
 * Set the given MediaKeys on the given HTMLMediaElement.
 * Emits null when done then complete.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Promise}
 */
function defaultSetMediaKeys(elt, mediaKeys) {
    try {
        var ret = void 0;
        /* eslint-disable @typescript-eslint/unbound-method */
        if (typeof elt.setMediaKeys === "function") {
            ret = elt.setMediaKeys(mediaKeys);
        }
        /* eslint-enable @typescript-eslint/unbound-method */
        // If we get in the following code, it means that no compat case has been
        // found and no standard setMediaKeys API exists. This case is particulary
        // rare. We will try to call each API with native media keys.
        else if (typeof elt.webkitSetMediaKeys === "function") {
            ret = elt.webkitSetMediaKeys(mediaKeys);
        }
        else if (typeof elt.mozSetMediaKeys === "function") {
            ret = elt.mozSetMediaKeys(mediaKeys);
        }
        else if (typeof elt.msSetMediaKeys === "function" && mediaKeys !== null) {
            ret = elt.msSetMediaKeys(mediaKeys);
        }
        if (typeof ret === "object" &&
            ret !== null &&
            typeof ret.then === "function") {
            return ret;
        }
        else {
            return Promise.resolve(ret);
        }
    }
    catch (err) {
        return Promise.reject(err);
    }
}
