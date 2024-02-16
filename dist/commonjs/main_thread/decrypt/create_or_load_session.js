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
var create_session_1 = require("./create_session");
var clean_old_loaded_sessions_1 = require("./utils/clean_old_loaded_sessions");
var is_session_usable_1 = require("./utils/is_session_usable");
/**
 * Handle MediaEncryptedEvents sent by a HTMLMediaElement:
 * Either create a MediaKeySession, recuperate a previous MediaKeySession or
 * load a persistent session.
 *
 * Some previously created MediaKeySession can be closed in this process to
 * respect the maximum limit of concurrent MediaKeySession, as defined by the
 * `EME_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS` config property.
 *
 * You can refer to the events emitted to know about the current situation.
 * @param {Object} initializationData
 * @param {Object} stores
 * @param {string} wantedSessionType
 * @param {number} maxSessionCacheSize
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function createOrLoadSession(initializationData, stores, wantedSessionType, maxSessionCacheSize, cancelSignal) {
    return __awaiter(this, void 0, void 0, function () {
        var previousLoadedSession, loadedSessionsStore, persistentSessionsStore, entry, evt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previousLoadedSession = null;
                    loadedSessionsStore = stores.loadedSessionsStore, persistentSessionsStore = stores.persistentSessionsStore;
                    entry = loadedSessionsStore.reuse(initializationData);
                    if (entry !== null) {
                        previousLoadedSession = entry.mediaKeySession;
                        if ((0, is_session_usable_1.default)(previousLoadedSession)) {
                            log_1.default.info("DRM: Reuse loaded session", previousLoadedSession.sessionId);
                            return [2 /*return*/, {
                                    type: "loaded-open-session" /* MediaKeySessionLoadingType.LoadedOpenSession */,
                                    value: {
                                        mediaKeySession: previousLoadedSession,
                                        sessionType: entry.sessionType,
                                        keySessionRecord: entry.keySessionRecord,
                                    },
                                }];
                        }
                        else if (persistentSessionsStore !== null) {
                            // If the session is not usable anymore, we can also remove it from the
                            // PersistentSessionsStore.
                            // TODO Are we sure this is always what we want?
                            if (entry.mediaKeySession.sessionId !== "") {
                                persistentSessionsStore.delete(entry.mediaKeySession.sessionId);
                            }
                        }
                    }
                    if (!(previousLoadedSession !== null)) return [3 /*break*/, 2];
                    return [4 /*yield*/, loadedSessionsStore.closeSession(previousLoadedSession)];
                case 1:
                    _a.sent();
                    if (cancelSignal.cancellationError !== null) {
                        throw cancelSignal.cancellationError; // stop here if cancelled since
                    }
                    _a.label = 2;
                case 2: return [4 /*yield*/, (0, clean_old_loaded_sessions_1.default)(loadedSessionsStore, maxSessionCacheSize)];
                case 3:
                    _a.sent();
                    if (cancelSignal.cancellationError !== null) {
                        throw cancelSignal.cancellationError; // stop here if cancelled since
                    }
                    return [4 /*yield*/, (0, create_session_1.default)(stores, initializationData, wantedSessionType, cancelSignal)];
                case 4:
                    evt = _a.sent();
                    return [2 /*return*/, {
                            type: evt.type,
                            value: {
                                mediaKeySession: evt.value.mediaKeySession,
                                sessionType: evt.value.sessionType,
                                keySessionRecord: evt.value.keySessionRecord,
                            },
                        }];
            }
        });
    });
}
exports.default = createOrLoadSession;
