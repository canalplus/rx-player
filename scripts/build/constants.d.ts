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

/* eslint-disable @typescript-eslint/naming-convention */

// Define build-time constants corresponding to the regular build.

declare const enum __LOGGER_LEVEL__ {
  CURRENT_LEVEL = "NONE",
}

declare const enum __ENVIRONMENT__ {
  PRODUCTION = 0,
  DEV = 1,
  CURRENT_ENV = PRODUCTION,
}

declare const __RX_PLAYER_DEBUG_MODE__ : boolean | undefined;
