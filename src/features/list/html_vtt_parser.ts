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

import HTMLTextSegmentBuffer from "../../core/segment_buffers/implementations/text/html";
import vttParser from "../../parsers/texttracks/webvtt/html";
import { IFeaturesObject } from "../types";

/**
 * Add ability to parse WebVTT text tracks in an HTML textrack mode.
 * @param {Object} features
 */
function addHTMLVTTFeature(features : IFeaturesObject) : void {
  features.htmlTextTracksParsers.vtt = vttParser;
  features.htmlTextTracksBuffer = HTMLTextSegmentBuffer;
}

export { addHTMLVTTFeature as HTML_VTT_PARSER };
export default addHTMLVTTFeature;
