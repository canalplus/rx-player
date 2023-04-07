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

declare const __FEATURES__ : {
  IS_DISABLED : 0;
  IS_ENABLED : 1;

  BIF_PARSER : 0 | 1;
  DASH : 0 | 1;
  DIRECTFILE : 0 | 1;
  EME : 0 | 1;
  HTML_SAMI : 0 | 1;
  HTML_SRT : 0 | 1;
  HTML_TTML : 0 | 1;
  HTML_VTT : 0 | 1;
  LOCAL_MANIFEST : 0 | 1;
  METAPLAYLIST : 0 | 1;
  DEBUG_ELEMENT : 0 | 1;
  NATIVE_SAMI : 0 | 1;
  NATIVE_SRT : 0 | 1;
  NATIVE_TTML : 0 | 1;
  NATIVE_VTT : 0 | 1;
  SMOOTH : 0 | 1;
} | typeof FEATURES_ENUM;

declare const enum FEATURES_ENUM {
  IS_DISABLED,
  IS_ENABLED,

  BIF_PARSER,
  DASH,
  DIRECTFILE,
  EME,
  HTML_SAMI,
  HTML_SRT,
  HTML_TTML,
  HTML_VTT,
  LOCAL_MANIFEST,
  METAPLAYLIST,
  DEBUG_ELEMENT,
  NATIVE_SAMI,
  NATIVE_SRT,
  NATIVE_TTML,
  NATIVE_VTT,
  SMOOTH,
}

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

declare const __RX_PLAYER_DEBUG_MODE__ : boolean | undefined;
