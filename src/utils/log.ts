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

export default class Logger {
  public error: tConsoleFn = noop;
  public warn: tConsoleFn = noop;
  public info: tConsoleFn = noop;
  public debug: tConsoleFn = noop;
  private currentLevel : string;

  constructor() {
    this.currentLevel = Object.keys(LEVELS)[0];
  }

  public setLevel(levelStr : string) {
    let level;
    const foundLevel = LEVELS[levelStr];
    if (foundLevel) {
      level = foundLevel;
      this.currentLevel = levelStr;
    } else { // either 0 or not found
      level = 0;
      this.currentLevel = "NONE";
    }

    /* tslint:disable no-invalid-this */
    this.error = (level >= LEVELS.ERROR) ?
      console.error.bind(console) : noop;
    this.warn = (level >= LEVELS.WARNING) ?
      console.warn.bind(console) : noop;
    this.info = (level >= LEVELS.INFO) ?
      console.info.bind(console) : noop;
    this.debug = (level >= LEVELS.DEBUG) ?
      console.log.bind(console) : noop;
    /* tslint:enable no-invalid-this */
  }

  public getLevel() : string {
    return this.currentLevel;
  }
}
