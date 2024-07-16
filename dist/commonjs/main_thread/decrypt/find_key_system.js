"use strict";
/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testKeySystem = void 0;
var can_rely_on_request_media_key_system_access_1 = require("../../compat/can_rely_on_request_media_key_system_access");
var eme_1 = require("../../compat/eme");
var generate_init_data_1 = require("../../compat/generate_init_data");
var should_renew_media_key_system_access_1 = require("../../compat/should_renew_media_key_system_access");
var config_1 = require("../../config");
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var array_includes_1 = require("../../utils/array_includes");
var flat_map_1 = require("../../utils/flat_map");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var media_keys_infos_store_1 = require("./utils/media_keys_infos_store");
/**
 * @param {Array.<Object>} keySystems
 * @param {MediaKeySystemAccess} currentKeySystemAccess
 * @param {Object} currentKeySystemOptions
 * @returns {null|Object}
 */
function checkCachedMediaKeySystemAccess(keySystems, currentKeySystemAccess, currentKeySystemOptions) {
    var mksConfiguration = currentKeySystemAccess.getConfiguration();
    if ((0, should_renew_media_key_system_access_1.default)() || (0, is_null_or_undefined_1.default)(mksConfiguration)) {
        return null;
    }
    var firstCompatibleOption = keySystems.filter(function (ks) {
        // TODO Do it with MediaKeySystemAccess.prototype.keySystem instead
        if (ks.type !== currentKeySystemOptions.type) {
            return false;
        }
        if ((!(0, is_null_or_undefined_1.default)(ks.persistentLicenseConfig) ||
            ks.persistentState === "required") &&
            mksConfiguration.persistentState !== "required") {
            return false;
        }
        if (ks.distinctiveIdentifier === "required" &&
            mksConfiguration.distinctiveIdentifier !== "required") {
            return false;
        }
        return true;
    })[0];
    if (firstCompatibleOption !== undefined) {
        return {
            keySystemOptions: firstCompatibleOption,
            keySystemAccess: currentKeySystemAccess,
        };
    }
    return null;
}
/**
 * Find key system canonical name from key system type.
 * @param {string} ksType - Obtained via inversion
 * @returns {string|undefined} - Either the canonical name, or undefined.
 */
function findKeySystemCanonicalName(ksType) {
    var e_1, _a;
    var EME_KEY_SYSTEMS = config_1.default.getCurrent().EME_KEY_SYSTEMS;
    try {
        for (var _b = __values(Object.keys(EME_KEY_SYSTEMS)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var ksName = _c.value;
            if ((0, array_includes_1.default)(EME_KEY_SYSTEMS[ksName], ksType)) {
                return ksName;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return undefined;
}
/**
 * Build configuration for the requestMediaKeySystemAccess EME API, based
 * on the current keySystem object.
 * @param {Object} keySystemTypeInfo
 * @returns {Array.<Object>} - Configuration to give to the
 * requestMediaKeySystemAccess API.
 */
function buildKeySystemConfigurations(keySystemTypeInfo) {
    var keyName = keySystemTypeInfo.keyName, keyType = keySystemTypeInfo.keyType, keySystem = keySystemTypeInfo.keySystemOptions;
    var sessionTypes = ["temporary"];
    var persistentState = "optional";
    var distinctiveIdentifier = "optional";
    if (!(0, is_null_or_undefined_1.default)(keySystem.persistentLicenseConfig)) {
        persistentState = "required";
        sessionTypes.push("persistent-license");
    }
    if (!(0, is_null_or_undefined_1.default)(keySystem.persistentState)) {
        persistentState = keySystem.persistentState;
    }
    if (!(0, is_null_or_undefined_1.default)(keySystem.distinctiveIdentifier)) {
        distinctiveIdentifier = keySystem.distinctiveIdentifier;
    }
    var _a = config_1.default.getCurrent(), EME_DEFAULT_AUDIO_CODECS = _a.EME_DEFAULT_AUDIO_CODECS, EME_DEFAULT_VIDEO_CODECS = _a.EME_DEFAULT_VIDEO_CODECS, EME_DEFAULT_WIDEVINE_ROBUSTNESSES = _a.EME_DEFAULT_WIDEVINE_ROBUSTNESSES, EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES = _a.EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
    // From the W3 EME spec, we have to provide videoCapabilities and
    // audioCapabilities.
    // These capabilities must specify a codec (even though you can use a
    // completely different codec afterward).
    // It is also strongly recommended to specify the required security
    // robustness. As we do not want to forbide any security level, we specify
    // every existing security level from highest to lowest so that the best
    // security level is selected.
    // More details here:
    // https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf
    // https://www.w3.org/TR/encrypted-media/#get-supported-configuration-and-consent
    var audioCapabilities;
    var videoCapabilities;
    var audioCapabilitiesConfig = keySystem.audioCapabilitiesConfig, videoCapabilitiesConfig = keySystem.videoCapabilitiesConfig;
    if ((audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "full") {
        audioCapabilities = audioCapabilitiesConfig.value;
    }
    else {
        var audioRobustnesses = void 0;
        if ((audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "robustness") {
            audioRobustnesses = audioCapabilitiesConfig.value;
        }
        else if (keyName === "widevine") {
            audioRobustnesses = EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
        }
        else if (keyType === "com.microsoft.playready.recommendation") {
            audioRobustnesses = EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
        }
        else {
            audioRobustnesses = [];
        }
        if (audioRobustnesses.length === 0) {
            audioRobustnesses.push(undefined);
        }
        var audioCodecs_1 = (audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "contentType"
            ? audioCapabilitiesConfig.value
            : EME_DEFAULT_AUDIO_CODECS;
        audioCapabilities = (0, flat_map_1.default)(audioRobustnesses, function (robustness) {
            return audioCodecs_1.map(function (contentType) {
                return robustness !== undefined ? { contentType: contentType, robustness: robustness } : { contentType: contentType };
            });
        });
    }
    if ((videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "full") {
        videoCapabilities = videoCapabilitiesConfig.value;
    }
    else {
        var videoRobustnesses = void 0;
        if ((videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "robustness") {
            videoRobustnesses = videoCapabilitiesConfig.value;
        }
        else if (keyName === "widevine") {
            videoRobustnesses = EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
        }
        else if (keyType === "com.microsoft.playready.recommendation") {
            videoRobustnesses = EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
        }
        else {
            videoRobustnesses = [];
        }
        if (videoRobustnesses.length === 0) {
            videoRobustnesses.push(undefined);
        }
        var videoCodecs_1 = (videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "contentType"
            ? videoCapabilitiesConfig.value
            : EME_DEFAULT_VIDEO_CODECS;
        videoCapabilities = (0, flat_map_1.default)(videoRobustnesses, function (robustness) {
            return videoCodecs_1.map(function (contentType) {
                return robustness !== undefined ? { contentType: contentType, robustness: robustness } : { contentType: contentType };
            });
        });
    }
    var wantedMediaKeySystemConfiguration = {
        initDataTypes: ["cenc"],
        videoCapabilities: videoCapabilities,
        audioCapabilities: audioCapabilities,
        distinctiveIdentifier: distinctiveIdentifier,
        persistentState: persistentState,
        sessionTypes: sessionTypes,
    };
    return [
        wantedMediaKeySystemConfiguration,
        // Some legacy implementations have issues with `audioCapabilities` and
        // `videoCapabilities`, so we're including a supplementary
        // `MediaKeySystemConfiguration` without those properties.
        __assign(__assign({}, wantedMediaKeySystemConfiguration), { audioCapabilities: undefined, videoCapabilities: undefined }),
    ];
}
/**
 * Try to find a compatible key system from the keySystems array given.
 *
 * This function will request a MediaKeySystemAccess based on the various
 * keySystems provided.
 *
 * This Promise might either:
 *   - resolves the MediaKeySystemAccess and the keySystems as an object, when
 *     found.
 *   - reject if no compatible key system has been found.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs - The keySystems you want to test.
 * @param {Object} cancelSignal
 * @returns {Promise.<Object>}
 */
function getMediaKeySystemAccess(mediaElement, keySystemsConfigs, cancelSignal) {
    log_1.default.info("DRM: Searching for compatible MediaKeySystemAccess");
    var currentState = media_keys_infos_store_1.default.getState(mediaElement);
    if (currentState !== null) {
        if (eme_1.default.implementation === currentState.emeImplementation.implementation) {
            // Fast way to find a compatible keySystem if the currently loaded
            // one as exactly the same compatibility options.
            var cachedKeySystemAccess = checkCachedMediaKeySystemAccess(keySystemsConfigs, currentState.mediaKeySystemAccess, currentState.keySystemOptions);
            if (cachedKeySystemAccess !== null) {
                log_1.default.info("DRM: Found cached compatible keySystem");
                return Promise.resolve({
                    type: "reuse-media-key-system-access",
                    value: {
                        mediaKeySystemAccess: cachedKeySystemAccess.keySystemAccess,
                        options: cachedKeySystemAccess.keySystemOptions,
                    },
                });
            }
        }
    }
    /**
     * Array of set keySystems for this content.
     * Each item of this array is an object containing the following keys:
     *   - keyName {string}: keySystem canonical name (e.g. "widevine")
     *   - keyType {string}: keySystem type (e.g. "com.widevine.alpha")
     *   - keySystem {Object}: the original keySystem object
     * @type {Array.<Object>}
     */
    var keySystemsType = keySystemsConfigs.reduce(function (arr, keySystemOptions) {
        var EME_KEY_SYSTEMS = config_1.default.getCurrent().EME_KEY_SYSTEMS;
        var managedRDNs = EME_KEY_SYSTEMS[keySystemOptions.type];
        var ksType;
        if (!(0, is_null_or_undefined_1.default)(managedRDNs)) {
            ksType = managedRDNs.map(function (keyType) {
                var keyName = keySystemOptions.type;
                return { keyName: keyName, keyType: keyType, keySystemOptions: keySystemOptions };
            });
        }
        else {
            var keyName = findKeySystemCanonicalName(keySystemOptions.type);
            var keyType = keySystemOptions.type;
            ksType = [{ keyName: keyName, keyType: keyType, keySystemOptions: keySystemOptions }];
        }
        return arr.concat(ksType);
    }, []);
    return recursivelyTestKeySystems(0);
    /**
     * Test all key system configuration stored in `keySystemsType` one by one
     * recursively.
     * Returns a Promise which will emit the MediaKeySystemAccess if one was
     * found compatible with one of the configurations or just reject if none
     * were found to be compatible.
     * @param {Number} index - The index in `keySystemsType` to start from.
     * Should be set to `0` when calling directly.
     * @returns {Promise.<Object>}
     */
    function recursivelyTestKeySystems(index) {
        return __awaiter(this, void 0, void 0, function () {
            var chosenType, keyType, keySystemOptions, keySystemConfigurations, keySystemAccess, _1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // if we iterated over the whole keySystemsType Array, quit on error
                        if (index >= keySystemsType.length) {
                            throw new errors_1.EncryptedMediaError("INCOMPATIBLE_KEYSYSTEMS", "No key system compatible with your wanted " +
                                "configuration has been found in the current " +
                                "browser.");
                        }
                        if ((0, is_null_or_undefined_1.default)(eme_1.default.requestMediaKeySystemAccess)) {
                            throw new Error("requestMediaKeySystemAccess is not implemented in your browser.");
                        }
                        chosenType = keySystemsType[index];
                        keyType = chosenType.keyType, keySystemOptions = chosenType.keySystemOptions;
                        keySystemConfigurations = buildKeySystemConfigurations(chosenType);
                        log_1.default.debug("DRM: Request keysystem access ".concat(keyType, ",") +
                            "".concat(index + 1, " of ").concat(keySystemsType.length));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, testKeySystem(keyType, keySystemConfigurations)];
                    case 2:
                        keySystemAccess = _a.sent();
                        log_1.default.info("DRM: Found compatible keysystem", keyType, index + 1);
                        return [2 /*return*/, {
                                type: "create-media-key-system-access",
                                value: {
                                    options: keySystemOptions,
                                    mediaKeySystemAccess: keySystemAccess,
                                },
                            }];
                    case 3:
                        _1 = _a.sent();
                        log_1.default.debug("DRM: Rejected access to keysystem", keyType, index + 1);
                        if (cancelSignal.cancellationError !== null) {
                            throw cancelSignal.cancellationError;
                        }
                        return [2 /*return*/, recursivelyTestKeySystems(index + 1)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
}
exports.default = getMediaKeySystemAccess;
/**
 * Test a key system configuration, resolves with the MediaKeySystemAccess
 * or reject if the key system is unsupported.
 * @param {string} keyType - The KeySystem string to test (ex: com.microsoft.playready.recommendation)
 * @param {Array.<MediaKeySystemMediaCapability>} keySystemConfigurations - Configurations for this keySystem
 * @returns Promise resolving with the MediaKeySystemAccess. Rejects if unsupported.
 */
function testKeySystem(keyType, keySystemConfigurations) {
    return __awaiter(this, void 0, void 0, function () {
        var keySystemAccess, mediaKeys, session, initData, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, eme_1.default.requestMediaKeySystemAccess(keyType, keySystemConfigurations)];
                case 1:
                    keySystemAccess = _a.sent();
                    if (!!(0, can_rely_on_request_media_key_system_access_1.canRelyOnRequestMediaKeySystemAccess)(keyType)) return [3 /*break*/, 6];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, keySystemAccess.createMediaKeys()];
                case 3:
                    mediaKeys = _a.sent();
                    session = mediaKeys.createSession();
                    initData = (0, generate_init_data_1.generatePlayReadyInitData)(generate_init_data_1.DUMMY_PLAY_READY_HEADER);
                    return [4 /*yield*/, session.generateRequest("cenc", initData)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    log_1.default.debug("DRM: KeySystemAccess was granted but it is not usable");
                    throw err_1;
                case 6: return [2 /*return*/, keySystemAccess];
            }
        });
    });
}
exports.testKeySystem = testKeySystem;
