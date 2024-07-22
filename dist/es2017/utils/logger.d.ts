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
export type ILoggerLevel = "NONE" | "ERROR" | "WARNING" | "INFO" | "DEBUG";
export type ILogFormat = "standard" | "full";
type IAcceptedLogValue = boolean | string | number | Error | null | undefined;
type IConsoleFn = (...args: IAcceptedLogValue[]) => void;
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
    error: IConsoleFn;
    warn: IConsoleFn;
    info: IConsoleFn;
    debug: IConsoleFn;
    private _currentLevel;
    private _currentFormat;
    private readonly _levels;
    constructor();
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
    setLevel(levelStr: string, format: string, logFn?: (levelStr: ILoggerLevel, logs: Array<boolean | string | number | Error | null | undefined>) => void): void;
    /**
     * Get the last set logger level, as an upper-case string value.
     * @returns {string}
     */
    getLevel(): ILoggerLevel;
    /**
     * Get the last set logger's log format.
     * @returns {string}
     */
    getFormat(): ILogFormat;
    /**
     * Returns `true` if the currently set level includes logs of the level given
     * in argument.
     * @param {string} logLevel
     * @returns {boolean}
     */
    hasLevel(logLevel: ILoggerLevel): boolean;
}
export {};
//# sourceMappingURL=logger.d.ts.map