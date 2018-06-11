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

import features from "./index";
import { IFeatureListItem } from "./types";

/**
 * @param {Array.<Object>} featureList
 */
export default function addFeatures(featureList : IFeatureListItem[]) : void {
  for (let i = 0; i < featureList.length; i++) {
    const feature = featureList[i] || {};
    switch (feature.id) {
      case "SMOOTH":
        features.transports.smooth = feature.content;
        break;
      case "DASH":
        features.transports.dash = feature.content;
        break;
      case "DIRECTFILE":
        features.directfile = feature.content;
        break;
      case "NATIVE_TEXT_BUFFER":
        features.nativeTextTracksBuffer = feature.content;
        break;
      case "HTML_TEXT_BUFFER":
        features.htmlTextTracksBuffer = feature.content;
        break;
      case "HTML_TTML":
        features.htmlTextTracksParsers.ttml = feature.content;
        break;
      case "HTML_SAMI":
        features.htmlTextTracksParsers.sami = feature.content;
        break;
      case "HTML_SRT":
        features.htmlTextTracksParsers.srt = feature.content;
        break;
      case "HTML_VTT":
        features.htmlTextTracksParsers.vtt = feature.content;
        break;
      case "NATIVE_TTML":
        features.nativeTextTracksParsers.ttml = feature.content;
        break;
      case "NATIVE_SAMI":
        features.nativeTextTracksParsers.sami = feature.content;
        break;
      case "NATIVE_SRT":
        features.nativeTextTracksParsers.srt = feature.content;
        break;
      case "NATIVE_VTT":
        features.nativeTextTracksParsers.vtt = feature.content;
        break;
      case "IMAGE_BUFFER":
        features.imageBuffer = feature.content;
        break;
      case "BIF_PARSER":
        features.imageParser = feature.content;
        break;
      case "EME":
        features.emeManager = feature.content;
        break;
      default:
        throw new Error("Unrecognized feature");
    }
  }
}
