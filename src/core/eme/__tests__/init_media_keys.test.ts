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

import { of as observableOf } from "rxjs";
import { map } from "rxjs/operators";

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
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return observableOf(undefined);
    });
    jest.mock("../attach_media_keys", () => ({
      default: spyAttachMediaKeys,
    }));
    const initMediaKeys = require("../init_media_keys").default;
    expect.assertions(3);
    initMediaKeys().subscribe((result: { key : "test" }) => {
      expect(result).toEqual(falseMediaKeys);
      expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
      expect(spyAttachMediaKeys).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("Should throw if getMediaKeys throws", (done) => {
    const spyGetMediaKeysInfos = jest.fn(() => {
      return observableOf(undefined).pipe(
        map(() => {
          throw new Error();
        })
      );
    });
    jest.mock("../get_media_keys", () => ({
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return observableOf(undefined);
    });
    jest.mock("../attach_media_keys", () => ({
      default: spyAttachMediaKeys,
    }));
    const initMediaKeys = require("../init_media_keys").default;

    expect.assertions(2);
    initMediaKeys().toPromise()
      .then(() => {
        done();
      })
      .catch(() => {
        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyAttachMediaKeys).not.toHaveBeenCalled();
        done();
      });
  });

  it("Should throw if attachMediaKeys throws", (done) => {
    const spyGetMediaKeysInfos = jest.fn(() => {
      return observableOf(undefined);
    });
    jest.mock("../get_media_keys", () => ({
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return observableOf(undefined).pipe(
        map(() => {
          throw new Error();
        })
      );
    });
    jest.mock("../attach_media_keys", () => {
      return spyAttachMediaKeys();
    });
    const initMediaKeys = require("../init_media_keys").default;

    expect.assertions(2);
    initMediaKeys().toPromise()
      .then(() => {
        done();
      })
      .catch(() => {
        expect(spyAttachMediaKeys).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        done();
      });
  });
});
