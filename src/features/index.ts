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

/**
 * File allowing feature-switching.
 *
 * Every optional feature is included here.
 * They all should subsequently be accessed in the code through the exported
 * `features` object.
 *
 * The then exported features object will be used dynamically to know which
 * features are activated.
 *
 * This also lazy-feature loading, where this exported object can be updated
 * at runtime, to allow some new features even if the player instance has
 * already have been instanciated.
 */

import addFeatures from "./add_features";
import {
  IFeatureFunction,
  IFeaturesObject,
} from "./types";

/**
 * Initial features object, with no feature activated by default.
 * @type {Object}
 */
const features : IFeaturesObject = { transports: {},
                                     imageBuffer: null,
                                     imageParser: null,
                                     nativeTextTracksBuffer: null,
                                     nativeTextTracksParsers: {},
                                     htmlTextTracksBuffer: null,
                                     htmlTextTracksParsers: {},
                                     emeManager: null,
                                     directfile: null,
                                     overlayParsers: {},
                                     overlayBuffer: null, };

export default features;
export {
  addFeatures,
  IFeatureFunction,
};
