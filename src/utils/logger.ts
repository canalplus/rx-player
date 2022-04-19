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

import noop from "./noop";

export type ILoggerLevel = "NONE" |
                           "ERROR" |
                           "WARNING" |
                           "INFO" |
                           "DEBUG";

type IConsoleFn = (
  ...args : Array<boolean | string | number | Error | null | undefined>
) => void;

/**
 * Logger implementation.
 * @class Logger
 */
export default class Logger {
  public error : IConsoleFn;
  public warn : IConsoleFn;
  public info : IConsoleFn;
  public debug : IConsoleFn;
  private _currentLevel : ILoggerLevel;
  private _shouldIncludeTimeStamp : boolean;
  private readonly _levels : Record<ILoggerLevel, number>;

  constructor() {
    this.error = noop;
    this.warn = noop;
    this.info = noop;
    this.debug = noop;
    this._levels = { NONE: 0,
                     ERROR: 1,
                     WARNING: 2,
                     INFO: 3,
                     DEBUG: 4 };
    this._currentLevel = "NONE";
    this._shouldIncludeTimeStamp = false;
  }

  /**
   * Update current log level.
   * Should be either (by verbosity ascending):
   *   - "NONE"
   *   - "ERROR"
   *   - "WARNING"
   *   - "INFO"
   *   - "DEBUG"
   * Any other value will be translated to "NONE".
   * @param {string} levelStr - The log level wanted as a string.
   * @param {Object|undefined} [options] - Potential options:
   *   - `shouldIncludeTimeStamp` (`boolean|undefined`): if `true`, a timestamp
   *     will be added before all logs, thus allowing to easily compare at which
   *     time various logs were outputed.
   *     Else, no timestamp will be added to logs.
   */
  public setLevel(levelStr : string, options? : {
    shouldIncludeTimeStamp : boolean | undefined;
  }| undefined) : void {
    const foundLevel = this._levels[levelStr as ILoggerLevel];
    this._currentLevel = typeof foundLevel === "number" ?
      levelStr as ILoggerLevel :
      "NONE";
    this._shouldIncludeTimeStamp = options?.shouldIncludeTimeStamp === true;
    this._resetLoggingFunctions();
  }

  /**
   * @returns {string}
   */
  public getLevel() : ILoggerLevel {
    return this._currentLevel;
  }

  /**
   * Returns `true` if the currently set level includes logs of the level given
   * in argument.
   * @param {string} logLevel
   * @returns {boolean}
   */
  public hasLevel(logLevel : ILoggerLevel) : boolean {
    return this._levels[logLevel] >= this._levels[this._currentLevel];
  }

  /**
   * Returns `true` if a timestamp is currently added to the outputed logs, or
   * false otherwise.
   */
  public isTimeStampIncluded() : boolean {
    return this._shouldIncludeTimeStamp;
  }

  private _resetLoggingFunctions() {
    const shouldIncludeTimeStamp = this._shouldIncludeTimeStamp;
    const level = this._levels[this._currentLevel];
    if (shouldIncludeTimeStamp) {
      /* eslint-disable no-console */
      this.error = (level >= this._levels.ERROR) ?
        (...args) => console.error(performance.now(), ...args) :
        noop;
      this.warn = (level >= this._levels.WARNING) ?
        (...args) => console.warn(performance.now(), ...args) :
        noop;
      this.info = (level >= this._levels.INFO) ?
        (...args) => console.info(performance.now(), ...args) :
        noop;
      this.debug = (level >= this._levels.DEBUG) ?
        (...args) => console.log(performance.now(), ...args) :
        noop;
      /* eslint-enable no-console */
    } else {
      /* eslint-disable no-invalid-this */
      /* eslint-disable no-console */
      this.error = (level >= this._levels.ERROR) ? console.error.bind(console) :
        noop;
      this.warn = (level >= this._levels.WARNING) ? console.warn.bind(console) :
        noop;
      this.info = (level >= this._levels.INFO) ? console.info.bind(console) :
        noop;
      this.debug = (level >= this._levels.DEBUG) ? console.log.bind(console) :
        noop;
      /* eslint-enable no-console */
      /* eslint-enable no-invalid-this */
    }
  }
}
