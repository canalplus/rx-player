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
  isObservable,
  of as observableOf,
  throwError,
} from "rxjs";
import { skip, take, tap } from "rxjs/operators";

/* tslint:disable no-unsafe-any */
describe("core - eme - initMediaKeys", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should emit `created-media-keys` event once MediaKeys has been created", done => {
    const falseMediaKeys = { key: "test" };
    const spyGetMediaKeysInfos = jest.fn(() => {
      return observableOf(falseMediaKeys);
    });
    jest.mock("../get_media_keys", () => ({
      __esModule: true as const,
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return observableOf(undefined);
    });
    const spyDisableOldMediaKeys = jest.fn(() => {
      return observableOf(undefined);
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
      .subscribe((result : any) => {
        expect(result.type).toEqual("created-media-keys");
        expect(result.value.mediaKeysInfos).toEqual(falseMediaKeys);
        expect(isObservable(result.value.attachMediaKeys$) &&
               typeof result.value.attachMediaKeys$.next === "function").toBeTruthy();

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement, keySystemsConfigs);

        expect(spyAttachMediaKeys).toHaveBeenCalledTimes(0);
        done();
      });
  });

  it("should return mediaKeysInfos after media keys has been attached", (done) => {
    const falseMediaKeys = { key: "test" };
    const spyGetMediaKeysInfos = jest.fn(() => {
      return observableOf(falseMediaKeys);
    });
    jest.mock("../get_media_keys", () => ({
      __esModule: true as const,
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return observableOf(undefined);
    });
    const spyDisableOldMediaKeys = jest.fn(() => {
      return observableOf(undefined);
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
        tap((evt: any) => {
          if (evt.type === "created-media-keys") {
            evt.value.attachMediaKeys$.next();
          }
        }),
        skip(1)
      )
      .subscribe((result : unknown) => {
        expect(result).toEqual({
          type: "attached-media-keys",
          value: falseMediaKeys,
        });

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement, keySystemsConfigs);

        expect(spyAttachMediaKeys).toHaveBeenCalledTimes(1);
        expect(spyAttachMediaKeys)
          .toHaveBeenCalledWith(falseMediaKeys, mediaElement);

        done();
      });
  });

  it("Should throw if getMediaKeys throws", (done) => {
    const err = new Error("a");
    const spyGetMediaKeysInfos = jest.fn(() => throwError(err));
    jest.mock("../get_media_keys", () => ({
      __esModule: true as const,
      default: spyGetMediaKeysInfos,
    }));
    const spyAttachMediaKeys = jest.fn(() => {
      return observableOf(undefined);
    });
    const spyDisableOldMediaKeys = jest.fn(() => {
      return observableOf(undefined);
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
          .toHaveBeenCalledWith(mediaElement, keySystemsConfigs);

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
      __esModule: true as const,
      default: spyGetMediaKeysInfos,
    }));
    const err = new Error("a");
    const spyAttachMediaKeys = jest.fn(() => throwError(err));
    const spyDisableOldMediaKeys = jest.fn(() => {
      return observableOf(undefined);
    });
    jest.mock("../attach_media_keys", () => ({
      __esModule: true as const,
      default: spyAttachMediaKeys,
      disableOldMediaKeys: spyDisableOldMediaKeys,
    }));
    const initMediaKeys = require("../init_media_keys").default;

    const mediaElement = document.createElement("video");
    const keySystemsConfigs = [{ l: 4 }, { d: 12 }];

    let eventReceived = false;
    initMediaKeys(mediaElement, keySystemsConfigs)
      .subscribe((evt : any) => {
        expect(evt.type).toEqual("created-media-keys");
        expect(evt.value.mediaKeysInfos).toEqual(falseMediaKeys);
        expect(isObservable(evt.value.attachMediaKeys$) &&
               typeof evt.value.attachMediaKeys$.next === "function").toBeTruthy();
        evt.value.attachMediaKeys$.next();
        eventReceived = true;
      }, (e : Error) => {
        expect(eventReceived).toEqual(true);
        expect(e).toBe(err);

        expect(spyAttachMediaKeys).toHaveBeenCalledTimes(1);
        expect(spyGetMediaKeysInfos)
          .toHaveBeenCalledWith(mediaElement, keySystemsConfigs);

        expect(spyGetMediaKeysInfos).toHaveBeenCalledTimes(1);
        expect(spyAttachMediaKeys)
          .toHaveBeenCalledWith(falseMediaKeys, mediaElement);

        done();
      });
 });
});
/* tslint:enable no-unsafe-any */
