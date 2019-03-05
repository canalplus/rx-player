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

import nativeTextTracksBuffer from "../../../core/source_buffers/text/native";
import addNativeTextBuffer from "../native_text_buffer";

jest.mock("../../../core/source_buffers/text/native", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Features list - native Text Buffer", () => {
  it("should add an native Text Buffer in the current features", () => {
    const featureObject : any = {};
    addNativeTextBuffer(featureObject);
    expect(featureObject).toEqual({ nativeTextTracksBuffer });
    expect(featureObject.nativeTextTracksBuffer).toBe(nativeTextTracksBuffer);
  });
});
