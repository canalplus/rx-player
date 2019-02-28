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

import {
  of as observableOf,
  throwError,
} from "rxjs";

describe("core - eme - initMediaKeys", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return mediaKeysInfos after media keys has been attached", (done) => {
    const falseMediaKeys = { key: "test" };
    const spyGetMediaKeysInfos = jest.fn(() => {
      return observableOf(falseMediaKeys);
    });
    jest.mock("../get_media_keys", () => ({
      __esModule: true,
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return observableOf(undefined);
    });
    jest.mock("../attach_media_keys", () => ({
      __esModule: true,
      default: spyAttachMediaKeys,
    }));
    const initMediaKeys = require("../init_media_keys").default;

    const mediaElement = document.createElement("video");
    const keySystemsConfigs = [{ l: 4 }, { d: 12 }];
    const currentMediaKeysInfos = { foo: "bar" };
    initMediaKeys(mediaElement, keySystemsConfigs, currentMediaKeysInfos)
      .subscribe((result : unknown) => {
        expect(result).toBe(falseMediaKeys);

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement, keySystemsConfigs, currentMediaKeysInfos);

        expect(spyAttachMediaKeys).toHaveBeenCalledTimes(1);
        expect(spyAttachMediaKeys)
          .toHaveBeenCalledWith(falseMediaKeys, mediaElement, currentMediaKeysInfos);

        done();
      });
  });

  it("Should throw if getMediaKeys throws", (done) => {
    const err = new Error("a");
    const spyGetMediaKeysInfos = jest.fn(() => throwError(err));
    jest.mock("../get_media_keys", () => ({
      __esModule: true,
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return observableOf(undefined);
    });
    jest.mock("../attach_media_keys", () => ({
      __esModule: true,
      default: spyAttachMediaKeys,
    }));
    const initMediaKeys = require("../init_media_keys").default;

    const mediaElement = document.createElement("video");
    const keySystemsConfigs = [{ l: 4 }, { d: 12 }];
    const currentMediaKeysInfos = { foo: "bar" };
    initMediaKeys(mediaElement, keySystemsConfigs, currentMediaKeysInfos)
      .subscribe(null, (e : Error) => {
        expect(e).toBe(err);

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement, keySystemsConfigs, currentMediaKeysInfos);

        expect(spyAttachMediaKeys).not.toHaveBeenCalled();
        done();
      });
  });

  it("Should throw if attachMediaKeys throws", (done) => {
    const falseMediaKeys = { key: "test" };
    const spyGetMediaKeysInfos = jest.fn(() => {
      return observableOf(falseMediaKeys);
    });
    jest.mock("../get_media_keys", () => ({
      __esModule: true,
      default: spyGetMediaKeysInfos,
    }));
    const err = new Error("a");
    const spyAttachMediaKeys = jest.fn(() => throwError(err));
    jest.mock("../attach_media_keys", () => {
      return {
        __esModule: true,
        default: spyAttachMediaKeys,
      };
    });
    const initMediaKeys = require("../init_media_keys").default;

    const mediaElement = document.createElement("video");
    const keySystemsConfigs = [{ l: 4 }, { d: 12 }];
    const currentMediaKeysInfos = { foo: "bar" };
    initMediaKeys(mediaElement, keySystemsConfigs, currentMediaKeysInfos)
      .subscribe(null, (e : Error) => {
        expect(e).toBe(err);

        expect(spyAttachMediaKeys).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement, keySystemsConfigs, currentMediaKeysInfos);

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyAttachMediaKeys)
          .toHaveBeenCalledWith(falseMediaKeys, mediaElement, currentMediaKeysInfos);

        done();
      });
  });
});
