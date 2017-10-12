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

const LEVELS : { [level : string] : number } = {
  NONE: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
};

type tConsoleFn = (...args : any[]) => void;

let currentLevel : string = Object.keys(LEVELS)[0];

export interface ILogger {
  LEVELS : string[];
  error : tConsoleFn;
  warn : tConsoleFn;
  info : tConsoleFn;
  debug : tConsoleFn;
  setLevel(levelStr : string) : void;
  getLevel() : string;
}

const logger : ILogger = {
  LEVELS: Object.keys(LEVELS),
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,

  setLevel(levelStr : string) {
    let level;
    const foundLevel = LEVELS[levelStr];
    if (foundLevel) {
      level = foundLevel;
      currentLevel = levelStr;
    } else { // either 0 or not found
      level = 0;
      currentLevel = "NONE";
    }

    /* eslint-disable no-console */
    this.error = (level >= LEVELS.ERROR) ?
      console.error.bind(console) : noop;
    this.warn = (level >= LEVELS.WARNING) ?
      console.warn.bind(console) : noop;
    this.info = (level >= LEVELS.INFO) ?
      console.info.bind(console) : noop;
    this.debug = (level >= LEVELS.DEBUG) ?
      console.log.bind(console) : noop;
    /* eslint-enable no-console */
  },

  getLevel() : string {
    return currentLevel;
  },
};

export default logger;
