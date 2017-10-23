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

const Levels = {
  NONE: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
};

function log() {}
function noop() {}

let currentLevel = 0;

log.LEVELS = Object.keys(Levels);
log.error = noop;
log.warn = noop;
log.info = noop;
log.debug = noop;

log.setLevel = function(levelStr) {
  let level;
  const foundLevel = Levels[levelStr];
  if (foundLevel) {
    level = foundLevel;
    currentLevel = levelStr;
  } else { // either 0 or not found
    level = 0;
    currentLevel = "NONE";
  }

  log.error = (level >= Levels.ERROR) ?
    console.error.bind(console) : noop;
  log.warn = (level >= Levels.WARNING) ?
    console.warn.bind(console) : noop;
  log.info = (level >= Levels.INFO) ?
    console.info.bind(console) : noop;
  log.debug = (level >= Levels.DEBUG) ?
    console.log.bind(console) : noop;
};

log.getLevel = function() {
  return currentLevel;
};

export default log;
