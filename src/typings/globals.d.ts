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

declare const __DEV__: boolean;
declare const __LOGGER_LEVEL__: string;
declare const __FEATURES__ : {
  METAPLAYLIST : boolean;
  SMOOTH : boolean;
  DASH : boolean;
  DIRECTFILE : boolean;
  HTML_SAMI : boolean;
  HTML_SRT : boolean;
  HTML_TTML : boolean;
  HTML_VTT : boolean;
  LOCAL_MANIFEST : boolean;
  NATIVE_SAMI : boolean;
  NATIVE_SRT : boolean;
  NATIVE_TTML : boolean;
  NATIVE_VTT : boolean;
  BIF_PARSER : boolean;
  EME : boolean;
};
declare const __RELATIVE_PATH__ : {
  EME_MANAGER: string;
  IMAGE_BUFFER: string;
  BIF_PARSER: string;
  SMOOTH: string;
  DASH: string;
  LOCAL_MANIFEST : string;
  METAPLAYLIST: string;
  NATIVE_TEXT_BUFFER: string;
  NATIVE_VTT: string;
  NATIVE_SRT: string;
  NATIVE_TTML: string;
  NATIVE_SAMI: string;
  HTML_TEXT_BUFFER: string;
  HTML_VTT: string;
  HTML_SRT: string;
  HTML_TTML: string;
  HTML_SAMI: string;
  DIRECTFILE: string;
};
