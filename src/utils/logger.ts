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

export type ILoggerLevel =
  "NONE" |
  "ERROR" |
  "WARNING" |
  "INFO" |
  "DEBUG";

type tConsoleFn = (...args : unknown[]) => void;

const DEFAULT_LOG_LEVEL : ILoggerLevel = "NONE";

/**
 * Logger implementation.
 * @class Logger
 */
export default class Logger {
  public error : tConsoleFn;
  public warn : tConsoleFn;
  public info : tConsoleFn;
  public debug : tConsoleFn;
  private currentLevel : ILoggerLevel;
  private readonly LEVELS : Record<ILoggerLevel, number>;

  constructor() {
    this.error = noop;
    this.warn = noop;
    this.info = noop;
    this.debug = noop;
    this.LEVELS = {
      NONE: 0,
      ERROR: 1,
      WARNING: 2,
      INFO: 3,
      DEBUG: 4,
    };
    this.currentLevel = DEFAULT_LOG_LEVEL;
  }

  /**
   * @param {string} levelStr
   */
  public setLevel(levelStr : string) {
    let level : number;
    const foundLevel = this.LEVELS[levelStr as ILoggerLevel];
    if (foundLevel) { // levelStr is a ILoggerLevel
      level = foundLevel;
      this.currentLevel = levelStr as ILoggerLevel;
    } else { // either 0 or not found
      level = 0;
      this.currentLevel = "NONE";
    }

    /* tslint:disable no-invalid-this */
    /* tslint:disable no-console */
    this.error = (level >= this.LEVELS.ERROR) ?
      console.error.bind(console) : noop;
    this.warn = (level >= this.LEVELS.WARNING) ?
      console.warn.bind(console) : noop;
    this.info = (level >= this.LEVELS.INFO) ?
      console.info.bind(console) : noop;
    this.debug = (level >= this.LEVELS.DEBUG) ?
      console.log.bind(console) : noop;
    /* tslint:enable no-console */
    /* tslint:enable no-invalid-this */
  }

  /**
   * @returns {string}
   */
  public getLevel() : ILoggerLevel {
    return this.currentLevel;
  }
}
