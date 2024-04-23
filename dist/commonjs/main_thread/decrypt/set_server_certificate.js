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
exports.setServerCertificate = exports.trySettingServerCertificate = void 0;
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var server_certificate_store_1 = require("./utils/server_certificate_store");
/**
 * Call the setServerCertificate API with the given certificate.
 * Resolves on success, rejects on failure.
 *
 * TODO Handle returned value?
 * From the spec:
 *   - setServerCertificate resolves with true if everything worked
 *   - it resolves with false if the CDM does not support server
 *     certificates.
 *
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Promise}
 */
function setServerCertificate(mediaKeys, serverCertificate) {
    return __awaiter(this, void 0, void 0, function () {
        var res, error_1, reason;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, mediaKeys.setServerCertificate(serverCertificate)];
                case 1:
                    res = _a.sent();
                    // Note: Even if `setServerCertificate` technically should return a
                    // Promise.<boolean>, this is not technically always true.
                    // Thus we prefer to return unknown here.
                    return [2 /*return*/, res];
                case 2:
                    error_1 = _a.sent();
                    log_1.default.warn("DRM: mediaKeys.setServerCertificate returned an error", error_1 instanceof Error ? error_1 : "");
                    reason = error_1 instanceof Error ? error_1.toString() : "`setServerCertificate` error";
                    throw new errors_1.EncryptedMediaError("LICENSE_SERVER_CERTIFICATE_ERROR", reason);
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.setServerCertificate = setServerCertificate;
/**
 * Call the setCertificate API. If it fails just emit the error as warning
 * and complete.
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Promise.<Object>}
 */
function trySettingServerCertificate(mediaKeys, serverCertificate) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_2, formattedErr;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (server_certificate_store_1.default.hasOne(mediaKeys) === true) {
                        log_1.default.info("DRM: The MediaKeys already has a server certificate, skipping...");
                        return [2 /*return*/, { type: "already-has-one" }];
                    }
                    if (typeof mediaKeys.setServerCertificate !== "function") {
                        log_1.default.warn("DRM: Could not set the server certificate." +
                            " mediaKeys.setServerCertificate is not a function");
                        return [2 /*return*/, { type: "method-not-implemented" }];
                    }
                    log_1.default.info("DRM: Setting server certificate on the MediaKeys");
                    // Because of browser errors, or a user action that can lead to interrupting
                    // server certificate setting, we might be left in a status where we don't
                    // know if we attached the server certificate or not.
                    // Calling `prepare` allow to invalidate temporarily that status.
                    server_certificate_store_1.default.prepare(mediaKeys);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, setServerCertificate(mediaKeys, serverCertificate)];
                case 2:
                    result = _a.sent();
                    server_certificate_store_1.default.set(mediaKeys, serverCertificate);
                    return [2 /*return*/, { type: "success", value: result }];
                case 3:
                    error_2 = _a.sent();
                    formattedErr = (0, errors_1.isKnownError)(error_2)
                        ? error_2
                        : new errors_1.EncryptedMediaError("LICENSE_SERVER_CERTIFICATE_ERROR", "Unknown error when setting the server certificate.");
                    return [2 /*return*/, { type: "error", value: formattedErr }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.default = trySettingServerCertificate;
exports.trySettingServerCertificate = trySettingServerCertificate;
