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
 * WITHOUT WARRANTIE OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

describe("Features - addFeatures", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should do nothing if an empty array is given", () => {
    const feat = {};
    jest.mock("../index", () => ({
      __esModule: true,
      default: feat,
    }));
    const addFeatures = require("../add_features").default;

    expect(() => addFeatures([])).not.toThrow();
  });

  it("should throw if something different than a function is given", () => {
    const feat = {};
    jest.mock("../index", () => ({
      __esModule: true,
      default: feat,
    }));
    const addFeatures = require("../add_features").default;

    expect(() => addFeatures([ 5 ])).toThrow(new Error("Unrecognized feature"));
    expect(() => addFeatures([ () => {/* noop */}, {} ]))
      .toThrow(new Error("Unrecognized feature"));
  });

  it("should call the given functions with the features object in argument", () => {
    const feat = { a: 412 };
    jest.mock("../index", () => ({
      __esModule: true,
      default: feat,
    }));
    const addFeatures = require("../add_features").default;

    const fakeFeat1 = jest.fn();
    const fakeFeat2 = jest.fn();
    addFeatures([fakeFeat1, fakeFeat2]);
    expect(fakeFeat1).toHaveBeenCalledTimes(1);
    expect(fakeFeat1).toHaveBeenCalledWith(feat);
    expect(fakeFeat2).toHaveBeenCalledTimes(1);
    expect(fakeFeat2).toHaveBeenCalledWith(feat);
  });
});
