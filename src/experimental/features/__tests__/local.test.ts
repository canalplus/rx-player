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

describe("Features list - LOCAL_MANIFEST", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should add LOCAL_MANIFEST in the current features", () => {
    const feat = {};
    jest.mock("../../../transports/local", () => ({ __esModule: true as const,
                                                    default: feat }));
    /* tslint:disable no-unsafe-any */
    const addDASHFeature = require("../local").default;
    /* tslint:enable no-unsafe-any */

    const featureObject : {
      transports : { [featureName : string] : unknown };
    } = { transports: {} };

    /* tslint:disable no-unsafe-any */
    addDASHFeature(featureObject);
    /* tslint:enable no-unsafe-any */

    expect(featureObject).toEqual({ transports: { local: {} } });
    expect(featureObject.transports.local).toBe(feat);
  });
});
