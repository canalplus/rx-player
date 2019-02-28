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

import directfile from "../../../core/init/initialize_directfile";
import addDirectfileFeature from "../directfile";

jest.mock("../../../core/init/initialize_directfile", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Features list - Directfile", () => {
  it("should add Directfile in the current features", () => {
    const featureObject : any = {};
    addDirectfileFeature(featureObject);
    expect(featureObject).toEqual({ directfile });
    expect(featureObject.directfile).toBe(directfile);
  });
});
