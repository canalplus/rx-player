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

import ttmlParser from "../../parsers/texttracks/ttml/html";
import HTMLTextDisplayer from "../../text_displayer/html";
import { IFeaturesObject } from "../types";

/**
 * Add ability to parse TTML text tracks in an HTML textrack mode.
 * @param {Object} features
 */
function addHTMLTTMLFeature(features : IFeaturesObject) : void {
  features.htmlTextTracksParsers.ttml = ttmlParser;
  features.htmlTextDisplayer = HTMLTextDisplayer;
}

export { addHTMLTTMLFeature as HTML_TTML_PARSER };
export default addHTMLTTMLFeature;
