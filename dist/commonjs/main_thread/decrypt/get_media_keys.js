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
Object.defineProperty(exports, "__esModule", { value: true });
var can_reuse_media_keys_1 = require("../../compat/can_reuse_media_keys");
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var find_key_system_1 = require("./find_key_system");
var loaded_sessions_store_1 = require("./utils/loaded_sessions_store");
var media_keys_infos_store_1 = require("./utils/media_keys_infos_store");
var persistent_sessions_store_1 = require("./utils/persistent_sessions_store");
var server_certificate_store_1 = require("./utils/server_certificate_store");
/**
 * @throws {EncryptedMediaError}
 * @param {Object} keySystemOptions
 * @returns {Object|null}
 */
function createPersistentSessionsStorage(keySystemOptions) {
    var persistentLicenseConfig = keySystemOptions.persistentLicenseConfig;
    if ((0, is_null_or_undefined_1.default)(persistentLicenseConfig)) {
        return null;
    }
    log_1.default.debug("DRM: Set the given license storage");
    return new persistent_sessions_store_1.default(persistentLicenseConfig);
}
/**
 * Create a MediaKeys instance and associated structures (or just return the
 * current ones if sufficient) based on a wanted configuration.
 * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement on which you
 * will attach the MediaKeys instance.
 * This Element is here only used to check if the current MediaKeys and
 * MediaKeySystemAccess instances are sufficient
 * @param {Array.<Object>} keySystemsConfigs - The key system configuration.
 * Needed to ask the right MediaKeySystemAccess.
 * @param {Object} cancelSignal - CancellationSignal allowing to cancel the
 * creation of the MediaKeys instance while the task is still pending.
 * @returns {Promise.<Object>}
 */
function getMediaKeysInfos(mediaElement, keySystemsConfigs, cancelSignal) {
    return __awaiter(this, void 0, void 0, function () {
        var evt, _a, options, mediaKeySystemAccess, currentState, persistentSessionsStore, mediaKeys_1, loadedSessionsStore_1, mediaKeys, loadedSessionsStore;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, find_key_system_1.default)(mediaElement, keySystemsConfigs, cancelSignal)];
                case 1:
                    evt = _b.sent();
                    if (cancelSignal.cancellationError !== null) {
                        throw cancelSignal.cancellationError;
                    }
                    _a = evt.value, options = _a.options, mediaKeySystemAccess = _a.mediaKeySystemAccess;
                    currentState = media_keys_infos_store_1.default.getState(mediaElement);
                    persistentSessionsStore = createPersistentSessionsStorage(options);
                    if ((0, can_reuse_media_keys_1.default)() &&
                        currentState !== null &&
                        evt.type === "reuse-media-key-system-access") {
                        mediaKeys_1 = currentState.mediaKeys, loadedSessionsStore_1 = currentState.loadedSessionsStore;
                        // We might just rely on the currently attached MediaKeys instance.
                        // First check if server certificate parameters are the same than in the
                        // current MediaKeys instance. If not, re-create MediaKeys from scratch.
                        if (server_certificate_store_1.default.hasOne(mediaKeys_1) === false ||
                            (!(0, is_null_or_undefined_1.default)(options.serverCertificate) &&
                                server_certificate_store_1.default.has(mediaKeys_1, options.serverCertificate))) {
                            return [2 /*return*/, {
                                    mediaKeys: mediaKeys_1,
                                    mediaKeySystemAccess: mediaKeySystemAccess,
                                    stores: { loadedSessionsStore: loadedSessionsStore_1, persistentSessionsStore: persistentSessionsStore },
                                    options: options,
                                }];
                        }
                    }
                    return [4 /*yield*/, createMediaKeys(mediaKeySystemAccess)];
                case 2:
                    mediaKeys = _b.sent();
                    log_1.default.info("DRM: MediaKeys created with success");
                    loadedSessionsStore = new loaded_sessions_store_1.default(mediaKeys);
                    return [2 /*return*/, {
                            mediaKeys: mediaKeys,
                            mediaKeySystemAccess: mediaKeySystemAccess,
                            stores: { loadedSessionsStore: loadedSessionsStore, persistentSessionsStore: persistentSessionsStore },
                            options: options,
                        }];
            }
        });
    });
}
exports.default = getMediaKeysInfos;
/**
 * Create `MediaKeys` from the `MediaKeySystemAccess` given.
 * Throws the right formatted error if it fails.
 * @param {MediaKeySystemAccess} mediaKeySystemAccess
 * @returns {Promise.<MediaKeys>}
 */
function createMediaKeys(mediaKeySystemAccess) {
    return __awaiter(this, void 0, void 0, function () {
        var mediaKeys, error_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log_1.default.info("DRM: Calling createMediaKeys on the MediaKeySystemAccess");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, mediaKeySystemAccess.createMediaKeys()];
                case 2:
                    mediaKeys = _a.sent();
                    return [2 /*return*/, mediaKeys];
                case 3:
                    error_1 = _a.sent();
                    message = error_1 instanceof Error ? error_1.message : "Unknown error when creating MediaKeys.";
                    throw new errors_1.EncryptedMediaError("CREATE_MEDIA_KEYS_ERROR", message);
                case 4: return [2 /*return*/];
            }
        });
    });
}
