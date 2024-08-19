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

export type ILoggerLevel = "NONE" | "ERROR" | "WARNING" | "INFO" | "DEBUG";

export type ILogFormat = "standard" | "full";

type IAcceptedLogValue = boolean | string | number | Error | null | undefined;

type IConsoleFn = (...args: IAcceptedLogValue[]) => void;

const DEFAULT_LOG_LEVEL: ILoggerLevel = "NONE";

/**
 * Events sent by `Logger` where the keys are the events' name and the values
 * are the corresponding payloads.
 */
interface ILoggerEvents {
  onLogLevelChange: {
    level: ILoggerLevel;
    format: ILogFormat;
  };
}

/**
 * Logger implementation.
 * @class Logger
 */
export default class Logger extends EventEmitter<ILoggerEvents> {
  public error: IConsoleFn;
  public warn: IConsoleFn;
  public info: IConsoleFn;
  public debug: IConsoleFn;
  private _currentLevel: ILoggerLevel;
  private _currentFormat: ILogFormat;
  private readonly _levels: Record<ILoggerLevel, number>;

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
  public setLevel(
    levelStr: string,
    format: string,
    logFn?: (
      levelStr: ILoggerLevel,
      logs: Array<boolean | string | number | Error | null | undefined>,
    ) => void,
  ): void {
    let level: number;
    const foundLevel = this._levels[levelStr as ILoggerLevel];
    if (typeof foundLevel === "number") {
      level = foundLevel;
      this._currentLevel = levelStr as ILoggerLevel;
    } else {
      // not found
      level = 0;
      this._currentLevel = "NONE";
    }

    let actualFormat: ILogFormat;
    if (format === "standard" || format === "full") {
      actualFormat = format;
    } else {
      actualFormat = "standard";
    }
    if (actualFormat === "full" && actualFormat !== this._currentFormat) {
      // Add the current Date so we can see at which time logs are displayed
      const now = getMonotonicTimeStamp();
      // biome-ignore lint/nursery/noConsole:
      console.log(String(now.toFixed(2)), "[Init]", `Local-Date: ${Date.now()}`);
    }
    this._currentFormat = actualFormat;

    const generateLogFn =
      this._currentFormat === "full"
        ? (namespace: string, consoleFn: IConsoleFn): IConsoleFn => {
            return (...args: IAcceptedLogValue[]) => {
              const now = getMonotonicTimeStamp();
              return consoleFn(String(now.toFixed(2)), `[${namespace}]`, ...args);
            };
          }
        : (_namespace: string, consoleFn: IConsoleFn): IConsoleFn => consoleFn;

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
    } else {
      const produceLogFn = (logLevel: ILoggerLevel, namespace: string) => {
        return level >= this._levels[logLevel]
          ? (...args: IAcceptedLogValue[]) => {
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
  public getLevel(): ILoggerLevel {
    return this._currentLevel;
  }

  /**
   * Get the last set logger's log format.
   * @returns {string}
   */
  public getFormat(): ILogFormat {
    return this._currentFormat;
  }

  /**
   * Returns `true` if the currently set level includes logs of the level given
   * in argument.
   * @param {string} logLevel
   * @returns {boolean}
   */
  public hasLevel(logLevel: ILoggerLevel): boolean {
    return this._levels[logLevel] >= this._levels[this._currentLevel];
  }
}
