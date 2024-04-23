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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var eme_1 = require("../../compat/eme");
var config_1 = require("../../config");
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var are_arrays_of_numbers_equal_1 = require("../../utils/are_arrays_of_numbers_equal");
var array_find_1 = require("../../utils/array_find");
var array_includes_1 = require("../../utils/array_includes");
var event_emitter_1 = require("../../utils/event_emitter");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var object_values_1 = require("../../utils/object_values");
var string_parsing_1 = require("../../utils/string_parsing");
var task_canceller_1 = require("../../utils/task_canceller");
var attach_media_keys_1 = require("./attach_media_keys");
var create_or_load_session_1 = require("./create_or_load_session");
var init_media_keys_1 = require("./init_media_keys");
var session_events_listener_1 = require("./session_events_listener");
var set_server_certificate_1 = require("./set_server_certificate");
var types_1 = require("./types");
var check_key_statuses_1 = require("./utils/check_key_statuses");
var clean_old_stored_persistent_info_1 = require("./utils/clean_old_stored_persistent_info");
var get_drm_system_id_1 = require("./utils/get_drm_system_id");
var init_data_values_container_1 = require("./utils/init_data_values_container");
var key_id_comparison_1 = require("./utils/key_id_comparison");
/**
 * Module communicating with the Content Decryption Module (or CDM) to be able
 * to decrypt contents.
 *
 * The `ContentDecryptor` starts communicating with the CDM, to initialize the
 * key system, as soon as it is created.
 *
 * You can be notified of various events, such as fatal errors, by registering
 * to one of its multiple events (@see IContentDecryptorEvent).
 *
 * @class ContentDecryptor
 */
var ContentDecryptor = /** @class */ (function (_super) {
    __extends(ContentDecryptor, _super);
    /**
     * Create a new `ContentDecryptor`, and initialize its decryption capabilities
     * right away.
     * Goes into the `WaitingForAttachment` state once that initialization is
     * done, after which you should call the `attach` method when you're ready for
     * those decryption capabilities to be attached to the HTMLMediaElement.
     *
     * @param {HTMLMediaElement} mediaElement - The MediaElement which will be
     * associated to a MediaKeys object
     * @param {Array.<Object>} ksOptions - key system configuration.
     * The `ContentDecryptor` can be given one or multiple key system
     * configurations. It will choose the appropriate one depending on user
     * settings and browser support.
     */
    function ContentDecryptor(mediaElement, ksOptions) {
        var _this = _super.call(this) || this;
        log_1.default.debug("DRM: Starting ContentDecryptor logic.");
        var canceller = new task_canceller_1.default();
        _this._currentSessions = [];
        _this._canceller = canceller;
        _this._initDataQueue = [];
        _this._stateData = {
            state: types_1.ContentDecryptorState.Initializing,
            isMediaKeysAttached: 0 /* MediaKeyAttachmentStatus.NotAttached */,
            isInitDataQueueLocked: true,
            data: null,
        };
        _this.error = null;
        eme_1.default.onEncrypted(mediaElement, function (evt) {
            log_1.default.debug("DRM: Encrypted event received from media element.");
            var initData = (0, eme_1.getInitData)(evt);
            if (initData !== null) {
                _this.onInitializationData(initData);
            }
        }, canceller.signal);
        (0, init_media_keys_1.default)(mediaElement, ksOptions, canceller.signal)
            .then(function (mediaKeysInfo) {
            var options = mediaKeysInfo.options, mediaKeySystemAccess = mediaKeysInfo.mediaKeySystemAccess;
            /**
             * String identifying the key system, allowing the rest of the code to
             * only advertise the required initialization data for license requests.
             *
             * Note that we only set this value if retro-compatibility to older
             * persistent logic in the RxPlayer is not important, as the
             * optimizations this property unlocks can break the loading of
             * MediaKeySessions persisted in older RxPlayer's versions.
             */
            var systemId;
            if ((0, is_null_or_undefined_1.default)(options.persistentLicenseConfig) ||
                options.persistentLicenseConfig.disableRetroCompatibility === true) {
                systemId = (0, get_drm_system_id_1.default)(mediaKeySystemAccess.keySystem);
            }
            _this.systemId = systemId;
            if (_this._stateData.state === types_1.ContentDecryptorState.Initializing) {
                _this._stateData = {
                    state: types_1.ContentDecryptorState.WaitingForAttachment,
                    isInitDataQueueLocked: true,
                    isMediaKeysAttached: 0 /* MediaKeyAttachmentStatus.NotAttached */,
                    data: { mediaKeysInfo: mediaKeysInfo, mediaElement: mediaElement },
                };
                _this.trigger("stateChange", _this._stateData.state);
            }
        })
            .catch(function (err) {
            _this._onFatalError(err);
        });
        return _this;
    }
    /**
     * `true` if the EME API are available on the current platform according to
     * the default EME implementation used.
     * `false` otherwise.
     * @returns {boolean}
     */
    ContentDecryptor.hasEmeApis = function () {
        return !(0, is_null_or_undefined_1.default)(eme_1.default.requestMediaKeySystemAccess);
    };
    /**
     * Returns the current state of the ContentDecryptor.
     * @see ContentDecryptorState
     * @returns {Object}
     */
    ContentDecryptor.prototype.getState = function () {
        return this._stateData.state;
    };
    /**
     * Attach the current decryption capabilities to the HTMLMediaElement.
     * This method should only be called once the `ContentDecryptor` is in the
     * `WaitingForAttachment` state.
     *
     * You might want to first set the HTMLMediaElement's `src` attribute before
     * calling this method, and only push data to it once the `ReadyForContent`
     * state is reached, for compatibility reasons.
     */
    ContentDecryptor.prototype.attach = function () {
        var _this = this;
        if (this._stateData.state !== types_1.ContentDecryptorState.WaitingForAttachment) {
            throw new Error("`attach` should only be called when " + "in the WaitingForAttachment state");
        }
        else if (this._stateData.isMediaKeysAttached !== 0 /* MediaKeyAttachmentStatus.NotAttached */) {
            log_1.default.warn("DRM: ContentDecryptor's `attach` method called more than once.");
            return;
        }
        var _a = this._stateData.data, mediaElement = _a.mediaElement, mediaKeysInfo = _a.mediaKeysInfo;
        var options = mediaKeysInfo.options, mediaKeys = mediaKeysInfo.mediaKeys, mediaKeySystemAccess = mediaKeysInfo.mediaKeySystemAccess, stores = mediaKeysInfo.stores;
        var shouldDisableLock = options.disableMediaKeysAttachmentLock === true;
        if (shouldDisableLock) {
            this._stateData = {
                state: types_1.ContentDecryptorState.ReadyForContent,
                isInitDataQueueLocked: true,
                isMediaKeysAttached: 1 /* MediaKeyAttachmentStatus.Pending */,
                data: { mediaKeysInfo: mediaKeysInfo, mediaElement: mediaElement },
            };
            this.trigger("stateChange", this._stateData.state);
            // previous trigger might have lead to disposal
            if (this._isStopped()) {
                return;
            }
        }
        this._stateData.isMediaKeysAttached = 1 /* MediaKeyAttachmentStatus.Pending */;
        var stateToAttach = {
            emeImplementation: eme_1.default,
            loadedSessionsStore: stores.loadedSessionsStore,
            mediaKeySystemAccess: mediaKeySystemAccess,
            mediaKeys: mediaKeys,
            keySystemOptions: options,
        };
        log_1.default.debug("DRM: Attaching current MediaKeys");
        (0, attach_media_keys_1.default)(mediaElement, stateToAttach, this._canceller.signal)
            .then(function () { return __awaiter(_this, void 0, void 0, function () {
            var serverCertificate, resSsc, prevState;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this._stateData.isMediaKeysAttached = 2 /* MediaKeyAttachmentStatus.Attached */;
                        serverCertificate = options.serverCertificate;
                        if (!!(0, is_null_or_undefined_1.default)(serverCertificate)) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, set_server_certificate_1.default)(mediaKeys, serverCertificate)];
                    case 1:
                        resSsc = _a.sent();
                        if (resSsc.type === "error") {
                            this.trigger("warning", resSsc.value);
                        }
                        _a.label = 2;
                    case 2:
                        if (this._isStopped()) {
                            // We might be stopped since then
                            return [2 /*return*/];
                        }
                        prevState = this._stateData.state;
                        this._stateData = {
                            state: types_1.ContentDecryptorState.ReadyForContent,
                            isMediaKeysAttached: 2 /* MediaKeyAttachmentStatus.Attached */,
                            isInitDataQueueLocked: false,
                            data: { mediaKeysData: mediaKeysInfo },
                        };
                        if (prevState !== types_1.ContentDecryptorState.ReadyForContent) {
                            this.trigger("stateChange", types_1.ContentDecryptorState.ReadyForContent);
                        }
                        if (!this._isStopped()) {
                            this._processCurrentInitDataQueue();
                        }
                        return [2 /*return*/];
                }
            });
        }); })
            .catch(function (err) {
            _this._onFatalError(err);
        });
    };
    /**
     * Stop this `ContentDecryptor` instance:
     *   - stop listening and reacting to the various event listeners
     *   - abort all operations.
     *
     * Once disposed, a `ContentDecryptor` cannot be used anymore.
     */
    ContentDecryptor.prototype.dispose = function () {
        this.removeEventListener();
        this._stateData = {
            state: types_1.ContentDecryptorState.Disposed,
            isMediaKeysAttached: undefined,
            isInitDataQueueLocked: undefined,
            data: null,
        };
        this._canceller.cancel();
        this.trigger("stateChange", this._stateData.state);
    };
    /**
     * Method to call when new protection initialization data is encounted on the
     * content.
     *
     * When called, the `ContentDecryptor` will try to obtain the decryption key
     * if not already obtained.
     *
     * @param {Object} initializationData
     */
    ContentDecryptor.prototype.onInitializationData = function (initializationData) {
        var _this = this;
        if (this._stateData.isInitDataQueueLocked !== false) {
            if (this._isStopped()) {
                throw new Error("ContentDecryptor either disposed or stopped.");
            }
            this._initDataQueue.push(initializationData);
            return;
        }
        var mediaKeysData = this._stateData.data.mediaKeysData;
        var processedInitializationData = __assign(__assign({}, initializationData), { values: new init_data_values_container_1.default(initializationData.values) });
        this._processInitializationData(processedInitializationData, mediaKeysData).catch(function (err) {
            _this._onFatalError(err);
        });
    };
    /**
     * Async logic run each time new initialization data has to be processed.
     * The promise return may reject, in which case a fatal error should be linked
     * the current `ContentDecryptor`.
     *
     * The Promise's resolution however provides no semantic value.
     * @param {Object} initializationData
     * @returns {Promise.<void>}
     */
    ContentDecryptor.prototype._processInitializationData = function (initializationData, mediaKeysData) {
        return __awaiter(this, void 0, void 0, function () {
            var mediaKeySystemAccess, stores, options, firstCreatedSession, keyIds, hexKids, period, createdSessions, periodKeys, createdSessions_1, createdSessions_1_1, createdSess, periodKeysArr, periodKeysArr_1, periodKeysArr_1_1, kid, _loop_1, periodKeysArr_2, periodKeysArr_2_1, innerKid, wantedSessionType, _a, EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS, EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION, maxSessionCacheSize, sessionRes, sessionInfo, _b, mediaKeySession, sessionType, isSessionPersisted, requestData, error_1, entry, indexInCurrent;
            var e_1, _c, e_2, _d, e_3, _e;
            var _this = this;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        mediaKeySystemAccess = mediaKeysData.mediaKeySystemAccess, stores = mediaKeysData.stores, options = mediaKeysData.options;
                        if (this._tryToUseAlreadyCreatedSession(initializationData, mediaKeysData) ||
                            this._isStopped()) {
                            // _isStopped is voluntarly checked after here
                            return [2 /*return*/];
                        }
                        if (options.singleLicensePer === "content") {
                            firstCreatedSession = (0, array_find_1.default)(this._currentSessions, function (x) { return x.source === "created-session" /* MediaKeySessionLoadingType.Created */; });
                            if (firstCreatedSession !== undefined) {
                                keyIds = initializationData.keyIds;
                                if (keyIds === undefined) {
                                    if (initializationData.content === undefined) {
                                        log_1.default.warn("DRM: Unable to fallback from a non-decipherable quality.");
                                    }
                                    else {
                                        this.trigger("blackListProtectionData", initializationData);
                                    }
                                    return [2 /*return*/];
                                }
                                firstCreatedSession.record.associateKeyIds(keyIds);
                                if (initializationData.content !== undefined) {
                                    if (log_1.default.hasLevel("DEBUG")) {
                                        hexKids = keyIds.reduce(function (acc, kid) { return "".concat(acc, ", ").concat((0, string_parsing_1.bytesToHex)(kid)); }, "");
                                        log_1.default.debug("DRM: Blacklisting new key ids", hexKids);
                                    }
                                    this.trigger("keyIdsCompatibilityUpdate", {
                                        whitelistedKeyIds: [],
                                        blacklistedKeyIds: keyIds,
                                        delistedKeyIds: [],
                                    });
                                }
                                return [2 /*return*/];
                            }
                        }
                        else if (options.singleLicensePer === "periods" &&
                            initializationData.content !== undefined) {
                            period = initializationData.content.period;
                            createdSessions = this._currentSessions.filter(function (x) { return x.source === "created-session" /* MediaKeySessionLoadingType.Created */; });
                            periodKeys = new Set();
                            addKeyIdsFromPeriod(periodKeys, period);
                            try {
                                for (createdSessions_1 = __values(createdSessions), createdSessions_1_1 = createdSessions_1.next(); !createdSessions_1_1.done; createdSessions_1_1 = createdSessions_1.next()) {
                                    createdSess = createdSessions_1_1.value;
                                    periodKeysArr = Array.from(periodKeys);
                                    try {
                                        for (periodKeysArr_1 = (e_2 = void 0, __values(periodKeysArr)), periodKeysArr_1_1 = periodKeysArr_1.next(); !periodKeysArr_1_1.done; periodKeysArr_1_1 = periodKeysArr_1.next()) {
                                            kid = periodKeysArr_1_1.value;
                                            if (createdSess.record.isAssociatedWithKeyId(kid)) {
                                                createdSess.record.associateKeyIds(periodKeys.values());
                                                _loop_1 = function (innerKid) {
                                                    if (!createdSess.keyStatuses.whitelisted.some(function (k) {
                                                        return (0, are_arrays_of_numbers_equal_1.default)(k, innerKid);
                                                    }) &&
                                                        !createdSess.keyStatuses.blacklisted.some(function (k) {
                                                            return (0, are_arrays_of_numbers_equal_1.default)(k, innerKid);
                                                        })) {
                                                        createdSess.keyStatuses.blacklisted.push(innerKid);
                                                    }
                                                };
                                                try {
                                                    // Re-loop through the Period's key ids to blacklist ones that are missing
                                                    // from `createdSess`'s `keyStatuses` and to update the content's
                                                    // decipherability.
                                                    for (periodKeysArr_2 = (e_3 = void 0, __values(periodKeysArr)), periodKeysArr_2_1 = periodKeysArr_2.next(); !periodKeysArr_2_1.done; periodKeysArr_2_1 = periodKeysArr_2.next()) {
                                                        innerKid = periodKeysArr_2_1.value;
                                                        _loop_1(innerKid);
                                                    }
                                                }
                                                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                                                finally {
                                                    try {
                                                        if (periodKeysArr_2_1 && !periodKeysArr_2_1.done && (_e = periodKeysArr_2.return)) _e.call(periodKeysArr_2);
                                                    }
                                                    finally { if (e_3) throw e_3.error; }
                                                }
                                                this.trigger("keyIdsCompatibilityUpdate", {
                                                    whitelistedKeyIds: createdSess.keyStatuses.whitelisted,
                                                    blacklistedKeyIds: createdSess.keyStatuses.blacklisted,
                                                    delistedKeyIds: [],
                                                });
                                                return [2 /*return*/];
                                            }
                                        }
                                    }
                                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                    finally {
                                        try {
                                            if (periodKeysArr_1_1 && !periodKeysArr_1_1.done && (_d = periodKeysArr_1.return)) _d.call(periodKeysArr_1);
                                        }
                                        finally { if (e_2) throw e_2.error; }
                                    }
                                }
                            }
                            catch (e_1_1) { e_1 = { error: e_1_1 }; }
                            finally {
                                try {
                                    if (createdSessions_1_1 && !createdSessions_1_1.done && (_c = createdSessions_1.return)) _c.call(createdSessions_1);
                                }
                                finally { if (e_1) throw e_1.error; }
                            }
                        }
                        // /!\ Do not forget to unlock when done
                        // TODO this is error-prone and can lead to performance issue when loading
                        // persistent sessions.
                        // Can we find a better strategy?
                        this._lockInitDataQueue();
                        if ((0, is_null_or_undefined_1.default)(options.persistentLicenseConfig)) {
                            wantedSessionType = "temporary";
                        }
                        else if (!canCreatePersistentSession(mediaKeySystemAccess)) {
                            log_1.default.warn('DRM: Cannot create "persistent-license" session: not supported');
                            wantedSessionType = "temporary";
                        }
                        else {
                            wantedSessionType = "persistent-license";
                        }
                        _a = config_1.default.getCurrent(), EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS = _a.EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS, EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION = _a.EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION;
                        maxSessionCacheSize = typeof options.maxSessionCacheSize === "number"
                            ? options.maxSessionCacheSize
                            : EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS;
                        return [4 /*yield*/, (0, create_or_load_session_1.default)(initializationData, stores, wantedSessionType, maxSessionCacheSize, this._canceller.signal)];
                    case 1:
                        sessionRes = _f.sent();
                        if (this._isStopped()) {
                            return [2 /*return*/];
                        }
                        sessionInfo = {
                            record: sessionRes.value.keySessionRecord,
                            source: sessionRes.type,
                            keyStatuses: { whitelisted: [], blacklisted: [] },
                            blacklistedSessionError: null,
                        };
                        this._currentSessions.push(sessionInfo);
                        _b = sessionRes.value, mediaKeySession = _b.mediaKeySession, sessionType = _b.sessionType;
                        isSessionPersisted = false;
                        (0, session_events_listener_1.default)(mediaKeySession, options, mediaKeySystemAccess.keySystem, {
                            onKeyUpdate: function (value) {
                                var linkedKeys = getKeyIdsLinkedToSession(initializationData, sessionInfo.record, options.singleLicensePer, sessionInfo.source === "created-session" /* MediaKeySessionLoadingType.Created */, value.whitelistedKeyIds, value.blacklistedKeyIds);
                                sessionInfo.record.associateKeyIds(linkedKeys.whitelisted);
                                sessionInfo.record.associateKeyIds(linkedKeys.blacklisted);
                                sessionInfo.keyStatuses = {
                                    whitelisted: linkedKeys.whitelisted,
                                    blacklisted: linkedKeys.blacklisted,
                                };
                                if (sessionInfo.record.getAssociatedKeyIds().length !== 0 &&
                                    sessionType === "persistent-license" &&
                                    stores.persistentSessionsStore !== null &&
                                    !isSessionPersisted) {
                                    var persistentSessionsStore = stores.persistentSessionsStore;
                                    (0, clean_old_stored_persistent_info_1.default)(persistentSessionsStore, EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION - 1);
                                    persistentSessionsStore.add(initializationData, sessionInfo.record.getAssociatedKeyIds(), mediaKeySession);
                                    isSessionPersisted = true;
                                }
                                if (initializationData.content !== undefined) {
                                    _this.trigger("keyIdsCompatibilityUpdate", {
                                        whitelistedKeyIds: linkedKeys.whitelisted,
                                        blacklistedKeyIds: linkedKeys.blacklisted,
                                        delistedKeyIds: [],
                                    });
                                }
                                _this._unlockInitDataQueue();
                            },
                            onWarning: function (value) {
                                _this.trigger("warning", value);
                            },
                            onError: function (err) {
                                var _a;
                                if (err instanceof check_key_statuses_1.DecommissionedSessionError) {
                                    log_1.default.warn("DRM: A session's closing condition has been triggered");
                                    _this._lockInitDataQueue();
                                    var indexOf = _this._currentSessions.indexOf(sessionInfo);
                                    if (indexOf >= 0) {
                                        _this._currentSessions.splice(indexOf);
                                    }
                                    if (initializationData.content !== undefined) {
                                        _this.trigger("keyIdsCompatibilityUpdate", {
                                            whitelistedKeyIds: [],
                                            blacklistedKeyIds: [],
                                            delistedKeyIds: sessionInfo.record.getAssociatedKeyIds(),
                                        });
                                    }
                                    (_a = stores.persistentSessionsStore) === null || _a === void 0 ? void 0 : _a.delete(mediaKeySession.sessionId);
                                    stores.loadedSessionsStore
                                        .closeSession(mediaKeySession)
                                        .catch(function (e) {
                                        var closeError = e instanceof Error ? e : "unknown error";
                                        log_1.default.warn("DRM: failed to close expired session", closeError);
                                    })
                                        .then(function () { return _this._unlockInitDataQueue(); })
                                        .catch(function (retryError) { return _this._onFatalError(retryError); });
                                    if (!_this._isStopped()) {
                                        _this.trigger("warning", err.reason);
                                    }
                                    return;
                                }
                                if (!(err instanceof session_events_listener_1.BlacklistedSessionError)) {
                                    _this._onFatalError(err);
                                    return;
                                }
                                sessionInfo.blacklistedSessionError = err;
                                if (initializationData.content !== undefined) {
                                    log_1.default.info("DRM: blacklisting Representations based on " + "protection data.");
                                    _this.trigger("blackListProtectionData", initializationData);
                                }
                                _this._unlockInitDataQueue();
                                // TODO warning for blacklisted session?
                            },
                        }, this._canceller.signal);
                        if (options.singleLicensePer === undefined ||
                            options.singleLicensePer === "init-data") {
                            this._unlockInitDataQueue();
                        }
                        if (!(sessionRes.type === "created-session" /* MediaKeySessionLoadingType.Created */)) return [3 /*break*/, 5];
                        requestData = initializationData.values.constructRequestData();
                        _f.label = 2;
                    case 2:
                        _f.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, stores.loadedSessionsStore.generateLicenseRequest(mediaKeySession, initializationData.type, requestData)];
                    case 3:
                        _f.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _f.sent();
                        entry = stores.loadedSessionsStore.getEntryForSession(mediaKeySession);
                        if (entry === null || entry.closingStatus.type !== "none") {
                            indexInCurrent = this._currentSessions.indexOf(sessionInfo);
                            if (indexInCurrent >= 0) {
                                this._currentSessions.splice(indexInCurrent, 1);
                            }
                            return [2 /*return*/, Promise.resolve()];
                        }
                        throw new errors_1.EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error_1 instanceof Error ? error_1.toString() : "Unknown error");
                    case 5: return [2 /*return*/, Promise.resolve()];
                }
            });
        });
    };
    ContentDecryptor.prototype._tryToUseAlreadyCreatedSession = function (initializationData, mediaKeysData) {
        var stores = mediaKeysData.stores, options = mediaKeysData.options;
        /**
         * If set, a currently-used key session is already compatible to this
         * initialization data.
         */
        var compatibleSessionInfo = (0, array_find_1.default)(this._currentSessions, function (x) {
            return x.record.isCompatibleWith(initializationData);
        });
        if (compatibleSessionInfo === undefined) {
            return false;
        }
        // Check if the compatible session is blacklisted
        var blacklistedSessionError = compatibleSessionInfo.blacklistedSessionError;
        if (!(0, is_null_or_undefined_1.default)(blacklistedSessionError)) {
            if (initializationData.type === undefined ||
                initializationData.content === undefined) {
                log_1.default.error("DRM: This initialization data has already been blacklisted " +
                    "but the current content is not known.");
                return true;
            }
            else {
                log_1.default.info("DRM: This initialization data has already been blacklisted. " +
                    "Blacklisting the related content.");
                this.trigger("blackListProtectionData", initializationData);
                return true;
            }
        }
        // Check if the current key id(s) has been blacklisted by this session
        if (initializationData.keyIds !== undefined) {
            /**
             * If set to `true`, the Representation(s) linked to this
             * initialization data's key id should be marked as "not decipherable".
             */
            var isUndecipherable = void 0;
            if (options.singleLicensePer === undefined ||
                options.singleLicensePer === "init-data") {
                // Note: In the default "init-data" mode, we only avoid a
                // Representation if the key id was originally explicitely
                // blacklisted (and not e.g. if its key was just not present in
                // the license).
                //
                // This is to enforce v3.x.x retro-compatibility: we cannot
                // fallback from a Representation unless some RxPlayer option
                // documentating this behavior has been set.
                var blacklisted = compatibleSessionInfo.keyStatuses.blacklisted;
                isUndecipherable = (0, key_id_comparison_1.areSomeKeyIdsContainedIn)(initializationData.keyIds, blacklisted);
            }
            else {
                // In any other mode, as soon as not all of this initialization
                // data's linked key ids are explicitely whitelisted, we can mark
                // the corresponding Representation as "not decipherable".
                // This is because we've no such retro-compatibility guarantee to
                // make there.
                var whitelisted = compatibleSessionInfo.keyStatuses.whitelisted;
                isUndecipherable = !(0, key_id_comparison_1.areAllKeyIdsContainedIn)(initializationData.keyIds, whitelisted);
            }
            if (isUndecipherable) {
                if (initializationData.content === undefined) {
                    log_1.default.error("DRM: Cannot forbid key id, the content is unknown.");
                    return true;
                }
                log_1.default.info("DRM: Current initialization data is linked to blacklisted keys. " +
                    "Marking Representations as not decipherable");
                this.trigger("keyIdsCompatibilityUpdate", {
                    whitelistedKeyIds: [],
                    blacklistedKeyIds: initializationData.keyIds,
                    delistedKeyIds: [],
                });
                return true;
            }
        }
        // If we reached here, it means that this initialization data is not
        // blacklisted in any way.
        // Search loaded session and put it on top of the cache if it exists.
        var entry = stores.loadedSessionsStore.reuse(initializationData);
        if (entry !== null) {
            // TODO update decipherability to `true` if not?
            log_1.default.debug("DRM: Init data already processed. Skipping it.");
            return true;
        }
        // Session not found in `loadedSessionsStore`, it might have been closed
        // since.
        // Remove from `this._currentSessions` and start again.
        var indexOf = this._currentSessions.indexOf(compatibleSessionInfo);
        if (indexOf === -1) {
            log_1.default.error("DRM: Unable to remove processed init data: not found.");
        }
        else {
            log_1.default.debug("DRM: A session from a processed init data is not available " +
                "anymore. Re-processing it.");
            this._currentSessions.splice(indexOf, 1);
        }
        return false;
    };
    /**
     * Callback that should be called if an error that made the current
     * `ContentDecryptor` instance unusable arised.
     * This callbacks takes care of resetting state and sending the right events.
     *
     * Once called, no further actions should be taken.
     *
     * @param {*} err - The error object which describes the issue. Will be
     * formatted and sent in an "error" event.
     */
    ContentDecryptor.prototype._onFatalError = function (err) {
        if (this._canceller.isUsed()) {
            return;
        }
        var formattedErr = err instanceof Error ? err : new errors_1.OtherError("NONE", "Unknown decryption error");
        this.error = formattedErr;
        this._initDataQueue.length = 0;
        this._stateData = {
            state: types_1.ContentDecryptorState.Error,
            isMediaKeysAttached: undefined,
            isInitDataQueueLocked: undefined,
            data: null,
        };
        this._canceller.cancel();
        this.trigger("error", formattedErr);
        // The previous trigger might have lead to a disposal of the `ContentDecryptor`.
        if (this._stateData.state === types_1.ContentDecryptorState.Error) {
            this.trigger("stateChange", this._stateData.state);
        }
    };
    /**
     * Return `true` if the `ContentDecryptor` has either been disposed or
     * encountered a fatal error which made it stop.
     * @returns {boolean}
     */
    ContentDecryptor.prototype._isStopped = function () {
        return (this._stateData.state === types_1.ContentDecryptorState.Disposed ||
            this._stateData.state === types_1.ContentDecryptorState.Error);
    };
    /**
     * Start processing the next initialization data of the `_initDataQueue` if it
     * isn't lock.
     */
    ContentDecryptor.prototype._processCurrentInitDataQueue = function () {
        while (this._stateData.isInitDataQueueLocked === false) {
            var initData = this._initDataQueue.shift();
            if (initData === undefined) {
                return;
            }
            this.onInitializationData(initData);
        }
    };
    /**
     * Lock new initialization data (from the `_initDataQueue`) from being
     * processed until `_unlockInitDataQueue` is called.
     *
     * You may want to call this method when performing operations which may have
     * an impact on the handling of other initialization data.
     */
    ContentDecryptor.prototype._lockInitDataQueue = function () {
        if (this._stateData.isInitDataQueueLocked === false) {
            this._stateData.isInitDataQueueLocked = true;
        }
    };
    /**
     * Unlock `_initDataQueue` and start processing the first element.
     *
     * Should have no effect if the `_initDataQueue` was not locked.
     */
    ContentDecryptor.prototype._unlockInitDataQueue = function () {
        if (this._stateData.isMediaKeysAttached !== 2 /* MediaKeyAttachmentStatus.Attached */) {
            log_1.default.error("DRM: Trying to unlock in the wrong state");
            return;
        }
        this._stateData.isInitDataQueueLocked = false;
        this._processCurrentInitDataQueue();
    };
    return ContentDecryptor;
}(event_emitter_1.default));
exports.default = ContentDecryptor;
/**
 * Returns `true` if the given MediaKeySystemAccess can create
 * "persistent-license" MediaKeySessions.
 * @param {MediaKeySystemAccess} mediaKeySystemAccess
 * @returns {Boolean}
 */
function canCreatePersistentSession(mediaKeySystemAccess) {
    var sessionTypes = mediaKeySystemAccess.getConfiguration().sessionTypes;
    return sessionTypes !== undefined && (0, array_includes_1.default)(sessionTypes, "persistent-license");
}
/**
 * Returns set of all usable and unusable keys - explicit or implicit - that are
 * linked to a `MediaKeySession`.
 *
 * In the RxPlayer, there is a concept of "explicit" key ids, which are key ids
 * found in a license whose status can be known through the `keyStatuses`
 * property from a `MediaKeySession`, and of "implicit" key ids, which are key
 * ids which were expected to be in a fetched license, but apparently weren't.
 *
 * @param {Object} initializationData - Initialization data object used to make
 * the request for the current license.
 * @param {Object} keySessionRecord - The `KeySessionRecord` associated with the
 * session that has been loaded. It might give supplementary information on
 * keys implicitly linked to the license.
 * @param {string|undefined} singleLicensePer - Setting allowing to indicate the
 * scope a given license should have.
 * @param {boolean} isCurrentLicense - If `true` the license has been fetched
 * especially for the current content.
 *
 * Knowing this allows to determine that if decryption keys that should have
 * been referenced in the fetched license (according to the `singleLicensePer`
 * setting) are missing, then the keys surely must have been voluntarly
 * removed from the license.
 *
 * If it is however set to `false`, it means that the license is an older
 * license that might have been linked to another content, thus we cannot make
 * that assumption.
 * @param {Array.<Uint8Array>} usableKeyIds - Key ids that are present in the
 * license and can be used.
 * @param {Array.<Uint8Array>} unusableKeyIds - Key ids that are present in the
 * license yet cannot be used.
 * @returns {Object} - Returns an object with the following properties:
 *   - `whitelisted`: Array of key ids for keys that are known to be usable
 *   - `blacklisted`: Array of key ids for keys that are considered unusable.
 *     The qualities linked to those keys should not be played.
 */
function getKeyIdsLinkedToSession(initializationData, keySessionRecord, singleLicensePer, isCurrentLicense, usableKeyIds, unusableKeyIds) {
    var e_4, _a, e_5, _b, e_6, _c, e_7, _d;
    var _e;
    /**
     * Every key id associated with the MediaKeySession, starting with
     * whitelisted ones.
     */
    var associatedKeyIds = __spreadArray(__spreadArray([], __read(usableKeyIds), false), __read(unusableKeyIds), false);
    // Add all key ids associated to the `KeySessionRecord` yet not in
    // `usableKeyIds` nor in `unusableKeyIds`
    var allKnownKeyIds = keySessionRecord.getAssociatedKeyIds();
    var _loop_2 = function (kid) {
        if (!associatedKeyIds.some(function (ak) { return (0, are_arrays_of_numbers_equal_1.default)(ak, kid); })) {
            if (log_1.default.hasLevel("DEBUG")) {
                log_1.default.debug("DRM: KeySessionRecord's key missing in the license, blacklisting it", (0, string_parsing_1.bytesToHex)(kid));
            }
            associatedKeyIds.push(kid);
        }
    };
    try {
        for (var allKnownKeyIds_1 = __values(allKnownKeyIds), allKnownKeyIds_1_1 = allKnownKeyIds_1.next(); !allKnownKeyIds_1_1.done; allKnownKeyIds_1_1 = allKnownKeyIds_1.next()) {
            var kid = allKnownKeyIds_1_1.value;
            _loop_2(kid);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (allKnownKeyIds_1_1 && !allKnownKeyIds_1_1.done && (_a = allKnownKeyIds_1.return)) _a.call(allKnownKeyIds_1);
        }
        finally { if (e_4) throw e_4.error; }
    }
    if (singleLicensePer !== undefined && singleLicensePer !== "init-data") {
        // We want to add the current key ids in the blacklist if it is
        // not already there.
        //
        // We only do that when `singleLicensePer` is set to something
        // else than the default `"init-data"` because this logic:
        //   1. might result in a quality fallback, which is a v3.x.x
        //      breaking change if some APIs (like `singleLicensePer`)
        //      aren't used.
        //   2. Rely on the EME spec regarding key statuses being well
        //      implemented on all supported devices, which we're not
        //      sure yet. Because in any other `singleLicensePer`, we
        //      need a good implementation anyway, it doesn't matter
        //      there.
        var expectedKeyIds = initializationData.keyIds, content = initializationData.content;
        if (expectedKeyIds !== undefined) {
            var missingKeyIds = expectedKeyIds.filter(function (expected) {
                return !associatedKeyIds.some(function (k) { return (0, are_arrays_of_numbers_equal_1.default)(k, expected); });
            });
            if (missingKeyIds.length > 0) {
                if (log_1.default.hasLevel("DEBUG")) {
                    log_1.default.debug("DRM: init data keys missing in the license, blacklisting them", missingKeyIds.map(function (m) { return (0, string_parsing_1.bytesToHex)(m); }).join(", "));
                }
                associatedKeyIds.push.apply(associatedKeyIds, __spreadArray([], __read(missingKeyIds), false));
            }
        }
        if (isCurrentLicense && content !== undefined) {
            if (singleLicensePer === "content") {
                // Put it in a Set to automatically filter out duplicates (by ref)
                var contentKeys = new Set();
                var manifest = content.manifest;
                try {
                    for (var _f = __values(manifest.periods), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var period = _g.value;
                        addKeyIdsFromPeriod(contentKeys, period);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                mergeKeyIdSetIntoArray(contentKeys, associatedKeyIds);
            }
            else if (singleLicensePer === "periods") {
                var manifest = content.manifest;
                try {
                    for (var _h = __values(manifest.periods), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var period = _j.value;
                        var periodKeys = new Set();
                        addKeyIdsFromPeriod(periodKeys, period);
                        if (((_e = initializationData.content) === null || _e === void 0 ? void 0 : _e.period.id) === period.id) {
                            mergeKeyIdSetIntoArray(periodKeys, associatedKeyIds);
                        }
                        else {
                            var periodKeysArr = Array.from(periodKeys);
                            var _loop_3 = function (kid) {
                                var isFound = associatedKeyIds.some(function (k) {
                                    return (0, are_arrays_of_numbers_equal_1.default)(k, kid);
                                });
                                if (isFound) {
                                    mergeKeyIdSetIntoArray(periodKeys, associatedKeyIds);
                                    return "break";
                                }
                            };
                            try {
                                for (var periodKeysArr_3 = (e_7 = void 0, __values(periodKeysArr)), periodKeysArr_3_1 = periodKeysArr_3.next(); !periodKeysArr_3_1.done; periodKeysArr_3_1 = periodKeysArr_3.next()) {
                                    var kid = periodKeysArr_3_1.value;
                                    var state_1 = _loop_3(kid);
                                    if (state_1 === "break")
                                        break;
                                }
                            }
                            catch (e_7_1) { e_7 = { error: e_7_1 }; }
                            finally {
                                try {
                                    if (periodKeysArr_3_1 && !periodKeysArr_3_1.done && (_d = periodKeysArr_3.return)) _d.call(periodKeysArr_3);
                                }
                                finally { if (e_7) throw e_7.error; }
                            }
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
        }
    }
    return {
        whitelisted: usableKeyIds,
        /** associatedKeyIds starts with the whitelisted one. */
        blacklisted: associatedKeyIds.slice(usableKeyIds.length),
    };
}
/**
 * Push all kei ids in the given `set` and add it to the `arr` Array only if it
 * isn't already present in it.
 * @param {Set.<Uint8Array>} set
 * @param {Array.<Uint8Array>} arr
 */
function mergeKeyIdSetIntoArray(set, arr) {
    var e_8, _a;
    var setArr = Array.from(set.values());
    var _loop_4 = function (kid) {
        var isFound = arr.some(function (k) { return (0, are_arrays_of_numbers_equal_1.default)(k, kid); });
        if (!isFound) {
            arr.push(kid);
        }
    };
    try {
        for (var setArr_1 = __values(setArr), setArr_1_1 = setArr_1.next(); !setArr_1_1.done; setArr_1_1 = setArr_1.next()) {
            var kid = setArr_1_1.value;
            _loop_4(kid);
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (setArr_1_1 && !setArr_1_1.done && (_a = setArr_1.return)) _a.call(setArr_1);
        }
        finally { if (e_8) throw e_8.error; }
    }
}
/**
 * Add to the given `set` all key ids found in the given `Period`.
 * @param {Set.<Uint8Array>} set
 * @param {Object} period
 */
function addKeyIdsFromPeriod(set, period) {
    var e_9, _a, e_10, _b, e_11, _c;
    var adaptationsByType = period.adaptations;
    var adaptations = (0, object_values_1.objectValues)(adaptationsByType).reduce(
    // Note: the second case cannot happen. TS is just being dumb here
    function (acc, adaps) { return (!(0, is_null_or_undefined_1.default)(adaps) ? acc.concat(adaps) : acc); }, []);
    try {
        for (var adaptations_1 = __values(adaptations), adaptations_1_1 = adaptations_1.next(); !adaptations_1_1.done; adaptations_1_1 = adaptations_1.next()) {
            var adaptation = adaptations_1_1.value;
            try {
                for (var _d = (e_10 = void 0, __values(adaptation.representations)), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var representation = _e.value;
                    if (representation.contentProtections !== undefined &&
                        representation.contentProtections.keyIds !== undefined) {
                        try {
                            for (var _f = (e_11 = void 0, __values(representation.contentProtections.keyIds)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var kidInf = _g.value;
                                set.add(kidInf.keyId);
                            }
                        }
                        catch (e_11_1) { e_11 = { error: e_11_1 }; }
                        finally {
                            try {
                                if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                            }
                            finally { if (e_11) throw e_11.error; }
                        }
                    }
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                }
                finally { if (e_10) throw e_10.error; }
            }
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (adaptations_1_1 && !adaptations_1_1.done && (_a = adaptations_1.return)) _a.call(adaptations_1);
        }
        finally { if (e_9) throw e_9.error; }
    }
}
