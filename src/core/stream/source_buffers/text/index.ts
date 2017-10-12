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

// Feature switching the HTML TextTrack implementation
const HAS_HTML_MODE =
  __FEATURES__.HTML_VTT ||
  __FEATURES__.HTML_SAMI ||
  __FEATURES__.HTML_TTML ||
  __FEATURES__.HTML_SRT;

const HAS_NATIVE_MODE =
  __FEATURES__.NATIVE_VTT ||
  __FEATURES__.NATIVE_SAMI ||
  __FEATURES__.NATIVE_TTML ||
  __FEATURES__.NATIVE_SRT;

const HTMLTextSourceBuffer = HAS_HTML_MODE ?
  require("./html/index.ts").default :
  () => {
    throw new Error("Cannot display HTML subtitles: feature not activated.");
  };

const NativeTextSourceBuffer = HAS_NATIVE_MODE ?
  require("./native/index.ts").default :
  () => {
    throw new Error("Cannot display native subtitles: feature not activated.");
  };

export {
  HTMLTextSourceBuffer,
  NativeTextSourceBuffer,
};
