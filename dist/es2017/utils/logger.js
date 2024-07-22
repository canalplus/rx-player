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
import EventEmitter from "./event_emitter";
import getMonotonicTimeStamp from "./monotonic_timestamp";
import noop from "./noop";
const DEFAULT_LOG_LEVEL = "NONE";
/**
 * Logger implementation.
 * @class Logger
 */
export default class Logger extends EventEmitter {
    constructor() {
        super();
        this.error = noop;
        this.warn = noop;
        this.info = noop;
        this.debug = noop;
        this._levels = { NONE: 0, ERROR: 1, WARNING: 2, INFO: 3, DEBUG: 4 };
        this._currentFormat = "standard";
        this._currentLevel = DEFAULT_LOG_LEVEL;
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
    setLevel(levelStr, format, logFn) {
        let level;
        const foundLevel = this._levels[levelStr];
        if (typeof foundLevel === "number") {
            level = foundLevel;
            this._currentLevel = levelStr;
        }
        else {
            // not found
            level = 0;
            this._currentLevel = "NONE";
        }
        let actualFormat;
        if (format === "standard" || format === "full") {
            actualFormat = format;
        }
        else {
            actualFormat = "standard";
        }
        if (actualFormat === "full" && actualFormat !== this._currentFormat) {
            // Add the current Date so we can see at which time logs are displayed
            const now = getMonotonicTimeStamp();
            /* eslint-disable-next-line no-console */
            console.log(String(now.toFixed(2)), "[Init]", `Local-Date: ${Date.now()}`);
        }
        this._currentFormat = actualFormat;
        const generateLogFn = this._currentFormat === "full"
            ? (namespace, consoleFn) => {
                return (...args) => {
                    const now = getMonotonicTimeStamp();
                    return consoleFn(String(now.toFixed(2)), `[${namespace}]`, ...args);
                };
            }
            : (_namespace, consoleFn) => consoleFn;
        if (logFn === undefined) {
            /* eslint-disable no-invalid-this */
            /* eslint-disable no-console */
            this.error =
                level >= this._levels.ERROR
                    ? generateLogFn("error", console.error.bind(console))
                    : noop;
            this.warn =
                level >= this._levels.WARNING
                    ? generateLogFn("warn", console.warn.bind(console))
                    : noop;
            this.info =
                level >= this._levels.INFO
                    ? generateLogFn("info", console.info.bind(console))
                    : noop;
            this.debug =
                level >= this._levels.DEBUG
                    ? generateLogFn("log", console.log.bind(console))
                    : noop;
            /* eslint-enable no-console */
            /* eslint-enable no-invalid-this */
        }
        else {
            const produceLogFn = (logLevel, namespace) => {
                return level >= this._levels[logLevel]
                    ? (...args) => {
                        const now = getMonotonicTimeStamp();
                        return logFn(logLevel, [now, namespace, ...args]);
                    }
                    : noop;
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
    }
    /**
     * Get the last set logger level, as an upper-case string value.
     * @returns {string}
     */
    getLevel() {
        return this._currentLevel;
    }
    /**
     * Get the last set logger's log format.
     * @returns {string}
     */
    getFormat() {
        return this._currentFormat;
    }
    /**
     * Returns `true` if the currently set level includes logs of the level given
     * in argument.
     * @param {string} logLevel
     * @returns {boolean}
     */
    hasLevel(logLevel) {
        return this._levels[logLevel] >= this._levels[this._currentLevel];
    }
}
