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

// Compile-time globals
// Should be all replaced once the lib built.

/* eslint-disable @typescript-eslint/naming-convention */

declare const __ENVIRONMENT__ : {
  CURRENT_ENV : 0 | 1;
  DEV : 0;
  PRODUCTION : 1;
} | typeof ENVIRONMENT_ENUM;

declare const enum ENVIRONMENT_ENUM {
  CURRENT_ENV,
  DEV,
  PRODUCTION,
}

declare const __LOGGER_LEVEL__ : {
  CURRENT_LEVEL : string;
};
