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
/* eslint-disable no-restricted-properties */

import {
  skip,
  take,
  tap,
} from "rxjs";
import TaskCanceller from "../../../utils/task_canceller";

describe("core - eme - initMediaKeys", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should emit `created-media-keys` event once MediaKeys has been created", done => {
    const fakeResult = { mediaKeySystemAccess: { a: 5, keySystem: "toto" },
                         mediaKeys: { b: 4 },
                         stores: { loadedSessionsStore: { c: 3 },
                                   persistentSessionsStore: { d: 2 } },
                         options: { e: 1 } };
    const spyGetMediaKeysInfos = jest.fn(() => {
      return Promise.resolve(fakeResult);
    });
    jest.mock("../get_media_keys", () => ({
      __esModule: true as const,
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return Promise.resolve(undefined);
    });
    const spyDisableOldMediaKeys = jest.fn(() => {
      return Promise.resolve(undefined);
    });
    jest.mock("../attach_media_keys", () => ({
      __esModule: true as const,
      default: spyAttachMediaKeys,
      disableOldMediaKeys: spyDisableOldMediaKeys,
    }));
    const initMediaKeys = require("../init_media_keys").default;

    const mediaElement = document.createElement("video");
    const keySystemsConfigs = [{ l: 4 }, { d: 12 }];
    initMediaKeys(mediaElement, keySystemsConfigs)
      .pipe(take(1))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .subscribe((result : { type : string; value : any }) => {
        expect(result.type).toEqual("created-media-keys");
        expect(result.value.mediaKeys).toEqual(fakeResult.mediaKeys);
        expect(result.value.mediaKeySystemAccess)
          .toEqual(fakeResult.mediaKeySystemAccess);
        expect(result.value.stores).toEqual(fakeResult.stores);
        expect(result.value.options).toEqual(fakeResult.options);
        expect(typeof result.value.canAttachMediaKeys.setValue === "function")
          .toBeTruthy();

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement,
                                keySystemsConfigs,
                                new TaskCanceller().signal);

        expect(spyAttachMediaKeys).toHaveBeenCalledTimes(0);
        done();
      });
  });

  it("should return MediaKeys information after media keys has been attached", (done) => {
    const fakeResult = { mediaKeySystemAccess: { a: 5, keySystem: "toto" },
                         mediaKeys: { b: 4 },
                         stores: { loadedSessionsStore: { c: 3 },
                                   persistentSessionsStore: { d: 2 } },
                         options: { e: 1 } };
    const spyGetMediaKeysInfos = jest.fn(() => {
      return Promise.resolve(fakeResult);
    });
    jest.mock("../get_media_keys", () => ({
      __esModule: true as const,
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return Promise.resolve(undefined);
    });
    const spyDisableOldMediaKeys = jest.fn(() => {
      return Promise.resolve(undefined);
    });
    jest.mock("../attach_media_keys", () => ({
      __esModule: true as const,
      default: spyAttachMediaKeys,
      disableOldMediaKeys: spyDisableOldMediaKeys,
    }));
    const initMediaKeys = require("../init_media_keys").default;

    const mediaElement = document.createElement("video");
    const keySystemsConfigs = [{ l: 4 }, { d: 12 }];
    initMediaKeys(mediaElement, keySystemsConfigs)
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tap((evt: { type : string; value : any }) => {
          if (evt.type === "created-media-keys") {
            evt.value.canAttachMediaKeys.setValue(true);
          }
        }),
        skip(1)
      )
      .subscribe((result : unknown) => {
        expect(result).toEqual({
          type: "attached-media-keys",
          value: fakeResult,
        });

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement,
                                keySystemsConfigs,
                                new TaskCanceller().signal);

        expect(spyAttachMediaKeys).toHaveBeenCalledTimes(1);
        expect(spyAttachMediaKeys)
          .toHaveBeenCalledWith(
            mediaElement,
            { mediaKeySystemAccess: fakeResult.mediaKeySystemAccess,
              mediaKeys: fakeResult.mediaKeys,
              loadedSessionsStore: fakeResult.stores.loadedSessionsStore,
              keySystemOptions: fakeResult.options },
            new TaskCanceller().signal);
        done();
      });
  });

  it("Should throw if getMediaKeys throws", (done) => {
    const err = new Error("a");
    const spyGetMediaKeysInfos = jest.fn(() => Promise.reject(err));
    jest.mock("../get_media_keys", () => ({
      __esModule: true as const,
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return Promise.resolve(undefined);
    });
    const spyDisableOldMediaKeys = jest.fn(() => {
      return Promise.resolve(undefined);
    });
    jest.mock("../attach_media_keys", () => ({
      __esModule: true as const,
      default: spyAttachMediaKeys,
      disableOldMediaKeys: spyDisableOldMediaKeys,
    }));
    const initMediaKeys = require("../init_media_keys").default;

    const mediaElement = document.createElement("video");
    const keySystemsConfigs = [{ l: 4 }, { d: 12 }];
    initMediaKeys(mediaElement, keySystemsConfigs)
      .subscribe(null, (e : Error) => {
        expect(e).toBe(err);

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement,
                                keySystemsConfigs,
                                new TaskCanceller().signal);

        expect(spyAttachMediaKeys).not.toHaveBeenCalled();
        done();
      });
  });

});
