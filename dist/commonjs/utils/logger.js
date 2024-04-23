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
var event_emitter_1 = require("./event_emitter");
var noop_1 = require("./noop");
var DEFAULT_LOG_LEVEL = "NONE";
/**
 * Logger implementation.
 * @class Logger
 */
var Logger = /** @class */ (function (_super) {
    __extends(Logger, _super);
    function Logger() {
        var _this = _super.call(this) || this;
        _this.error = noop_1.default;
        _this.warn = noop_1.default;
        _this.info = noop_1.default;
        _this.debug = noop_1.default;
        _this._levels = { NONE: 0, ERROR: 1, WARNING: 2, INFO: 3, DEBUG: 4 };
        _this._currentLevel = DEFAULT_LOG_LEVEL;
        return _this;
    }
    /**
     * @param {string} levelStr
     * @param {function} [logFn]
     */
    Logger.prototype.setLevel = function (levelStr, logFn) {
        var level;
        var foundLevel = this._levels[levelStr];
        if (typeof foundLevel === "number") {
            level = foundLevel;
            this._currentLevel = levelStr;
        }
        else {
            // not found
            level = 0;
            this._currentLevel = "NONE";
        }
        if (logFn === undefined) {
            /* eslint-disable no-invalid-this */
            /* eslint-disable no-console */
            this.error = level >= this._levels.ERROR ? console.error.bind(console) : noop_1.default;
            this.warn = level >= this._levels.WARNING ? console.warn.bind(console) : noop_1.default;
            this.info = level >= this._levels.INFO ? console.info.bind(console) : noop_1.default;
            this.debug = level >= this._levels.DEBUG ? console.log.bind(console) : noop_1.default;
            /* eslint-enable no-console */
            /* eslint-enable no-invalid-this */
        }
        else {
            this.error = level >= this._levels.ERROR ? function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return logFn("ERROR", args);
            } : noop_1.default;
            this.warn =
                level >= this._levels.WARNING ? function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return logFn("WARNING", args);
                } : noop_1.default;
            this.info = level >= this._levels.INFO ? function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return logFn("INFO", args);
            } : noop_1.default;
            this.debug = level >= this._levels.DEBUG ? function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return logFn("DEBUG", args);
            } : noop_1.default;
        }
        this.trigger("onLogLevelChange", this._currentLevel);
    };
    /**
     * @returns {string}
     */
    Logger.prototype.getLevel = function () {
        return this._currentLevel;
    };
    /**
     * Returns `true` if the currently set level includes logs of the level given
     * in argument.
     * @param {string} logLevel
     * @returns {boolean}
     */
    Logger.prototype.hasLevel = function (logLevel) {
        return this._levels[logLevel] >= this._levels[this._currentLevel];
    };
    return Logger;
}(event_emitter_1.default));
exports.default = Logger;
