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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("Features list - LOCAL_MANIFEST", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should add LOCAL_MANIFEST in the current features", () => {
    const feat = {};
    jest.mock("../../../transports/local", () => ({ __esModule: true as const,
                                                    default: feat }));
    const addDASHFeature = require("../local").default;

    const featureObject : {
      transports : { [featureName : string] : unknown };
    } = { transports: {} };

    addDASHFeature(featureObject);

    expect(featureObject).toEqual({ transports: { local: {} } });
    expect(featureObject.transports.local).toBe(feat);
  });
});
