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
  IS_ENABLED : number;
  IS_DISABLED : number;

  DASH : number;
  DIRECTFILE : number;
  EME : number;
  HTML_SAMI : number;
  HTML_SRT : number;
  HTML_TTML : number;
  HTML_VTT : number;
  LOCAL_MANIFEST : number;
  METAPLAYLIST : number;
  NATIVE_SAMI : number;
  NATIVE_SRT : number;
  NATIVE_TTML : number;
  NATIVE_VTT : number;
  SMOOTH : number;
} | typeof FEATURES_ENUM;

declare const enum FEATURES_ENUM {
  IS_DISABLED,
  IS_ENABLED,

  DASH,
  DIRECTFILE,
  EME,
  HTML_SAMI,
  HTML_SRT,
  HTML_TTML,
  HTML_VTT,
  LOCAL_MANIFEST,
  METAPLAYLIST,
  NATIVE_SAMI,
  NATIVE_SRT,
  NATIVE_TTML,
  NATIVE_VTT,
  SMOOTH,
}

declare const __ENVIRONMENT__ : {
  CURRENT_ENV : number;
  DEV : number;
  PRODUCTION : number;
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
