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
var log_1 = require("../../log");
var is_session_usable_1 = require("./utils/is_session_usable");
/**
 * Create a new Session or load a persistent one on the given MediaKeys,
 * according to wanted settings and what is currently stored.
 *
 * If session creating fails, remove the oldest MediaKeySession loaded and
 * retry.
 *
 * /!\ This only creates new sessions.
 * It will fail if loadedSessionsStore already has a MediaKeySession with
 * the given initialization data.
 * @param {Object} stores
 * @param {Object} initData
 * @param {string} wantedSessionType
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function createSession(stores, initData, wantedSessionType, cancelSignal) {
    var loadedSessionsStore = stores.loadedSessionsStore, persistentSessionsStore = stores.persistentSessionsStore;
    if (wantedSessionType === "temporary") {
        return createTemporarySession(loadedSessionsStore, initData);
    }
    else if (persistentSessionsStore === null) {
        log_1.default.warn("DRM: Cannot create persistent MediaKeySession, " +
            "PersistentSessionsStore not created.");
        return createTemporarySession(loadedSessionsStore, initData);
    }
    return createAndTryToRetrievePersistentSession(loadedSessionsStore, persistentSessionsStore, initData, cancelSignal);
}
exports.default = createSession;
/**
 * Create a new temporary MediaKeySession linked to the given initData and
 * initDataType.
 * @param {Object} loadedSessionsStore
 * @param {Object} initData
 * @returns {Promise}
 */
function createTemporarySession(loadedSessionsStore, initData) {
    log_1.default.info("DRM: Creating a new temporary session");
    var entry = loadedSessionsStore.createSession(initData, "temporary");
    return Promise.resolve({
        type: "created-session" /* MediaKeySessionLoadingType.Created */,
        value: entry,
    });
}
/**
 * Create a persistent MediaKeySession and try to load on it a previous
 * MediaKeySession linked to the same initialization data.
 * @param {Object} loadedSessionsStore
 * @param {Object} persistentSessionsStore
 * @param {Object} initData
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function createAndTryToRetrievePersistentSession(loadedSessionsStore, persistentSessionsStore, initData, cancelSignal) {
    return __awaiter(this, void 0, void 0, function () {
        /**
         * Helper function to close and restart the current persistent session
         * considered, and re-create it from scratch.
         * @returns {Promise.<Object>}
         */
        function recreatePersistentSession() {
            return __awaiter(this, void 0, void 0, function () {
                var persistentEntry, err_2, newEntry;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (cancelSignal.cancellationError !== null) {
                                throw cancelSignal.cancellationError;
                            }
                            log_1.default.info("DRM: Removing previous persistent session.");
                            persistentEntry = persistentSessionsStore.get(initData);
                            if (persistentEntry !== null) {
                                persistentSessionsStore.delete(persistentEntry.sessionId);
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, loadedSessionsStore.closeSession(entry.mediaKeySession)];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            err_2 = _a.sent();
                            // From reading the EME specification in details, it seems that a
                            // `MediaKeySession`'s ability to be closed is tightly linked to its
                            // possession of a "sanitized session ID" set as `sessionId`.
                            // This is never clearly stated however and I'm (Paul B.) always afraid of
                            // breaking compatibility when it comes to EME code.
                            // So we still try to close the `MediaKeySession` in any case, only, if it
                            // fails and it didn't had any `sessionId` set, we just ignore the error.
                            // Note that trying to close the `MediaKeySession` might incur some delays
                            // in those rare cases.
                            if (entry.mediaKeySession.sessionId !== "") {
                                throw err_2;
                            }
                            loadedSessionsStore.removeSessionWithoutClosingIt(entry.mediaKeySession);
                            return [3 /*break*/, 4];
                        case 4:
                            if (cancelSignal.cancellationError !== null) {
                                throw cancelSignal.cancellationError;
                            }
                            newEntry = loadedSessionsStore.createSession(initData, "persistent-license");
                            return [2 /*return*/, { type: "created-session" /* MediaKeySessionLoadingType.Created */, value: newEntry }];
                    }
                });
            });
        }
        var entry, storedEntry, hasLoadedSession, newEntry, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (cancelSignal.cancellationError !== null) {
                        throw cancelSignal.cancellationError;
                    }
                    log_1.default.info("DRM: Creating persistent MediaKeySession");
                    entry = loadedSessionsStore.createSession(initData, "persistent-license");
                    storedEntry = persistentSessionsStore.getAndReuse(initData);
                    if (storedEntry === null) {
                        return [2 /*return*/, { type: "created-session" /* MediaKeySessionLoadingType.Created */, value: entry }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, loadedSessionsStore.loadPersistentSession(entry.mediaKeySession, storedEntry.sessionId)];
                case 2:
                    hasLoadedSession = _a.sent();
                    if (!hasLoadedSession) {
                        log_1.default.warn("DRM: No data stored for the loaded session");
                        persistentSessionsStore.delete(storedEntry.sessionId);
                        // The EME specification is kind of implicit about it but it seems from my
                        // understanding (Paul B.) that a MediaKeySession on wich a `load` attempt
                        // did not succeed due to the loaded session not being found by the
                        // browser/CDM, should neither be used anymore nor closed.
                        // Thus, we're creating another `"persistent-license"` `MediaKeySession`
                        // in that specific case.
                        loadedSessionsStore.removeSessionWithoutClosingIt(entry.mediaKeySession);
                        newEntry = loadedSessionsStore.createSession(initData, "persistent-license");
                        return [2 /*return*/, { type: "created-session" /* MediaKeySessionLoadingType.Created */, value: newEntry }];
                    }
                    if (hasLoadedSession && (0, is_session_usable_1.default)(entry.mediaKeySession)) {
                        persistentSessionsStore.add(initData, initData.keyIds, entry.mediaKeySession);
                        log_1.default.info("DRM: Succeeded to load persistent session.");
                        return [2 /*return*/, {
                                type: "loaded-persistent-session" /* MediaKeySessionLoadingType.LoadedPersistentSession */,
                                value: entry,
                            }];
                    }
                    // Unusable persistent session: recreate a new session from scratch.
                    log_1.default.warn("DRM: Previous persistent session not usable anymore.");
                    return [2 /*return*/, recreatePersistentSession()];
                case 3:
                    err_1 = _a.sent();
                    log_1.default.warn("DRM: Unable to load persistent session: " +
                        (err_1 instanceof Error ? err_1.toString() : "Unknown Error"));
                    return [2 /*return*/, recreatePersistentSession()];
                case 4: return [2 /*return*/];
            }
        });
    });
}
