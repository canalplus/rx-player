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
type IAcceptedLogValue = boolean | string | number | Error | null | undefined;
type IConsoleFn = (...args: IAcceptedLogValue[]) => void;
/**
 * Events sent by `Logger` where the keys are the events' name and the values
 * are the corresponding payloads.
 */
interface ILoggerEvents {
    onLogLevelChange: ILoggerLevel;
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
    private readonly _levels;
    constructor();
    /**
     * @param {string} levelStr
     * @param {function} [logFn]
     */
    setLevel(levelStr: string, logFn?: (levelStr: ILoggerLevel, logs: Array<boolean | string | number | Error | null | undefined>) => void): void;
    /**
     * @returns {string}
     */
    getLevel(): ILoggerLevel;
    /**
     * Returns `true` if the currently set level includes logs of the level given
     * in argument.
     * @param {string} logLevel
     * @returns {boolean}
     */
    hasLevel(logLevel: ILoggerLevel): boolean;
}
export {};
