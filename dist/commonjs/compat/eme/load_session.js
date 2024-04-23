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
var EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES = 100;
/**
 * Load a persistent session, based on its `sessionId`, on the given
 * MediaKeySession.
 *
 * Returns a Promise which resolves with:
 *   - `true` if the persistent MediaKeySession was found and loaded
 *   - `false` if no persistent MediaKeySession was found with that `sessionId`.
 *
 * The Promise rejects if anything goes wrong in the process.
 * @param {MediaKeySession} session
 * @param {string} sessionId
 * @returns {Promise.<boolean>}
 */
function loadSession(session, sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var isLoaded;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log_1.default.info("DRM: Load persisted session", sessionId);
                    return [4 /*yield*/, session.load(sessionId)];
                case 1:
                    isLoaded = _a.sent();
                    if (!isLoaded || session.keyStatuses.size > 0) {
                        return [2 /*return*/, isLoaded];
                    }
                    // A browser race condition can exist, seen for example in some
                    // Chromium/Chrome versions where the `keyStatuses` property from a loaded
                    // MediaKeySession would not be populated directly as the load answer but
                    // asynchronously after.
                    return [2 /*return*/, new Promise(function (resolve) {
                            session.addEventListener("keystatuseschange", resolveWithLoadedStatus);
                            var timeout = setTimeout(resolveWithLoadedStatus, EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES);
                            function resolveWithLoadedStatus() {
                                cleanUp();
                                resolve(isLoaded);
                            }
                            function cleanUp() {
                                clearTimeout(timeout);
                                session.removeEventListener("keystatuseschange", resolveWithLoadedStatus);
                            }
                        })];
            }
        });
    });
}
exports.default = loadSession;
