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

import NativeTextDisplayer from "../../../main_thread/text_displayer/native";
import ttmlParser from "../../../parsers/texttracks/ttml/native";
import type { IFeaturesObject } from "../../types";
import addNativettmlFeature from "../native_ttml_parser";

describe("Features list - native ttml Parser", () => {
  it("should add an native ttml Parser in the current features", () => {
    const featureObject = { nativeTextTracksParsers: {} } as unknown as IFeaturesObject;
    addNativettmlFeature(featureObject);
    expect(featureObject).toEqual({
      nativeTextTracksParsers: { ttml: ttmlParser },
      nativeTextDisplayer: NativeTextDisplayer,
    });
    expect(featureObject.nativeTextTracksParsers.ttml).toBe(ttmlParser);
  });
});
