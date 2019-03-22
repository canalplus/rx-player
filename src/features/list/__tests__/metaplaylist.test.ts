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

describe("Features list - METAPLAYLIST", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should add METAPLAYLIST in the current features", () => {
    const metaplaylistFeat = { a: 1 };
    const overlayBufferFeat = { b: 2 };
    const overlayParserFeat = { c: 3 };
    jest.mock("../../../transports/metaplaylist", () => ({
      __esModule: true,
      default: metaplaylistFeat,
    }));
    jest.mock("../../../core/source_buffers/overlay", () => ({
      __esModule: true,
      default: overlayBufferFeat,
    }));
    jest.mock("../../../parsers/overlay/metaplaylist", () => ({
      __esModule: true,
      default: overlayParserFeat,
    }));
    const addDASHFeature = require("../metaplaylist").default;

    const featureObject : {
      transports : { [featureName : string] : unknown };
      overlayParsers: { [featureName : string] : unknown };
      overlayBuffer?: unknown;
    } = { transports: {}, overlayParsers: {} };
    addDASHFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { metaplaylist: { a: 1 } },
      overlayBuffer: { b: 2 },
      overlayParsers: {
        metaplaylist: { c: 3 },
      },
    });
    expect(featureObject.transports.metaplaylist).toBe(metaplaylistFeat);
    expect(featureObject.overlayBuffer).toBe(overlayBufferFeat);
    expect(featureObject.overlayParsers.metaplaylist).toBe(overlayParserFeat);
  });
});
