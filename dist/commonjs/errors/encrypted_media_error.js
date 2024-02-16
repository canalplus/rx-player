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
Object.defineProperty(exports, "__esModule", { value: true });
var error_codes_1 = require("./error_codes");
var error_message_1 = require("./error_message");
/**
 * Error linked to the encryption of the media.
 *
 * @class EncryptedMediaError
 * @extends Error
 */
var EncryptedMediaError = /** @class */ (function (_super) {
    __extends(EncryptedMediaError, _super);
    function EncryptedMediaError(code, reason, supplementaryInfos) {
        var _this = _super.call(this) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, EncryptedMediaError.prototype);
        _this.name = "EncryptedMediaError";
        _this.type = error_codes_1.ErrorTypes.ENCRYPTED_MEDIA_ERROR;
        _this.code = code;
        _this._originalMessage = reason;
        _this.message = (0, error_message_1.default)(_this.code, reason);
        _this.fatal = false;
        if (typeof (supplementaryInfos === null || supplementaryInfos === void 0 ? void 0 : supplementaryInfos.keyStatuses) === "string") {
            _this.keyStatuses = supplementaryInfos.keyStatuses;
        }
        return _this;
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    EncryptedMediaError.prototype.serialize = function () {
        return {
            name: this.name,
            code: this.code,
            reason: this._originalMessage,
            keyStatuses: this.keyStatuses,
        };
    };
    return EncryptedMediaError;
}(Error));
exports.default = EncryptedMediaError;
