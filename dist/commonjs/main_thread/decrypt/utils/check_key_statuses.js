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
exports.DecommissionedSessionError = void 0;
var get_uuid_kid_from_keystatus_kid_1 = require("../../../compat/eme/get_uuid_kid_from_keystatus_kid");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var assert_1 = require("../../../utils/assert");
var string_parsing_1 = require("../../../utils/string_parsing");
/**
 * Error thrown when the MediaKeySession has to be closed due to a trigger
 * specified by user configuration.
 * Such MediaKeySession should be closed immediately and may be re-created if
 * needed again.
 * @class DecommissionedSessionError
 * @extends Error
 */
var DecommissionedSessionError = /** @class */ (function (_super) {
    __extends(DecommissionedSessionError, _super);
    /**
     * Creates a new `DecommissionedSessionError`.
     * @param {Error} reason - Error that led to the decision to close the
     * current MediaKeySession. Should be used for reporting purposes.
     */
    function DecommissionedSessionError(reason) {
        var _this = _super.call(this) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, DecommissionedSessionError.prototype);
        _this.reason = reason;
        return _this;
    }
    return DecommissionedSessionError;
}(Error));
exports.DecommissionedSessionError = DecommissionedSessionError;
var KEY_STATUSES = {
    EXPIRED: "expired",
    INTERNAL_ERROR: "internal-error",
    OUTPUT_RESTRICTED: "output-restricted",
};
/**
 * Look at the current key statuses in the sessions and construct the
 * appropriate warnings, whitelisted and blacklisted key ids.
 *
 * Throws if one of the keyID is on an error.
 * @param {MediaKeySession} session - The MediaKeySession from which the keys
 * will be checked.
 * @param {Object} options
 * @param {String} keySystem - The configuration keySystem used for deciphering
 * @returns {Object} - Warnings to send, whitelisted and blacklisted key ids.
 */
function checkKeyStatuses(session, options, keySystem) {
    var onKeyInternalError = options.onKeyInternalError, onKeyOutputRestricted = options.onKeyOutputRestricted, onKeyExpiration = options.onKeyExpiration;
    var blacklistedKeyIds = [];
    var whitelistedKeyIds = [];
    var badKeyStatuses = [];
    session.keyStatuses.forEach(function (_arg1, _arg2) {
        // Hack present because the order of the arguments has changed in spec
        // and is not the same between some versions of Edge and Chrome.
        var _a = __read((function () {
            return (typeof _arg1 === "string" ? [_arg1, _arg2] : [_arg2, _arg1]);
        })(), 2), keyStatus = _a[0], keyStatusKeyId = _a[1];
        var keyId = (0, get_uuid_kid_from_keystatus_kid_1.default)(keySystem, new Uint8Array(keyStatusKeyId));
        var keyStatusObj = { keyId: keyId.buffer, keyStatus: keyStatus };
        if (log_1.default.hasLevel("DEBUG")) {
            log_1.default.debug("DRM: key status update (".concat((0, string_parsing_1.bytesToHex)(keyId), "): ").concat(keyStatus));
        }
        switch (keyStatus) {
            case KEY_STATUSES.EXPIRED: {
                var error = new errors_1.EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", "A decryption key expired (".concat((0, string_parsing_1.bytesToHex)(keyId), ")"), { keyStatuses: __spreadArray([keyStatusObj], __read(badKeyStatuses), false) });
                if (onKeyExpiration === "error" || onKeyExpiration === undefined) {
                    throw error;
                }
                switch (onKeyExpiration) {
                    case "close-session":
                        throw new DecommissionedSessionError(error);
                    case "fallback":
                        blacklistedKeyIds.push(keyId);
                        break;
                    default:
                        // I weirdly stopped relying on switch-cases here due to some TypeScript
                        // issue, not checking properly `case undefined` (bug?)
                        if (onKeyExpiration === "continue" || onKeyExpiration === undefined) {
                            whitelistedKeyIds.push(keyId);
                        }
                        else {
                            // Compile-time check throwing when not all possible cases are handled
                            (0, assert_1.assertUnreachable)(onKeyExpiration);
                        }
                        break;
                }
                badKeyStatuses.push(keyStatusObj);
                break;
            }
            case KEY_STATUSES.INTERNAL_ERROR: {
                var error = new errors_1.EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", "A \"".concat(keyStatus, "\" status has been encountered (").concat((0, string_parsing_1.bytesToHex)(keyId), ")"), { keyStatuses: __spreadArray([keyStatusObj], __read(badKeyStatuses), false) });
                switch (onKeyInternalError) {
                    case undefined:
                    case "error":
                        throw error;
                    case "close-session":
                        throw new DecommissionedSessionError(error);
                    case "fallback":
                        blacklistedKeyIds.push(keyId);
                        break;
                    case "continue":
                        whitelistedKeyIds.push(keyId);
                        break;
                    default:
                        // Weirdly enough, TypeScript is not checking properly
                        // `case undefined` (bug?)
                        if (onKeyInternalError !== undefined) {
                            (0, assert_1.assertUnreachable)(onKeyInternalError);
                        }
                        else {
                            throw error;
                        }
                }
                badKeyStatuses.push(keyStatusObj);
                break;
            }
            case KEY_STATUSES.OUTPUT_RESTRICTED: {
                var error = new errors_1.EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", "A \"".concat(keyStatus, "\" status has been encountered (").concat((0, string_parsing_1.bytesToHex)(keyId), ")"), { keyStatuses: __spreadArray([keyStatusObj], __read(badKeyStatuses), false) });
                switch (onKeyOutputRestricted) {
                    case undefined:
                    case "error":
                        throw error;
                    case "fallback":
                        blacklistedKeyIds.push(keyId);
                        break;
                    case "continue":
                        whitelistedKeyIds.push(keyId);
                        break;
                    default:
                        // Weirdly enough, TypeScript is not checking properly
                        // `case undefined` (bug?)
                        if (onKeyOutputRestricted !== undefined) {
                            (0, assert_1.assertUnreachable)(onKeyOutputRestricted);
                        }
                        else {
                            throw error;
                        }
                }
                badKeyStatuses.push(keyStatusObj);
                break;
            }
            default:
                whitelistedKeyIds.push(keyId);
                break;
        }
    });
    var warning;
    if (badKeyStatuses.length > 0) {
        warning = new errors_1.EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", "One or several problematic key statuses have been encountered", { keyStatuses: badKeyStatuses });
    }
    return { warning: warning, blacklistedKeyIds: blacklistedKeyIds, whitelistedKeyIds: whitelistedKeyIds };
}
exports.default = checkKeyStatuses;
