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
var eme_1 = require("../../../compat/eme");
var log_1 = require("../../../log");
var assert_1 = require("../../../utils/assert");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var key_session_record_1 = require("./key_session_record");
/**
 * Create and store MediaKeySessions linked to a single MediaKeys
 * instance.
 *
 * Keep track of sessionTypes and of the initialization data each
 * MediaKeySession is created for.
 * @class LoadedSessionsStore
 */
var LoadedSessionsStore = /** @class */ (function () {
    /**
     * Create a new LoadedSessionsStore, which will store information about
     * loaded MediaKeySessions on the given MediaKeys instance.
     * @param {MediaKeys} mediaKeys
     */
    function LoadedSessionsStore(mediaKeys) {
        this._mediaKeys = mediaKeys;
        this._storage = [];
    }
    /**
     * Create a new MediaKeySession and store it in this store.
     * @param {Object} initData
     * @param {string} sessionType
     * @returns {Object}
     */
    LoadedSessionsStore.prototype.createSession = function (initData, sessionType) {
        var _this = this;
        var keySessionRecord = new key_session_record_1.default(initData);
        log_1.default.debug("DRM-LSS: calling `createSession`", sessionType);
        var mediaKeySession = this._mediaKeys.createSession(sessionType);
        var entry = {
            mediaKeySession: mediaKeySession,
            sessionType: sessionType,
            keySessionRecord: keySessionRecord,
            isGeneratingRequest: false,
            isLoadingPersistentSession: false,
            closingStatus: { type: "none" },
        };
        if (!(0, is_null_or_undefined_1.default)(mediaKeySession.closed)) {
            mediaKeySession.closed
                .then(function () {
                log_1.default.info("DRM-LSS: session was closed, removing it.", mediaKeySession.sessionId);
                var index = _this.getIndex(keySessionRecord);
                if (index >= 0 && _this._storage[index].mediaKeySession === mediaKeySession) {
                    _this._storage.splice(index, 1);
                }
            })
                .catch(function (e) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                log_1.default.warn("DRM-LSS: MediaKeySession.closed rejected: ".concat(e));
            });
        }
        this._storage.push(__assign({}, entry));
        log_1.default.debug("DRM-LSS: MediaKeySession added", entry.sessionType, this._storage.length);
        return entry;
    };
    /**
     * Find a stored entry compatible with the initialization data given and moves
     * this entry at the end of the `LoadedSessionsStore`''s storage, returned by
     * its `getAll` method.
     *
     * This can be used for example to tell when a previously-stored
     * entry is re-used to then be able to implement a caching replacement
     * algorithm based on the least-recently-used values by just evicting the first
     * values returned by `getAll`.
     * @param {Object} initializationData
     * @returns {Object|null}
     */
    LoadedSessionsStore.prototype.reuse = function (initializationData) {
        for (var i = this._storage.length - 1; i >= 0; i--) {
            var stored = this._storage[i];
            if (stored.keySessionRecord.isCompatibleWith(initializationData)) {
                this._storage.splice(i, 1);
                this._storage.push(stored);
                log_1.default.debug("DRM-LSS: Reusing session:", stored.mediaKeySession.sessionId, stored.sessionType);
                return __assign({}, stored);
            }
        }
        return null;
    };
    /**
     * Get `LoadedSessionsStore`'s entry for a given MediaKeySession.
     * Returns `null` if the given MediaKeySession is not stored in the
     * `LoadedSessionsStore`.
     * @param {MediaKeySession} mediaKeySession
     * @returns {Object|null}
     */
    LoadedSessionsStore.prototype.getEntryForSession = function (mediaKeySession) {
        for (var i = this._storage.length - 1; i >= 0; i--) {
            var stored = this._storage[i];
            if (stored.mediaKeySession === mediaKeySession) {
                return __assign({}, stored);
            }
        }
        return null;
    };
    /**
     * Generate a license request on the given MediaKeySession, while indicating
     * to the LoadedSessionsStore that a license-request is pending so
     * session-closing orders are properly scheduled after it is done.
     * @param {Object} mediaKeySession
     * @param {string} initializationDataType - Initialization data type given
     * e.g. by the "encrypted" event for the corresponding request.
     * @param {Uint8Array} initializationData - Initialization data given e.g. by
     * the "encrypted" event for the corresponding request.
     * @returns {Promise}
     */
    LoadedSessionsStore.prototype.generateLicenseRequest = function (mediaKeySession, initializationDataType, initializationData) {
        return __awaiter(this, void 0, void 0, function () {
            var entry, _a, _b, stored, err_1;
            var e_1, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        try {
                            for (_a = __values(this._storage), _b = _a.next(); !_b.done; _b = _a.next()) {
                                stored = _b.value;
                                if (stored.mediaKeySession === mediaKeySession) {
                                    entry = stored;
                                    break;
                                }
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        if (entry === undefined) {
                            log_1.default.error("DRM-LSS: generateRequest error. No MediaKeySession found with " +
                                "the given initData and initDataType");
                            return [2 /*return*/, (0, eme_1.generateKeyRequest)(mediaKeySession, initializationDataType, initializationData)];
                        }
                        entry.isGeneratingRequest = true;
                        // Note the `as string` is needed due to TypeScript not understanding that
                        // the `closingStatus` might change in the next checks
                        if (entry.closingStatus.type !== "none") {
                            throw new Error("The `MediaKeySession` is being closed.");
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, eme_1.generateKeyRequest)(mediaKeySession, initializationDataType, initializationData)];
                    case 2:
                        _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _d.sent();
                        if (entry === undefined) {
                            throw err_1;
                        }
                        entry.isGeneratingRequest = false;
                        if (entry.closingStatus.type === "awaiting") {
                            entry.closingStatus.start();
                        }
                        throw err_1;
                    case 4:
                        if (entry === undefined) {
                            return [2 /*return*/, undefined];
                        }
                        entry.isGeneratingRequest = false;
                        if (entry.closingStatus.type === "awaiting") {
                            entry.closingStatus.start();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * @param {Object} mediaKeySession
     * @param {string} sessionId
     * @returns {Promise}
     */
    LoadedSessionsStore.prototype.loadPersistentSession = function (mediaKeySession, sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var entry, _a, _b, stored, ret, err_2;
            var e_2, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        try {
                            for (_a = __values(this._storage), _b = _a.next(); !_b.done; _b = _a.next()) {
                                stored = _b.value;
                                if (stored.mediaKeySession === mediaKeySession) {
                                    entry = stored;
                                    break;
                                }
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        if (entry === undefined) {
                            log_1.default.error("DRM-LSS: loadPersistentSession error. No MediaKeySession found with " +
                                "the given initData and initDataType");
                            return [2 /*return*/, (0, eme_1.loadSession)(mediaKeySession, sessionId)];
                        }
                        entry.isLoadingPersistentSession = true;
                        // Note the `as string` is needed due to TypeScript not understanding that
                        // the `closingStatus` might change in the next checks
                        if (entry.closingStatus.type !== "none") {
                            throw new Error("The `MediaKeySession` is being closed.");
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, eme_1.loadSession)(mediaKeySession, sessionId)];
                    case 2:
                        ret = _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_2 = _d.sent();
                        if (entry === undefined) {
                            throw err_2;
                        }
                        entry.isLoadingPersistentSession = false;
                        if (entry.closingStatus.type === "awaiting") {
                            entry.closingStatus.start();
                        }
                        throw err_2;
                    case 4:
                        if (entry === undefined) {
                            return [2 /*return*/, ret];
                        }
                        entry.isLoadingPersistentSession = false;
                        if (entry.closingStatus.type === "awaiting") {
                            entry.closingStatus.start();
                        }
                        return [2 /*return*/, ret];
                }
            });
        });
    };
    /**
     * Close a MediaKeySession and remove its related stored information from the
     * `LoadedSessionsStore`.
     * Emit when done.
     * @param {Object} mediaKeySession
     * @returns {Promise}
     */
    LoadedSessionsStore.prototype.closeSession = function (mediaKeySession) {
        return __awaiter(this, void 0, void 0, function () {
            var entry, _a, _b, stored;
            var e_3, _c;
            return __generator(this, function (_d) {
                try {
                    for (_a = __values(this._storage), _b = _a.next(); !_b.done; _b = _a.next()) {
                        stored = _b.value;
                        if (stored.mediaKeySession === mediaKeySession) {
                            entry = stored;
                            break;
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                if (entry === undefined) {
                    log_1.default.warn("DRM-LSS: No MediaKeySession found with " + "the given initData and initDataType");
                    return [2 /*return*/, Promise.resolve(false)];
                }
                return [2 /*return*/, this._closeEntry(entry)];
            });
        });
    };
    /**
     * Returns the number of stored MediaKeySessions in this LoadedSessionsStore.
     * @returns {number}
     */
    LoadedSessionsStore.prototype.getLength = function () {
        return this._storage.length;
    };
    /**
     * Returns information about all stored MediaKeySession, in the order in which
     * the MediaKeySession have been created.
     * @returns {Array.<Object>}
     */
    LoadedSessionsStore.prototype.getAll = function () {
        return this._storage;
    };
    /**
     * Close all sessions in this store.
     * Emit `null` when done.
     * @returns {Promise}
     */
    LoadedSessionsStore.prototype.closeAllSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allEntries, closingProms;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        allEntries = this._storage;
                        log_1.default.debug("DRM-LSS: Closing all current MediaKeySessions", allEntries.length);
                        // re-initialize the storage, so that new interactions with the
                        // `LoadedSessionsStore` do not rely on MediaKeySessions we're in the
                        // process of removing
                        this._storage = [];
                        closingProms = allEntries.map(function (entry) { return _this._closeEntry(entry); });
                        return [4 /*yield*/, Promise.all(closingProms)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find the given `MediaKeySession` in the `LoadedSessionsStore` and removes
     * any reference to it without actually closing it.
     *
     * Returns `true` if the given `mediaKeySession` has been found and removed,
     * `false` otherwise.
     *
     * Note that this may create a `MediaKeySession` leakage in the wrong
     * conditions, cases where this method should be called should be very
     * carefully evaluated.
     * @param {MediaKeySession} mediaKeySession
     * @returns {boolean}
     */
    LoadedSessionsStore.prototype.removeSessionWithoutClosingIt = function (mediaKeySession) {
        (0, assert_1.default)(mediaKeySession.sessionId === "", "Initialized `MediaKeySession`s should always be properly closed");
        for (var i = this._storage.length - 1; i >= 0; i--) {
            var stored = this._storage[i];
            if (stored.mediaKeySession === mediaKeySession) {
                log_1.default.debug("DRM-LSS: Removing session without closing it", mediaKeySession.sessionId);
                this._storage.splice(i, 1);
                return true;
            }
        }
        return false;
    };
    /**
     * Get the index of a stored MediaKeySession entry based on its
     * `KeySessionRecord`.
     * Returns -1 if not found.
     * @param {Object} record
     * @returns {number}
     */
    LoadedSessionsStore.prototype.getIndex = function (record) {
        for (var i = 0; i < this._storage.length; i++) {
            var stored = this._storage[i];
            if (stored.keySessionRecord === record) {
                return i;
            }
        }
        return -1;
    };
    /**
     * Prepare the closure of a `MediaKeySession` stored as an entry of the
     * `LoadedSessionsStore`.
     * Allows to postpone the closure action if another MediaKeySession action
     * is already pending.
     * @param {Object} entry
     * @returns {Promise.<boolean>}
     */
    LoadedSessionsStore.prototype._closeEntry = function (entry) {
        return __awaiter(this, void 0, void 0, function () {
            var mediaKeySession;
            return __generator(this, function (_a) {
                mediaKeySession = entry.mediaKeySession;
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (entry !== undefined &&
                            (entry.isLoadingPersistentSession || entry.isGeneratingRequest)) {
                            entry.closingStatus = {
                                type: "awaiting",
                                start: tryClosingEntryAndResolve,
                            };
                        }
                        else {
                            tryClosingEntryAndResolve();
                        }
                        function tryClosingEntryAndResolve() {
                            if (entry !== undefined) {
                                entry.closingStatus = { type: "pending" };
                            }
                            safelyCloseMediaKeySession(mediaKeySession)
                                .then(function () {
                                if (entry !== undefined) {
                                    entry.closingStatus = { type: "done" };
                                }
                                resolve(true);
                            })
                                .catch(function (err) {
                                if (entry !== undefined) {
                                    entry.closingStatus = { type: "failed" };
                                }
                                reject(err);
                            });
                        }
                    })];
            });
        });
    };
    return LoadedSessionsStore;
}());
exports.default = LoadedSessionsStore;
/**
 * Close a MediaKeySession and just log an error if it fails (while resolving).
 * Emits then complete when done.
 * @param {MediaKeySession} mediaKeySession
 * @returns {Promise}
 */
function safelyCloseMediaKeySession(mediaKeySession) {
    return __awaiter(this, void 0, void 0, function () {
        var err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log_1.default.debug("DRM: Trying to close a MediaKeySession", mediaKeySession.sessionId);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, eme_1.closeSession)(mediaKeySession)];
                case 2:
                    _a.sent();
                    log_1.default.debug("DRM: Succeeded to close MediaKeySession");
                    return [2 /*return*/];
                case 3:
                    err_3 = _a.sent();
                    log_1.default.error("DRM: Could not close MediaKeySession: " +
                        (err_3 instanceof Error ? err_3.toString() : "Unknown error"));
                    return [2 /*return*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
