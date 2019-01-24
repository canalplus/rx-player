/**
 * Copyright 2017 CANAL+ Group
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

describe("MediaCapabilitiesProber - getProbedConfiguration", () => {
  it("should return result from filtered configuration", () => {
    const expectedResult = { key: "test" };
    const mockExtend = jest.fn(() => ({}));
    const mockFilterConfigurationWithCapabilities = jest.fn(() => expectedResult);
    jest.mock("../utils.ts", () => ({
      extend: mockExtend,
      filterConfigurationWithCapabilities: mockFilterConfigurationWithCapabilities,
    }));
    const getProbedConfiguration = require("../capabilities").default;
    expect(getProbedConfiguration({}, ["Athos", "Portos", "Aramis"]))
      .toEqual(expectedResult);
  });
});
