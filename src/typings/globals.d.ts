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

// Webpack-defined globals
// Should be all replaced once the lib built.

/* eslint-disable @typescript-eslint/naming-convention */

declare const __DEV__: boolean;
declare const __LOGGER_LEVEL__: string;
declare const __FEATURES__ : {
  DASH : boolean;
  DIRECTFILE : boolean;
  EME : boolean;
  HTML_SAMI : boolean;
  HTML_SRT : boolean;
  HTML_TTML : boolean;
  HTML_VTT : boolean;
  LOCAL_MANIFEST : boolean;
  METAPLAYLIST : boolean;
  NATIVE_SAMI : boolean;
  NATIVE_SRT : boolean;
  NATIVE_TTML : boolean;
  NATIVE_VTT : boolean;
  SMOOTH : boolean;
};
declare const __RELATIVE_PATH__ : {
  DASH: string;
  DASH_JS_PARSER: string;
  DIRECTFILE: string;
  EME_MANAGER: string;
  HTML_SAMI: string;
  HTML_SRT: string;
  HTML_TEXT_BUFFER: string;
  HTML_TTML: string;
  HTML_VTT: string;
  LOCAL_MANIFEST : string;
  MEDIA_ELEMENT_TRACK_CHOICE_MANAGER: string;
  METAPLAYLIST: string;
  NATIVE_SAMI: string;
  NATIVE_SRT: string;
  NATIVE_TEXT_BUFFER: string;
  NATIVE_TTML: string;
  NATIVE_VTT: string;
  SMOOTH: string;
};
