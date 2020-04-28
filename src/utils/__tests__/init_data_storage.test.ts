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

/* tslint:disable no-unsafe-any */
describe("utils - InitDataStorage", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should correctly insert new elements", () => {
    const fakeHash = jest.fn((arr : Uint8Array) => arr.length);
    jest.mock("../hash_buffer", () =>  ({ __esModule: true,
                                          default: fakeHash }));
    const InitDataStorage = require("../init_data_storage").default;
    const initDataStorage = new InitDataStorage();

    expect(initDataStorage.isEmpty()).toBe(true);

    const initData1 = new Uint8Array([5, 6]);
    const initData2 = new Uint8Array([1, 2, 3]);
    const initData3 = new Uint8Array([1, 2, 4]);

    initDataStorage.set(initData1, "foo");
    expect(fakeHash).toHaveBeenCalledTimes(1);
    expect(fakeHash).toHaveBeenNthCalledWith(1, initData1);

    expect(initDataStorage.isEmpty()).toBe(false);
    expect(initDataStorage.keys).toEqual([initData1]);
    expect(initDataStorage.values).toEqual(["foo"]);

    expect(initDataStorage.getIndex(initData1)).toEqual(0);
    expect(initDataStorage.get(initData1)).toEqual("foo");
    expect(initDataStorage.getIndex(initData2)).toEqual(-1);
    expect(initDataStorage.get(initData2)).toEqual(undefined);
    expect(initDataStorage.getIndex(initData3)).toEqual(-1);
    expect(initDataStorage.get(initData3)).toEqual(undefined);

    initDataStorage.set(initData2, "bar");
    expect(initDataStorage.isEmpty()).toBe(false);
    expect(initDataStorage.keys).toEqual([initData1, initData2]);
    expect(initDataStorage.values).toEqual(["foo", "bar"]);

    expect(initDataStorage.getIndex(initData1)).toEqual(0);
    expect(initDataStorage.get(initData1)).toEqual("foo");
    expect(initDataStorage.getIndex(initData2)).toEqual(1);
    expect(initDataStorage.get(initData2)).toEqual("bar");
    expect(initDataStorage.getIndex(initData3)).toEqual(-1);
    expect(initDataStorage.get(initData3)).toEqual(undefined);

    initDataStorage.set(initData3, "foo"); // duplicated value on purpose
    expect(initDataStorage.isEmpty()).toBe(false);
    expect(initDataStorage.keys).toEqual([initData1,
                                          initData2,
                                          initData3]);
    expect(initDataStorage.values).toEqual(["foo", "bar", "foo"]);

    expect(initDataStorage.getIndex(initData1)).toEqual(0);
    expect(initDataStorage.get(initData1)).toEqual("foo");
    expect(initDataStorage.getIndex(initData2)).toEqual(1);
    expect(initDataStorage.get(initData2)).toEqual("bar");
    expect(initDataStorage.getIndex(initData3)).toEqual(2);
    expect(initDataStorage.get(initData3)).toEqual("foo");

    const createdInitData : Uint8Array[] = [];
    const createdValues : string[] = [];
    for (let i = 0; i < 100; i++) {
      const newInitData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, i]);
      initDataStorage.set(newInitData, "foo");
      createdInitData.push(newInitData);
      createdValues.push("foo");

      expect(initDataStorage.isEmpty()).toBe(false);
      expect(initDataStorage.keys).toEqual([initData1,
                                            initData2,
                                            initData3,
                                            ...createdInitData]);
      expect(initDataStorage.values).toEqual(["foo", "bar", "foo", ...createdValues]);

      expect(initDataStorage.getIndex(initData1)).toEqual(0);
      expect(initDataStorage.get(initData1)).toEqual("foo");
      expect(initDataStorage.getIndex(initData2)).toEqual(1);
      expect(initDataStorage.get(initData2)).toEqual("bar");
      expect(initDataStorage.getIndex(initData3)).toEqual(2);
      expect(initDataStorage.get(initData3)).toEqual("foo");

      for (let j = 0; j < createdInitData.length; j++) {
        expect(initDataStorage.getIndex(createdInitData[j])).toEqual(j + 3);
        expect(initDataStorage.get(createdInitData[j])).toEqual("foo");
      }
    }
  });

  it("should correctly handle collisions", () => {
    const fakeHash = jest.fn(() => 52);
    jest.mock("../hash_buffer", () =>  ({ __esModule: true,
                                          default: fakeHash }));
    const InitDataStorage = require("../init_data_storage").default;
    const initDataStorage = new InitDataStorage();

    const initData1 = new Uint8Array([1]);
    const initData2 = new Uint8Array([2]);
    const initData3 = new Uint8Array([3]);

    initDataStorage.set(initData1, "foo");
    initDataStorage.set(initData2, "bar");
    initDataStorage.set(initData3, "baz");
    expect(initDataStorage.keys).toEqual([initData1, initData2, initData3]);
    expect(initDataStorage.values).toEqual(["foo", "bar", "baz"]);
    expect(initDataStorage.getIndex(initData1)).toEqual(0);
    expect(initDataStorage.get(initData1)).toEqual("foo");
    expect(initDataStorage.getIndex(initData2)).toEqual(1);
    expect(initDataStorage.get(initData2)).toEqual("bar");
    expect(initDataStorage.getIndex(initData3)).toEqual(2);
    expect(initDataStorage.get(initData3)).toEqual("baz");

    const createdInitData : Uint8Array[] = [];
    const createdValues : number[] = [];
    for (let i = 0; i < 100; i++) {
      const newInitData = new Uint8Array([1, i]);
      initDataStorage.set(newInitData, i * 2);
      createdInitData.push(newInitData);
      createdValues.push(i * 2);
    }
    expect(initDataStorage.keys).toEqual([ initData1,
                                           initData2,
                                           initData3,
                                           ...createdInitData ]);
    expect(initDataStorage.values).toEqual([ "foo",
                                             "bar",
                                             "baz",
                                             ...createdValues ]);
    for (let i = 0; i < createdInitData.length; i++) {
      const initData = createdInitData[i];
      expect(initDataStorage.getIndex(initData)).toEqual(i + 3);
      expect(initDataStorage.get(initData)).toEqual(createdValues[i]);
    }
  });

  it("should update value when setting an already stored key", () => {
    const fakeHash = jest.fn((arr : Uint8Array) => arr.length);
    jest.mock("../hash_buffer", () =>  ({ __esModule: true,
                                          default: fakeHash }));
    const InitDataStorage = require("../init_data_storage").default;
    const initDataStorage = new InitDataStorage();

    const initData1 = new Uint8Array([1]);
    const initData2 = new Uint8Array([1, 2]);
    const initData3 = new Uint8Array([8]);
    initDataStorage.set(initData1, "a");
    initDataStorage.set(initData2, "foo");
    initDataStorage.set(initData1, "b");
    initDataStorage.set(initData3, "bar");
    initDataStorage.set(initData1, "c");

    expect(initDataStorage.keys).toEqual([initData1, initData2, initData3]);
    expect(initDataStorage.values).toEqual(["c", "foo", "bar"]);
    expect(initDataStorage.getIndex(initData1)).toEqual(0);
    expect(initDataStorage.get(initData1)).toEqual("c");
  });

  it("should only set new keys through `setIfNone`", () => {
    const fakeHash = jest.fn((arr : Uint8Array) => arr.length);
    jest.mock("../hash_buffer", () =>  ({ __esModule: true,
                                          default: fakeHash }));
    const InitDataStorage = require("../init_data_storage").default;
    const initDataStorage = new InitDataStorage();

    const initData1 = new Uint8Array([1]);
    const initData2 = new Uint8Array([1, 2]);
    const initData3 = new Uint8Array([8]);
    expect(initDataStorage.setIfNone(initData1, "a")).toEqual(true);
    expect(initDataStorage.setIfNone(initData2, "foo")).toEqual(true);
    expect(initDataStorage.setIfNone(initData1, "b")).toEqual(false);
    expect(initDataStorage.setIfNone(initData3, "bar")).toEqual(true);
    expect(initDataStorage.setIfNone(initData1, "c")).toEqual(false);

    expect(initDataStorage.keys).toEqual([initData1, initData2, initData3]);
    expect(initDataStorage.values).toEqual(["a", "foo", "bar"]);
    expect(initDataStorage.getIndex(initData1)).toEqual(0);
    expect(initDataStorage.get(initData1)).toEqual("a");
  });

  it("should allow removal of keys through the `remove` method", () => {
    const fakeHash = jest.fn((arr : Uint8Array) => arr.length);
    jest.mock("../hash_buffer", () =>  ({ __esModule: true,
                                          default: fakeHash }));
    const InitDataStorage = require("../init_data_storage").default;
    const initDataStorage = new InitDataStorage();

    const initData1 = new Uint8Array([1]);
    const initData2 = new Uint8Array([1, 2]);
    const initData3 = new Uint8Array([8]);
    expect(initDataStorage.remove(initData1)).toEqual(undefined);
    initDataStorage.set(initData1, "foo");
    initDataStorage.set(initData2, "bar");
    initDataStorage.set(initData3, "baz");

    expect(initDataStorage.remove(initData2)).toEqual("bar");
    expect(initDataStorage.keys).toEqual([initData1, initData3]);
    expect(initDataStorage.values).toEqual(["foo", "baz"]);

    expect(initDataStorage.remove(initData2)).toEqual(undefined);
    expect(initDataStorage.keys).toEqual([initData1, initData3]);
    expect(initDataStorage.values).toEqual(["foo", "baz"]);

    expect(initDataStorage.remove(initData1)).toEqual("foo");
    expect(initDataStorage.remove(initData3)).toEqual("baz");
    expect(initDataStorage.keys).toEqual([]);
    expect(initDataStorage.values).toEqual([]);
  });
});
/* tslint:enable no-unsafe-any */
