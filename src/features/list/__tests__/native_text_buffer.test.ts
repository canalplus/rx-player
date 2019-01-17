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

describe("Features list - native Text Buffer", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should add an native Text Buffer in the current features", () => {
    const feat = {};
    jest.mock("../../../core/source_buffers/text/native", () => ({ default: feat }));
    const addNativeTextBuffer = require("../native_text_buffer").default;

    const featureObject : { [featureName : string] : unknown } = {};
    addNativeTextBuffer(featureObject);
    expect(featureObject).toEqual({ nativeTextTracksBuffer: {} });
    expect(featureObject.nativeTextTracksBuffer).toBe(feat);
  });
});
