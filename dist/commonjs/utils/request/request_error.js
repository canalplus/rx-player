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
exports.RequestErrorTypes = void 0;
/**
 * Internal Error used when doing requests through fetch / XHRs.
 *
 * It is not part of the API, as such it is only a temporary error which is
 * later converted to another Error instance (e.g. NETWORK_ERROR).
 *
 * @class RequestError
 * @extends Error
 */
var RequestError = /** @class */ (function (_super) {
    __extends(RequestError, _super);
    /**
     * @param {string} url
     * @param {number} status
     * @param {string} type
     */
    function RequestError(url, status, type) {
        var _this = _super.call(this) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, RequestError.prototype);
        _this.name = "RequestError";
        _this.url = url;
        _this.status = status;
        _this.type = type;
        switch (type) {
            case "TIMEOUT":
                _this.message = "The request timed out";
                break;
            case "ERROR_EVENT":
                _this.message = "An error prevented the request to be performed successfully";
                break;
            case "PARSE_ERROR":
                _this.message = "An error happened while formatting the response data";
                break;
            case "ERROR_HTTP_CODE":
                _this.message =
                    "An HTTP status code indicating failure was received: " + String(_this.status);
                break;
        }
        return _this;
    }
    RequestError.prototype.serialize = function () {
        return { url: this.url, status: this.status, type: this.type };
    };
    return RequestError;
}(Error));
exports.default = RequestError;
var RequestErrorTypes = {
    TIMEOUT: "TIMEOUT",
    ERROR_EVENT: "ERROR_EVENT",
    ERROR_HTTP_CODE: "ERROR_HTTP_CODE",
    PARSE_ERROR: "PARSE_ERROR",
};
exports.RequestErrorTypes = RequestErrorTypes;
