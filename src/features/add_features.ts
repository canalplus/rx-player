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
 * WITHOUT WARRANTIE OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import features from "./index";
import {
  FEATURE_IDS,
  IFeatureListItem,
} from "./types";

/**
 * @param {Array.<Object>} featureList
 */
export default function addFeatures(featureList : IFeatureListItem[]) : void {
  for (let i = 0; i < featureList.length; i++) {
    const feature = featureList[i] || {};
    switch (feature.id) {
      case FEATURE_IDS.SMOOTH:
        features.transports.smooth = feature.content;
        break;
      case FEATURE_IDS.DASH:
        features.transports.dash = feature.content;
        break;
      case FEATURE_IDS.DIRECTFILE:
        features.directfile = feature.content;
        break;
      case FEATURE_IDS.NATIVE_TEXT_BUFFER:
        features.nativeTextTracksBuffer = feature.content;
        break;
      case FEATURE_IDS.HTML_TEXT_BUFFER:
        features.htmlTextTracksBuffer = feature.content;
        break;
      case FEATURE_IDS.HTML_TTML:
        features.htmlTextTracksParsers.ttml = feature.content;
        break;
      case FEATURE_IDS.HTML_SAMI:
        features.htmlTextTracksParsers.sami = feature.content;
        break;
      case FEATURE_IDS.HTML_SRT:
        features.htmlTextTracksParsers.srt = feature.content;
        break;
      case FEATURE_IDS.HTML_VTT:
        features.htmlTextTracksParsers.vtt = feature.content;
        break;
      case FEATURE_IDS.NATIVE_TTML:
        features.nativeTextTracksParsers.ttml = feature.content;
        break;
      case FEATURE_IDS.NATIVE_SAMI:
        features.nativeTextTracksParsers.sami = feature.content;
        break;
      case FEATURE_IDS.NATIVE_SRT:
        features.nativeTextTracksParsers.srt = feature.content;
        break;
      case FEATURE_IDS.NATIVE_VTT:
        features.nativeTextTracksParsers.vtt = feature.content;
        break;
      case FEATURE_IDS.IMAGE_BUFFER:
        features.imageBuffer = feature.content;
        break;
      case FEATURE_IDS.BIF_PARSER:
        features.imageParser = feature.content;
        break;
      case FEATURE_IDS.EME:
        features.emeManager = feature.content;
        break;
      default:
        throw new Error("Unrecognized feature");
    }
  }
}
