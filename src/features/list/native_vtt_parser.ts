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

import NativeTextDisplayer from "../../main_thread/text_displayer/native/index.ts";
import {
  parseMp4EmbeddedWebVttToVTTCues,
  parseWebVTTPlainTextToVTTCues,
} from "../../parsers/texttracks/webvtt/native/index.ts";
import type { IFeaturesObject } from "../types.ts";

/**
 * Add ability to parse WebVTT text tracks in a native textrack mode.
 * @param {Object} features
 */
function addNativeVTTFeature(features: IFeaturesObject): void {
  features.nativeTextTracksParsers.vtt = parseWebVTTPlainTextToVTTCues;
  features.nativeTextTracksParsers.mp4vtt = parseMp4EmbeddedWebVttToVTTCues;
  features.nativeTextDisplayer = NativeTextDisplayer;
}

export { addNativeVTTFeature as NATIVE_VTT_PARSER };
export default addNativeVTTFeature;
