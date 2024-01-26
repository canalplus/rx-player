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

import HTMLTextDisplayer from "../../main_thread/text_displayer/html";
import srtParser from "../../parsers/texttracks/srt/html";
import type { IFeaturesObject } from "../types";

/**
 * Add ability to parse SRT text tracks in an HTML textrack mode.
 * @param {Object} features
 */
function addHTMLSRTFeature(features: IFeaturesObject): void {
  features.htmlTextTracksParsers.srt = srtParser;
  features.htmlTextDisplayer = HTMLTextDisplayer;
}

export { addHTMLSRTFeature as HTML_SRT_PARSER };
export default addHTMLSRTFeature;
