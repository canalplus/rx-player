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
var cancellable_sleep_1 = require("../../utils/cancellable_sleep");
var task_canceller_1 = require("../../utils/task_canceller");
/**
 * Close the given `MediaKeySession` and returns a Promise resolving when the
 * session is closed.
 * This promise does not reject, even if we're unable to close the
 * `MediaKeySession`.
 *
 * Note that there is a lot of browser issues linked to the impossibility to
 * either close a MediaKeySession or to know if a MediaKeySession was closed.
 * Due to this, the returned Promise might take some time before resolving on
 * some devices.
 * @param {MediaKeySession|Object} session
 * @returns {Promise.<undefined>}
 */
function closeSession(session) {
    var timeoutCanceller = new task_canceller_1.default();
    return Promise.race([
        session.close().then(function () {
            timeoutCanceller.cancel();
        }),
        // The `closed` promise may resolve, even if `close()` result has not
        // (seen at some point on Firefox).
        session.closed.then(function () {
            timeoutCanceller.cancel();
        }),
        waitTimeoutAndCheck(),
    ]);
    /**
     * If the session is not closed after 1000ms, try to communicate with the
     * MediaKeySession and check if an error is returned.
     * This is needed because on some browsers with poor EME implementation,
     * knowing when a MediaKeySession is closed is actually a hard task.
     *
     * The returned Promise will never reject.
     * @returns {Promise.<undefined>}
     */
    function waitTimeoutAndCheck() {
        return __awaiter(this, void 0, void 0, function () {
            var err_1, message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, (0, cancellable_sleep_1.default)(1000, timeoutCanceller.signal)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, tryUpdatingSession()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        if (err_1 instanceof task_canceller_1.CancellationError) {
                            // cancelled == session closed
                            return [2 /*return*/];
                        }
                        message = err_1 instanceof Error
                            ? err_1.message
                            : "Unknown error made it impossible to close the session";
                        log_1.default.error("DRM: ".concat(message));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    /**
     * Try to update `MediaKeySession` and check its error if it failed.
     * If we still don't know whether it closed yet, wait a second
     * timeout then quit.
     *
     * The returned Promise resolves if the `MediaKeySession` seems closed and
     * rejects if we couldn't know or it doesn't.
     * @returns {Promise.<undefined>}
     */
    function tryUpdatingSession() {
        return __awaiter(this, void 0, void 0, function () {
            var err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, session.update(new Uint8Array(1))];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        err_2 = _a.sent();
                        if (timeoutCanceller.isUsed()) {
                            // Reminder: cancelled == session closed
                            return [2 /*return*/];
                        }
                        // The caught error can tell if session is closed
                        // (Chrome may throw this error)
                        // I know... Checking the error message is not the best practice ever.
                        if (err_2 instanceof Error && err_2.message === "The session is already closed.") {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, cancellable_sleep_1.default)(1000, timeoutCanceller.signal)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        if (timeoutCanceller.isUsed()) {
                            // Reminder: cancelled == session closed
                            return [2 /*return*/];
                        }
                        throw new Error("Compat: Couldn't know if session is closed");
                }
            });
        });
    }
}
exports.default = closeSession;
