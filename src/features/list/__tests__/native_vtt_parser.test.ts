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

import vttParser from "../../../parsers/texttracks/webvtt/native";
import addNativevttFeature from "../native_vtt_parser";

jest.mock("../../../parsers/texttracks/webvtt/native", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Features list - native vtt Parser", () => {
  it("should add an native vtt Parser in the current features", () => {
    const featureObject : any = { nativeTextTracksParsers: {} };
    addNativevttFeature(featureObject);
    expect(featureObject).toEqual({
      nativeTextTracksParsers: { vtt: vttParser },
    });
    expect(featureObject.nativeTextTracksParsers.vtt).toBe(vttParser);
  });
});
