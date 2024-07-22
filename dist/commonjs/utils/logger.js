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
var event_emitter_1 = require("./event_emitter");
var monotonic_timestamp_1 = require("./monotonic_timestamp");
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
        _this._currentFormat = "standard";
        _this._currentLevel = DEFAULT_LOG_LEVEL;
        return _this;
    }
    /**
     * Update the logger's level to increase or decrease its verbosity, to change
     * its format with a newly set one, or to update its logging function.
     * @param {string} levelStr - One of the [upper-case] logger level. If the
     * given level is not valid, it will default to `"NONE"`.
     * @param {function|undefined} [logFn] - Optional logger function which will
     * be called with logs (with the corresponding upper-case logger level as
     * first argument).
     * Can be omited to just rely on regular logging functions.
     */
    Logger.prototype.setLevel = function (levelStr, format, logFn) {
        var _this = this;
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
        var actualFormat;
        if (format === "standard" || format === "full") {
            actualFormat = format;
        }
        else {
            actualFormat = "standard";
        }
        if (actualFormat === "full" && actualFormat !== this._currentFormat) {
            // Add the current Date so we can see at which time logs are displayed
            var now = (0, monotonic_timestamp_1.default)();
            /* eslint-disable-next-line no-console */
            console.log(String(now.toFixed(2)), "[Init]", "Local-Date: ".concat(Date.now()));
        }
        this._currentFormat = actualFormat;
        var generateLogFn = this._currentFormat === "full"
            ? function (namespace, consoleFn) {
                return function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    var now = (0, monotonic_timestamp_1.default)();
                    return consoleFn.apply(void 0, __spreadArray([String(now.toFixed(2)), "[".concat(namespace, "]")], __read(args), false));
                };
            }
            : function (_namespace, consoleFn) { return consoleFn; };
        if (logFn === undefined) {
            /* eslint-disable no-invalid-this */
            /* eslint-disable no-console */
            this.error =
                level >= this._levels.ERROR
                    ? generateLogFn("error", console.error.bind(console))
                    : noop_1.default;
            this.warn =
                level >= this._levels.WARNING
                    ? generateLogFn("warn", console.warn.bind(console))
                    : noop_1.default;
            this.info =
                level >= this._levels.INFO
                    ? generateLogFn("info", console.info.bind(console))
                    : noop_1.default;
            this.debug =
                level >= this._levels.DEBUG
                    ? generateLogFn("log", console.log.bind(console))
                    : noop_1.default;
            /* eslint-enable no-console */
            /* eslint-enable no-invalid-this */
        }
        else {
            var produceLogFn = function (logLevel, namespace) {
                return level >= _this._levels[logLevel]
                    ? function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        var now = (0, monotonic_timestamp_1.default)();
                        return logFn(logLevel, __spreadArray([now, namespace], __read(args), false));
                    }
                    : noop_1.default;
            };
            this.error = produceLogFn("ERROR", "error");
            this.warn = produceLogFn("WARNING", "warn");
            this.info = produceLogFn("INFO", "info");
            this.debug = produceLogFn("DEBUG", "log");
        }
        this.trigger("onLogLevelChange", {
            level: this._currentLevel,
            format: this._currentFormat,
        });
    };
    /**
     * Get the last set logger level, as an upper-case string value.
     * @returns {string}
     */
    Logger.prototype.getLevel = function () {
        return this._currentLevel;
    };
    /**
     * Get the last set logger's log format.
     * @returns {string}
     */
    Logger.prototype.getFormat = function () {
        return this._currentFormat;
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
