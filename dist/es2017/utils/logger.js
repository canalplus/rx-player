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
        this._currentLevel = DEFAULT_LOG_LEVEL;
    }
    /**
     * @param {string} levelStr
     * @param {function} [logFn]
     */
    setLevel(levelStr, logFn) {
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
        if (logFn === undefined) {
            /* eslint-disable no-invalid-this */
            /* eslint-disable no-console */
            this.error = level >= this._levels.ERROR ? console.error.bind(console) : noop;
            this.warn = level >= this._levels.WARNING ? console.warn.bind(console) : noop;
            this.info = level >= this._levels.INFO ? console.info.bind(console) : noop;
            this.debug = level >= this._levels.DEBUG ? console.log.bind(console) : noop;
            /* eslint-enable no-console */
            /* eslint-enable no-invalid-this */
        }
        else {
            this.error = level >= this._levels.ERROR ? (...args) => logFn("ERROR", args) : noop;
            this.warn =
                level >= this._levels.WARNING ? (...args) => logFn("WARNING", args) : noop;
            this.info = level >= this._levels.INFO ? (...args) => logFn("INFO", args) : noop;
            this.debug = level >= this._levels.DEBUG ? (...args) => logFn("DEBUG", args) : noop;
        }
        this.trigger("onLogLevelChange", this._currentLevel);
    }
    /**
     * @returns {string}
     */
    getLevel() {
        return this._currentLevel;
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
