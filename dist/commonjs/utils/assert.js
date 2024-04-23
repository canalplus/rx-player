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
exports.assertUnreachable = exports.assertInterface = exports.AssertionError = void 0;
var is_null_or_undefined_1 = require("./is_null_or_undefined");
/**
 * Error due to an abnormal assertion fails.
 *
 * This should be an internal error which is later transformed into a documented
 * (as part of the API) Error instance before being emitted to the application.
 * @class AssertionError
 * @extends Error
 */
var AssertionError = /** @class */ (function (_super) {
    __extends(AssertionError, _super);
    /**
     * @param {string} message
     */
    function AssertionError(message) {
        var _this = _super.call(this) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, AssertionError.prototype);
        _this.name = "AssertionError";
        _this.message = message;
        return _this;
    }
    return AssertionError;
}(Error));
exports.AssertionError = AssertionError;
/**
 * Throw an AssertionError if the given assertion is false.
 * @param {boolean} assertion
 * @param {string} [message] - Optional message property for the AssertionError.
 * @throws AssertionError - Throws if the assertion given is false
 */
function assert(assertion, message) {
    if (1 /* __ENVIRONMENT__.DEV */ === 0 /* __ENVIRONMENT__.CURRENT_ENV */ &&
        !assertion) {
        throw new AssertionError(message === undefined ? "invalid assertion" : message);
    }
}
exports.default = assert;
/**
 * Throws if the given Object does not respect the interface.
 * @param {Object} o
 * @param {Object} iface - Contains the checked keynames of o and link them
 * to their types (obtained through the typeof operator).
 * @param {string} [name="object"] - name of the _interface_
 * @throws AssertionError - The argument o given is not an object
 * @throws AssertionError - The _interface_ is not respected.
 */
function assertInterface(o, iface, name) {
    if (name === void 0) { name = "object"; }
    assert(!(0, is_null_or_undefined_1.default)(o), "".concat(name, " should be an object"));
    for (var k in iface) {
        if (iface.hasOwnProperty(k)) {
            /* eslint-disable @typescript-eslint/restrict-template-expressions */
            assert(typeof o[k] === iface[k], "".concat(name, " should have property ").concat(k, " as a ").concat(iface[k]));
            /* eslint-enable @typescript-eslint/restrict-template-expressions */
        }
    }
}
exports.assertInterface = assertInterface;
/**
 * TypeScript hack to make sure a code path is never taken.
 *
 * This can for example be used to ensure that a switch statement handle all
 * possible cases by adding a default clause calling assertUnreachable with
 * an argument (it doesn't matter which one).
 *
 * @example
 * function parseBinary(str : "0" | "1") : number {
 *   switch (str) {
 *     case "0:
 *       return 0;
 *     case "1":
 *       return 1;
 *     default:
 *       // branch never taken. If it can be, TypeScript will yell at us because
 *       // its argument (here, `str`) is not of the right type.
 *       assertUnreachable(str);
 *   }
 * }
 * @param {*} _
 * @throws AssertionError - Throw an AssertionError when called. If we're
 * sufficiently strict with how we use TypeScript, this should never happen.
 */
function assertUnreachable(_) {
    throw new AssertionError("Unreachable path taken");
}
exports.assertUnreachable = assertUnreachable;
