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

import { IFeaturesObject } from "./types";

/**
 * Initial features object, with no feature activated by default.
 * @type {Object}
 */
const features : IFeaturesObject = { dashParsers: { wasm: null,
                                                    js: null },
                                     createDebugElement: null,
                                     directfile: null,
                                     decrypt: null,
                                     htmlTextTracksBuffer: null,
                                     htmlTextTracksParsers: {},
                                     imageBuffer: null,
                                     imageParser: null,
                                     mediaSourceInit: null,
                                     nativeTextTracksBuffer: null,
                                     nativeTextTracksParsers: {},
                                     transports: {} };

export default features;
